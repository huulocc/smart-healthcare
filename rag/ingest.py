"""Phase A - indexing: PDFs -> clean -> chunk -> embed -> Chroma.

Every PDF in rag/data/raw/ is indexed. Each one is chunked with the first
strategy that works - hand-written headings, detected headings, or pages -
as described in config.py under "chunking".

Run from the repository root:  python rag/ingest.py        (add -v to list chunks)
"""

import argparse
import collections
import math
import re
import shutil
import sys

import chromadb
from pypdf import PdfReader

import config
from llm import embed, embed_dim, embed_model_name

NOISE = [re.compile(p) for p in config.NOISE_PATTERNS]

# "1 Introduction ........ 4". A table of contents names every section, so left
# in it would be a weak match for every question about the document.
TOC_LINE = re.compile(r"\.{4,}\s*\d+\s*$")

Line = collections.namedtuple("Line", "page text size bold")


# --- reading -------------------------------------------------------------


def read_lines(pdf_path):
    """Return (lines, reader), each line carrying its page, font size and weight.

    pypdf reports a font size before the text matrix scales it, so a 12pt font
    drawn at 1.5x arrives as 12 - the scale is applied here. `size` is the
    largest on the line; `bold` holds only when every run on it is bold.
    """
    reader = PdfReader(pdf_path)
    lines = []
    for page_number, page in enumerate(reader.pages, start=1):
        runs = []

        def visit(text, cm, tm, font, size):
            scale = abs(tm[3] * cm[3]) or abs(tm[0] * cm[0]) or 1.0
            name = str((font or {}).get("/BaseFont", ""))
            runs.append((text, round(size * scale, 1), "Bold" in name or "Black" in name))

        page.extract_text(visitor_text=visit)

        text, sizes, bolds = "", [], []
        for piece, size, bold in runs + [("\n", 0.0, False)]:
            for index, part in enumerate(piece.split("\n")):
                if index:  # a line break came before this part
                    if text.strip():
                        lines.append(Line(page_number, text.strip(), max(sizes), all(bolds)))
                    text, sizes, bolds = "", [], []
                text += part
                if part.strip():
                    sizes.append(size)
                    bolds.append(bold)
    return lines, reader


def _file_key(name):
    # Downloaded file names can carry a non-breaking space where a space is
    # shown (the rashes guideline does), so an exact match would miss it.
    return " ".join(name.split())


OVERRIDES = {_file_key(name): value for name, value in config.DOCUMENTS.items()}


def describe(pdf_path, reader):
    override = OVERRIDES.get(_file_key(pdf_path.name), {})
    raw = reader.metadata or {}
    title = override.get("title") or str(raw.get("/Title") or "").strip() or pdf_path.stem
    return {
        "doc_id": override.get("doc_id") or slugify(pdf_path.stem),
        "title": title,
        "publisher": str(raw.get("/Company") or "unknown"),
        "pages": len(reader.pages),
        "source_file": pdf_path.name,
        "headings": override.get("headings"),
    }


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


# --- cleaning ------------------------------------------------------------


def find_version(lines):
    for line in lines:
        match = re.match(config.VERSION_LINE, line.text)
        if match:
            return match.group(1).strip()
    return "unknown"


def body_size(lines):
    """The font size carrying the most characters - the document's body text."""
    weight = collections.Counter()
    for line in lines:
        weight[line.size] += len(line.text)
    return weight.most_common(1)[0][0]


def _normalise(text):
    # Page numbers inside a footer change on every page; the footer does not.
    return re.sub(r"\d+", "#", " ".join(text.lower().split()))


def repeated_lines(lines, pages):
    if pages < 3:
        return set()
    seen_on = collections.defaultdict(set)
    for line in lines:
        seen_on[_normalise(line.text)].add(line.page)
    floor = max(2, config.REPEATED_LINE_SHARE * pages)
    return {text for text, on in seen_on.items() if len(on) >= floor}


def clean(lines, pages):
    """Drop page furniture: noise patterns, running headers, TOC, cover art."""
    body = body_size(lines)
    repeated = repeated_lines(lines, pages)
    kept, dropped = [], 0
    for line in lines:
        if (
            any(pattern.match(line.text) for pattern in NOISE)
            or TOC_LINE.search(line.text)
            or line.size > body * config.DISPLAY_TEXT_RATIO
            or _normalise(line.text) in repeated
        ):
            dropped += 1
            continue
        kept.append(line)
    return kept, body, dropped


# --- strategy 1: hand-written headings -----------------------------------


def chunk_manual(lines, headings):
    """One chunk per hand-written heading. Unchanged from the single-document
    baseline, so the asthma chunks - and the eval scores recorded against
    them - stay byte-for-byte the same."""
    patterns = [(re.compile(p), section_id) for p, section_id in headings]
    sections, current = [], None
    for line in lines:
        if any(pattern.match(line.text) for pattern in NOISE):
            continue
        section_id = next((sid for pattern, sid in patterns if pattern.match(line.text)), None)
        if section_id:
            current = {
                "local_id": section_id,
                "heading": line.text,
                "body": [],
                "page_start": line.page,
                "page_end": line.page,
            }
            sections.append(current)
        elif current is not None:  # text before the first heading is dropped
            current["body"].append(line)
            current["page_end"] = line.page

    missing = [sid for _, sid in headings if sid not in {s["local_id"] for s in sections}]
    for section in sections:
        section["text"] = section["heading"] + "\n" + " ".join(l.text for l in section["body"])
    return sections, missing


# --- strategy 2: detected headings ---------------------------------------


def _styled(line, body, bold_only):
    if bold_only:
        return line.bold and line.size >= body - 0.5
    return line.size >= body + config.HEADING_SIZE_GAIN or (
        line.bold and line.size >= body + config.HEADING_BOLD_GAIN
    )


def detect_headings(lines, body, bold_only):
    """Mark each line as heading or body text.

    Font style finds the candidates; wording rules throw out the emphasised
    sentences that share the style. A heading wrapped onto two lines is one
    heading, so consecutive lines in the same style are joined first.
    """
    flags = [False] * len(lines)
    index = 0
    while index < len(lines):
        line = lines[index]
        if not _styled(line, body, bold_only):
            index += 1
            continue

        end = index + 1
        joined = line.text
        while (
            end < len(lines)
            and lines[end].page == line.page
            and (lines[end].size, lines[end].bold) == (line.size, line.bold)
            and len(joined) + len(lines[end].text) < config.HEADING_MAX_CHARS
        ):
            joined += " " + lines[end].text
            end += 1

        following = lines[end] if end < len(lines) else None
        continues = following is not None and following.text[:1].islower()
        # The line above ends mid-sentence, so this one finishes it. Found in
        # the migraine leaflet: "Go to the nearest Hospital" / "Emergency
        # (A&E)" in bold / "Department or phone 999". Taken as a heading, it
        # cut "phone 999" off the RED advice and pasted it onto AMBER.
        # Missing a heading only makes a chunk longer; inventing one can split
        # an instruction - so doubt resolves to "not a heading".
        #
        # Only at the same size as the line above: text set clearly larger is
        # a heading whatever precedes it, and must be, because pypdf's reading
        # order is scrambled on multi-column pages (the common cold leaflet)
        # and puts a half sentence before most of its real headings.
        previous = lines[index - 1] if index else None
        interrupts = (
            previous is not None
            and previous.page == line.page
            and abs(previous.size - line.size) < 0.5
            and not previous.text.endswith((".", "?", "!", ":"))
        )
        if (
            len(joined) <= config.HEADING_MAX_CHARS
            and len(joined.split()) <= config.HEADING_MAX_WORDS
            and (joined[0].isupper() or joined[0].isdigit())
            and joined[-1] not in ".,;"
            and not continues  # a sentence in bold, carrying on below
            and not interrupts
        ):
            for position in range(index, end):
                flags[position] = True
        index = end
    return flags


def headings_usable(lines, flags, pages):
    pages_with_heading = {line.page for line, flag in zip(lines, flags) if flag}
    needed = max(1, math.ceil(pages * config.MIN_HEADING_PAGE_SHARE))
    return sum(flags) >= 2 and len(pages_with_heading) >= needed


def sections_from_headings(lines, flags):
    sections, current = [], None
    for line, flag in zip(lines, flags):
        if flag and current is not None and not current["body"] and current["page_start"] == line.page:
            current["heading"] += " " + line.text  # the wrapped half of a heading
            continue
        if flag:
            current = {"heading": line.text, "body": [], "page_start": line.page, "page_end": line.page}
            sections.append(current)
            continue
        if current is None:
            # Text before the first heading is real content here (the leaflet
            # opens straight into symptoms), not a title block - keep it.
            current = {"heading": "Overview", "body": [], "page_start": line.page, "page_end": line.page}
            sections.append(current)
        current["body"].append(line)
        current["page_end"] = line.page
    return sections


# --- strategy 3: pages ---------------------------------------------------


def sections_from_pages(lines):
    sections = {}
    for line in lines:
        section = sections.setdefault(
            line.page,
            {"heading": None, "body": [], "page_start": line.page, "page_end": line.page},
        )
        section["body"].append(line)
    return list(sections.values())


# --- sizing --------------------------------------------------------------


def _body_chars(section):
    return sum(len(line.text) + 1 for line in section["body"])


def fold_small(sections):
    """Fold sections too short to stand alone into the one that follows.

    A heading with one sentence under it ("8.1 Diagnostic investigations" then
    straight into "8.1.1 Adults aged 65 and over") embeds as little more than
    its heading, and would win questions it cannot answer.
    """
    folded = []
    carry = None
    for section in sections:
        if carry is not None:
            # Join the headings only when they sit together on one page ("8.1
            # Diagnostic investigations / 8.1.1 Adults aged 65 and over"). A
            # cover-page label carried onto page 4 would otherwise name the
            # introduction.
            adjacent = carry["page_end"] == section["page_start"]
            section = {
                "heading": _join_headings(carry["heading"], section["heading"])
                if adjacent else section["heading"] or carry["heading"],
                "body": carry["body"] + section["body"],
                "page_start": carry["page_start"],
                "page_end": section["page_end"],
            }
            carry = None
        if _body_chars(section) < config.MIN_SECTION_CHARS:
            carry = section
        else:
            folded.append(section)
    if carry is not None:
        if folded:
            last = folded[-1]
            last["body"] += carry["body"]
            last["page_end"] = carry["page_end"]
        else:
            folded.append(carry)
    return folded


def _join_headings(first, second):
    if first is None or second is None:
        return first or second
    return f"{first} / {second}"


def split_long(section, header):
    """Cut a section into pieces under MAX_CHUNK_CHARS, on line boundaries.

    Each piece repeats the last ~CHUNK_OVERLAP_CHARS of the one before, so a
    list that straddles the cut is whole in at least one of them.
    """
    budget = config.MAX_CHUNK_CHARS - len(header) - 1
    parts, current, size = [], [], 0
    for line in section["body"]:
        cost = len(line.text) + 1
        if current and size + cost > budget:
            parts.append(current)
            tail, tail_size = [], 0
            for previous in reversed(current):
                if tail_size + len(previous.text) + 1 > config.CHUNK_OVERLAP_CHARS:
                    break
                tail.insert(0, previous)
                tail_size += len(previous.text) + 1
            current, size = tail, tail_size
        current.append(line)
        size += cost
    if current:
        parts.append(current)
    return parts


def chunk_detected(lines, doc, flags, strategy):
    if strategy == "headings":
        sections = sections_from_headings(lines, flags)
    elif strategy == "pages":
        sections = sections_from_pages(lines)
    else:  # "whole": short enough to be one chunk
        sections = [{"heading": None, "body": lines, "page_start": lines[0].page, "page_end": lines[-1].page}]
    sections = fold_small(sections)

    chunks, used = [], set()
    for section in sections:
        heading = section["heading"]
        if heading is None:
            first, last = section["page_start"], section["page_end"]
            heading = f"Page {first}" if first == last else f"Pages {first}-{last}"
        local_id = slugify(heading)[:48].strip("-") or "section"
        base, suffix = local_id, 2
        while local_id in used:
            local_id, suffix = f"{base}-{suffix}", suffix + 1
        used.add(local_id)

        # The title leads every chunk: "What are the symptoms?" means nothing
        # on its own once nine documents share an index.
        header = f"{doc['title']} - {heading}"
        parts = split_long(section, header)
        for number, part in enumerate(parts, start=1):
            chunks.append(
                {
                    "local_id": local_id,
                    "part": number if len(parts) > 1 else None,
                    "heading": heading,
                    "text": header + "\n" + "\n".join(line.text for line in part),
                    "page_start": part[0].page,
                    "page_end": part[-1].page,
                }
            )
    return chunks


# --- per document --------------------------------------------------------


def ingest_document(pdf_path):
    raw_lines, reader = read_lines(pdf_path)
    doc = describe(pdf_path, reader)
    doc["version"] = find_version(raw_lines)
    if not raw_lines:
        return doc, [], {"strategy": "empty", "dropped": 0, "missing": []}

    if doc["headings"]:
        chunks, missing = chunk_manual(raw_lines, doc["headings"])
        strategy, dropped = "manual", None
        for item in chunks:
            item["section_id"] = item["local_id"]
            item["chunk_id"] = f"{doc['doc_id']}::{item['local_id']}"
    else:
        lines, body, dropped = clean(raw_lines, doc["pages"])
        missing = []
        flags = []
        if sum(len(line.text) + 1 for line in lines) <= config.MAX_CHUNK_CHARS:
            strategy = "whole"
        else:
            strategy = "pages"
            for bold_only in (False, True):
                flags = detect_headings(lines, body, bold_only)
                if headings_usable(lines, flags, doc["pages"]):
                    strategy = "headings" if not bold_only else "headings(bold)"
                    break
        chunks = chunk_detected(lines, doc, flags, strategy.split("(")[0])
        for item in chunks:
            # The slash keeps these ids from ever equalling a hand-written one
            # ("triggers" vs "migraine/triggers"), so the eval cannot score a
            # migraine chunk as a hit on an asthma question.
            item["section_id"] = f"{doc['doc_id']}/{item['local_id']}"
            suffix = f"#{item['part']}" if item["part"] else ""
            item["chunk_id"] = f"{doc['doc_id']}::{item['local_id']}{suffix}"

    return doc, chunks, {"strategy": strategy, "dropped": dropped, "missing": missing}


def main():
    parser = argparse.ArgumentParser(description="Build the vector index from rag/data/raw.")
    parser.add_argument("-v", "--verbose", action="store_true", help="list every chunk")
    args = parser.parse_args()

    pdfs = sorted(config.DATA_RAW.glob("*.pdf"), key=lambda path: path.name.lower())
    if not pdfs:
        sys.exit(f"No PDFs found in {config.DATA_RAW}")
    for name in sorted(set(OVERRIDES) - {_file_key(path.name) for path in pdfs}):
        print(f"WARNING: config.DOCUMENTS names {name}, which is not in {config.DATA_RAW.name}/")

    all_chunks, seen_ids = [], {}
    print(f"{'document':24s} {'pages':>5s} {'strategy':15s} {'chunks':>6s} {'chars':>7s}  title")
    for pdf_path in pdfs:
        doc, chunks, report = ingest_document(pdf_path)
        if doc["doc_id"] in seen_ids:
            sys.exit(f"doc_id '{doc['doc_id']}' is used by both {seen_ids[doc['doc_id']]} and "
                     f"{pdf_path.name} - give one of them a doc_id in config.DOCUMENTS")
        seen_ids[doc["doc_id"]] = pdf_path.name

        chars = sum(len(item["text"]) for item in chunks)
        print(f"{doc['doc_id'][:24]:24s} {doc['pages']:5d} {report['strategy']:15s} "
              f"{len(chunks):6d} {chars:7d}  {doc['title'][:48]}")
        if report["missing"]:
            print(f"  WARNING: expected sections {report['missing']} were not found")
        if not chunks:
            print("  WARNING: no text extracted - a scanned PDF needs OCR first")
        if args.verbose:
            for item in chunks:
                pages = f"{item['page_start']}-{item['page_end']}"
                print(f"    {item['chunk_id'][:52]:52s} p.{pages:7s} {len(item['text']):5d}")

        for item in chunks:
            item["doc"] = doc
        all_chunks.extend(chunks)

    if not all_chunks:
        sys.exit("Nothing to index.")
    sizes = sorted(len(item["text"]) for item in all_chunks)
    print(f"\n{len(all_chunks)} chunks from {len(pdfs)} documents   "
          f"chars: median {sizes[len(sizes) // 2]}, max {sizes[-1]}")

    model = embed_model_name()
    print(f"\nembedding with {model} ({config.EMBED_BACKEND}) ...")
    vectors = []
    for start in range(0, len(all_chunks), config.EMBED_BATCH):
        batch = all_chunks[start : start + config.EMBED_BATCH]
        vectors.extend(embed([item["text"] for item in batch], is_query=False))
        print(f"  {len(vectors)}/{len(all_chunks)}", flush=True)
    if len(vectors[0]) != embed_dim():
        sys.exit(f"Unexpected embedding dimension {len(vectors[0])}, expected {embed_dim()}")

    # Rebuild from scratch: a half-updated index is the kind of silent drift
    # that makes a baseline number meaningless. Embedding runs first, so a
    # failed embed leaves the old index in place.
    if config.CHROMA_PATH.exists():
        shutil.rmtree(config.CHROMA_PATH)
    config.CHROMA_PATH.mkdir(parents=True, exist_ok=True)

    client = chromadb.PersistentClient(path=str(config.CHROMA_PATH))
    # `embed_model` is stamped on the collection so a query embedded by a
    # different model can be refused. Mixing two embedding models is the one
    # failure here that produces no error at all - just quietly worse answers.
    collection = client.get_or_create_collection(
        config.COLLECTION,
        metadata={"hnsw:space": "cosine", "embed_model": model},
    )
    collection.upsert(
        ids=[item["chunk_id"] for item in all_chunks],
        embeddings=vectors,
        documents=[item["text"] for item in all_chunks],
        metadatas=[
            {
                "doc_id": item["doc"]["doc_id"],
                "doc_title": item["doc"]["title"],
                "publisher": item["doc"]["publisher"],
                "doc_version": item["doc"]["version"],
                "source_file": item["doc"]["source_file"],
                "section_id": item["section_id"],
                "heading": item["heading"],
                "page_start": item["page_start"],
                "page_end": item["page_end"],
                "lang": "en",
                "n_chars": len(item["text"]),
            }
            for item in all_chunks
        ],
    )

    print(f"indexed {collection.count()} chunks into {config.CHROMA_PATH}")


if __name__ == "__main__":
    main()
