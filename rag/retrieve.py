"""Phase B, step 1 - embed the question and pull the nearest chunks."""

import functools
import sys

import chromadb

import config
from ollama_api import embed


@functools.lru_cache(maxsize=1)
def _collection():
    if not config.CHROMA_PATH.exists():
        sys.exit("No index found. Run `python rag/ingest.py` first.")
    client = chromadb.PersistentClient(path=str(config.CHROMA_PATH))
    return client.get_or_create_collection(
        config.COLLECTION, metadata={"hnsw:space": "cosine"}
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
