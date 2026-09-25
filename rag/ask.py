"""Ask one question and show the whole chain.

    python rag/ask.py "How many puffs can I take during an attack?"
    python rag/ask.py --no-llm "..."     # retrieval only

Printing the retrieved chunks and their scores is the point: when an answer is
wrong, the first thing to check is whether the right chunk was even retrieved.
"""

import argparse

import config
import llm
from generate import answer
from retrieve import retrieve


def main():
    parser = argparse.ArgumentParser(description="Query the RAG baseline.")
    parser.add_argument("question", help="the question to ask")
    parser.add_argument("-k", type=int, default=config.TOP_K, help="chunks to retrieve")
    parser.add_argument("--no-llm", action="store_true", help="skip generation")
    args = parser.parse_args()

    hits = retrieve(args.question, k=args.k)

    print(f"\nQ: {args.question}\n")
    print(f"retrieved {len(hits)} chunks:")
    for index, hit in enumerate(hits, start=1):
        print(f"  [{index}] {hit['score']:.3f}  {hit['section_id']:24s} p.{hit['pages']}")
    if len(hits) > 1:
        print(f"  gap between 1st and 2nd: {hits[0]['score'] - hits[1]['score']:+.3f}")

    if args.no_llm:
        return

    print(f"\ngenerating with {llm.llm_model_name()} ({config.LLM_BACKEND}) ...\n")
    print(answer(args.question, hits))
    print()


if __name__ == "__main__":
    main()
