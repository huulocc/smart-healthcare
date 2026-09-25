"""Phase A - indexing: PDF -> clean -> chunk by heading -> embed -> Chroma.

Run from the repository root:  python rag/ingest.py
"""

import re
import shutil
import sys

import chromadb
from pypdf import PdfReader

import config
from llm import embed, embed_dim, embed_model_name

NOISE = [re.compile(p) for p in config.NOISE_PATTERNS]
HEADINGS = [(re.compile(p), section_id) for p, section_id in config.SECTION_HEADINGS]


def read_pages(pdf_path):
    """Return (lines, doc_meta) where each line carries the page it came from."""
    reader = PdfReader(pdf_path)
    raw = reader.metadata or {}
    doc_meta = {
        "doc_title": str(raw.get("/Title", pdf_path.stem)),
        "publisher": str(raw.get("/Company", "unknown")),
        "pages": len(reader.pages),
    }

    lines = []
    for page_number, page in enumerate(reader.pages, start=1):
        for line in (page.extract_text() or "").splitlines():
            lines.append((page_number, line.strip()))
    return lines, doc_meta


def clean(lines):
    """Drop repeated page furniture, capturing the version date on the way out."""
    version = "unknown"
    kept, dropped = [], 0
    for page_number, text in lines:
        if not text:
            continue
        match = re.match(config.VERSION_LINE, text)
        if match and version == "unknown":
            version = match.group(1).strip()
        if any(pattern.match(text) for pattern in NOISE):
            dropped += 1
            continue
        kept.append((page_number, text))
    return kept, version, dropped


def match_heading(text):
    for pattern, section_id in HEADINGS:
        if pattern.match(text):
            return section_id
    return None


def chunk(lines):
    """Split into one chunk per heading. Text before the first heading is preamble."""
    chunks, preamble = [], []
    current = None

    for page_number, text in lines:
        section_id = match_heading(text)
        if section_id:
            current = {
                "section_id": section_id,
                "heading": text,
                "body": [],
                "page_start": page_number,
                "page_end": page_number,
            }
            chunks.append(current)
            continue
        if current is None:
            preamble.append(text)
        else:
            current["body"].append(text)
            current["page_end"] = page_number

    for item in chunks:
        item["text"] = item["heading"] + "\n" + " ".join(item["body"])
    return chunks, preamble


def main():
    if not config.SOURCE_PDF.exists():
        sys.exit(f"Source PDF not found: {config.SOURCE_PDF}")

    lines, doc_meta = read_pages(config.SOURCE_PDF)
    lines, version, dropped = clean(lines)
    chunks, preamble = chunk(lines)

    print(f"document : {doc_meta['doc_title']}")
    print(f"publisher: {doc_meta['publisher']}")
    print(f"version  : {version}")
    print(f"pages    : {doc_meta['pages']}   noise lines dropped: {dropped}")
    if preamble:
        print(f"preamble discarded ({len(preamble)} lines): {' / '.join(preamble)[:120]}")

    expected = {section_id for _, section_id in config.SECTION_HEADINGS}
    found = {item["section_id"] for item in chunks}
    if expected != found:
        print(f"\nWARNING: expected sections {sorted(expected - found)} were not found")

    print(f"\n{len(chunks)} chunks:")
    print(f"  {'section':24s} {'pages':8s} {'chars':>6s}  heading")
    for item in chunks:
        pages = f"{item['page_start']}-{item['page_end']}"
        print(f"  {item['section_id']:24s} {pages:8s} {len(item['text']):6d}  {item['heading'][:44]}")

    model = embed_model_name()
    print(f"\nembedding {len(chunks)} chunks with {model} ({config.EMBED_BACKEND}) ...")
    vectors = embed([item["text"] for item in chunks], is_query=False)
    if len(vectors[0]) != embed_dim():
        sys.exit(f"Unexpected embedding dimension {len(vectors[0])}, expected {embed_dim()}")

    # Rebuild from scratch: a half-updated index is the kind of silent drift
    # that makes a baseline number meaningless.
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
        ids=[f"{config.DOC_ID}::{item['section_id']}" for item in chunks],
        embeddings=vectors,
        documents=[item["text"] for item in chunks],
        metadatas=[
            {
                "doc_id": config.DOC_ID,
                "doc_title": doc_meta["doc_title"],
                "publisher": doc_meta["publisher"],
                "doc_version": version,
                "source_file": config.SOURCE_PDF.name,
                "section_id": item["section_id"],
                "heading": item["heading"],
                "page_start": item["page_start"],
                "page_end": item["page_end"],
                "lang": "en",
                "n_chars": len(item["text"]),
            }
            for item in chunks
        ],
    )

    print(f"indexed {collection.count()} chunks into {config.CHROMA_PATH}")


if __name__ == "__main__":
    main()
