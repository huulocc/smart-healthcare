"""Phase B, step 1 - embed the question and pull the nearest chunks."""

import functools
import sys

import chromadb

import config
from llm import embed, embed_model_name


@functools.lru_cache(maxsize=1)
def _collection():
    if not config.CHROMA_PATH.exists():
        sys.exit("No index found. Run `python rag/ingest.py` first.")
    client = chromadb.PersistentClient(path=str(config.CHROMA_PATH))
    collection = client.get_or_create_collection(
        config.COLLECTION, metadata={"hnsw:space": "cosine"}
    )
    _check_embed_model(collection)
    return collection


def _check_embed_model(collection):
    """Refuse to query an index built by a different embedding model.

    Vectors from two models share no geometry, so the search still returns
    three chunks and a plausible score - they are just the wrong chunks. This
    is the only failure in the pipeline with no symptom, so it is worth an
    explicit stop. Indexes built before this stamp existed carry no name and
    are trusted.
    """
    indexed = (collection.metadata or {}).get("embed_model")
    current = embed_model_name()
    if indexed and indexed != current:
        sys.exit(
            f"Index was built with '{indexed}' but you are querying with "
            f"'{current}'. Vectors from different models are not comparable.\n"
            f"Run `python rag/ingest.py` to rebuild, or set EMBED_BACKEND back."
        )


def retrieve(question, k=None):
    """Return the k nearest chunks, best first.

    Chroma reports cosine DISTANCE; similarity is 1 - distance, which is what
    gets reported everywhere else so the numbers read the intuitive way.
    """
    k = k or config.TOP_K
    vector = embed([question], is_query=True)[0]
    result = _collection().query(
        query_embeddings=[vector],
        n_results=k,
        include=["documents", "metadatas", "distances"],
    )

    hits = []
    for chunk_id, document, metadata, distance in zip(
        result["ids"][0],
        result["documents"][0],
        result["metadatas"][0],
        result["distances"][0],
    ):
        hits.append(
            {
                "chunk_id": chunk_id,
                "section_id": metadata["section_id"],
                "heading": metadata["heading"],
                "pages": f"{metadata['page_start']}-{metadata['page_end']}",
                "source": metadata["source_file"],
                "text": document,
                "score": 1.0 - distance,
            }
        )
    return hits
