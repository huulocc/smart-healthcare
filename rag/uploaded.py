"""Extract and retrieve from one user upload without persisting its contents."""

from io import BytesIO
from math import sqrt

from pypdf import PdfReader

from errors import ModelError
from guardrails import neutralize_document_instructions
from llm import embed

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_PAGES = 20
MAX_TEXT_CHARS = 24_000
CHUNK_CHARS = 1_200
CHUNK_OVERLAP = 150
UPLOAD_TOP_K = 3


class UploadError(ValueError):
    """An upload problem safe to display to the patient."""


def _safe_name(filename: str | None) -> str:
    name = (filename or "").replace("\\", "/").split("/")[-1]
    name = "".join(char for char in name if char.isprintable()).strip()[:100]
    if not name:
        raise UploadError("Choose a PDF or TXT file.")
    return name


def extract_upload(data: bytes, filename: str | None) -> list[dict]:
    """Return page text with metadata; reject unsupported or unextractable files."""
    name = _safe_name(filename)
    if not data:
        raise UploadError("The selected file is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise UploadError("The file must be 5 MB or smaller.")

    if name.lower().endswith(".pdf"):
        if not data.startswith(b"%PDF-"):
            raise UploadError("This file is not a valid PDF.")
        try:
            reader = PdfReader(BytesIO(data), strict=True)
            if reader.is_encrypted:
                raise UploadError("Password-protected PDFs are not supported.")
            if len(reader.pages) > MAX_PAGES:
                raise UploadError("The PDF must have 20 pages or fewer.")
            pages = [page.extract_text() or "" for page in reader.pages]
        except UploadError:
            raise
        except Exception as exc:
            raise UploadError("The PDF could not be read.") from exc
    elif name.lower().endswith(".txt"):
        try:
            text = data.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise UploadError("TXT files must use UTF-8 encoding.") from exc
        if "\x00" in text:
            raise UploadError("This file is not a plain-text document.")
        pages = [text]
    else:
        raise UploadError("Only PDF and TXT files are supported.")

    pages = [neutralize_document_instructions(page) for page in pages]
    total = sum(len(page) for page in pages)
    if total > MAX_TEXT_CHARS:
        raise UploadError("This document has too much text. Use a shorter file (up to 24,000 characters).")
    if not any(page.strip() for page in pages):
        raise UploadError("No selectable text was found. Scanned PDFs need OCR before upload.")
    return [{"page": index, "text": page.strip(), "filename": name}
            for index, page in enumerate(pages, start=1) if page.strip()]


def _chunks(pages: list[dict]) -> list[dict]:
    chunks = []
    for page in pages:
        text = " ".join(page["text"].split())
        start = 0
        number = 1
        while start < len(text):
            end = min(start + CHUNK_CHARS, len(text))
            if end < len(text):
                boundary = text.rfind(" ", start + CHUNK_CHARS // 2, end)
                if boundary > start:
                    end = boundary
            part = text[start:end].strip()
            if part:
                chunks.append({
                    "section_id": f"upload-p{page['page']}-c{number}",
                    "heading": f"Uploaded file · page {page['page']}",
                    "pages": str(page["page"]),
                    "source": page["filename"],
                    "text": part,
                })
                number += 1
            if end == len(text):
                break
            start = max(start + 1, end - CHUNK_OVERLAP)
    return chunks


def _cosine(left: list[float], right: list[float]) -> float:
    denominator = sqrt(sum(value * value for value in left) *
                       sum(value * value for value in right))
    return sum(a * b for a, b in zip(left, right)) / denominator if denominator else 0.0


def retrieve_upload(question: str, pages: list[dict]) -> list[dict]:
    """Use the configured embedding model to select relevant upload passages."""
    chunks = _chunks(pages)
    if not chunks:
        raise UploadError("No usable text was found in the file.")
    if question.strip().lower() == "summarize the uploaded document.":
        return [dict(chunk, score=1.0) for chunk in chunks]
    vectors = embed([chunk["text"] for chunk in chunks], is_query=False)
    if len(vectors) != len(chunks):
        raise ModelError("The embedding service returned an incomplete document index.")
    query = embed([question], is_query=True)[0]
    ranked = sorted(
        (dict(chunk, score=_cosine(query, vector)) for chunk, vector in zip(chunks, vectors)),
        key=lambda chunk: chunk["score"], reverse=True,
    )
    return ranked[:UPLOAD_TOP_K]
