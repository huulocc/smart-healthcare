"""Run the evaluation set and report the baseline numbers.

    python rag/evaluate.py              # retrieval only - fast, no LLM
    python rag/evaluate.py --generate   # also generate answers and check them

Retrieval scoring is exact: a question passes if a chunk from any of its
`expect_sections` is in the top k. Answer scoring is only a HEURISTIC aid
(substring checks) - the criteria in the YAML are still graded by hand.
"""

import argparse
import collections
import datetime as dt
import json
import time

import yaml

import config
import llm
from generate import answer
from retrieve import retrieve

# Substring matching only. It is stem-blind ("rinse" does not match "rinsing")
# and phrasing-blind ("medical advice" does not match "consult your healthcare
# provider"), so a flag here means "look at this answer", never "this failed".
REFUSAL_MARKERS = [
    "do not contain", "does not contain", "not contain", "no information",
    "not available", "not in the document", "not in the available",
    "do not have", "don't have", "not mentioned", "not provided",
    "not included", "cannot find", "can't find", "not specify",
    "not provide",  # covers both "does not provide" and "do not provide"
    "not mention",  # likewise "does not mention" / "do not mention"
]


def load_eval():
    with open(config.EVAL_FILE, encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def contains_any(text, markers):
    lowered = text.lower()
    return [m for m in markers if m.lower() in lowered]


def evaluate_question(question, max_k, generate):
    hits = retrieve(question["question"], k=max_k)
    retrieved = [hit["section_id"] for hit in hits]
    expected = set(question.get("expect_sections") or [])

    record = {
        "id": question["id"],
        "group": question["group"],
        "optional": question["optional"],
        "answerable": question["answerable"],
        "question": question["question"],
        "expected": sorted(expected),
        "retrieved": retrieved,
        "scores": [round(hit["score"], 3) for hit in hits],
        "hit@1": bool(expected) and retrieved[0] in expected,
        "hit@3": bool(expected) and any(section in expected for section in retrieved[:3]),
    }

    if generate:
        text = answer(question["question"], hits[: config.TOP_K])
        record["answer"] = text
        record["missing_facts"] = [
            fact for fact in question.get("expect_facts") or []
            if fact.lower() not in text.lower()
        ]
        record["forbidden_present"] = contains_any(text, question.get("forbid") or [])
        if not question["answerable"]:
            record["refused"] = bool(contains_any(text, REFUSAL_MARKERS))

    return record


def summarise(records, label):
    scored = [r for r in records if r["expected"]]
    if not scored:
        return None
    recall1 = sum(r["hit@1"] for r in scored) / len(scored)
    recall3 = sum(r["hit@3"] for r in scored) / len(scored)
    print(f"{label:22s} n={len(scored):2d}   recall@1 {recall1:6.1%}   recall@3 {recall3:6.1%}")
    return {"n": len(scored), "recall@1": recall1, "recall@3": recall3}


def main():
    parser = argparse.ArgumentParser(description="Score the RAG baseline.")
    parser.add_argument("--generate", action="store_true", help="also run the LLM")
    parser.add_argument("-k", type=int, default=3, help="max k for recall@k")
    args = parser.parse_args()

    data = load_eval()
    questions = data["questions"]

    print(f"embedding : {llm.embed_model_name()} ({config.EMBED_BACKEND})")
    print(f"llm       : {llm.llm_model_name()} ({config.LLM_BACKEND}, "
          f"think={config.LLM_THINK}, temp={config.LLM_TEMPERATURE})")
    print(f"chunking  : heading-based, top_k={config.TOP_K}")
    print(f"questions : {len(questions)}  (generation: {'on' if args.generate else 'off'})\n")

    started = time.time()
    records = []
    for question in questions:
        record = evaluate_question(question, args.k, args.generate)
        records.append(record)
        mark = "." if record["hit@1"] else ("o" if record["hit@3"] else "X")
        if not record["expected"]:
            mark = "-"
        print(f"  {mark} {record['id']}", end="", flush=True)
    elapsed = time.time() - started
    print("\n")
    print("  legend: . hit@1   o hit@3 only   X miss   - not scored (refusal group)")
    print(f"  elapsed: {elapsed/60:.1f} min ({elapsed/len(questions):.1f}s per question)\n")

    headline = [r for r in records if not r["optional"]]
    optional = [r for r in records if r["optional"]]

    print("=" * 64)
    summary = {"headline": summarise(headline, "HEADLINE (30 q)")}
    for group in ["factual", "numeric", "paraphrase", "patient-voice", "synthesis", "safety"]:
        group_records = [r for r in headline if r["group"] == group]
        if group_records:
            summary[group] = summarise(group_records, f"  {group}")
    if optional:
        summary["crosslingual"] = summarise(optional, "OPTIONAL crosslingual")
    print("=" * 64)

    misses = [r for r in headline if r["expected"] and not r["hit@3"]]
    demoted = [r for r in headline if r["expected"] and r["hit@3"] and not r["hit@1"]]
    if demoted:
        print(f"\nright section, but not ranked first ({len(demoted)}):")
        for record in demoted:
            print(f"  {record['id']}  expected {record['expected']} -> got {record['retrieved']}")
    if misses:
        print(f"\nmissed entirely ({len(misses)}):")
        for record in misses:
            print(f"  {record['id']}  expected {record['expected']} -> got {record['retrieved']}")

    if args.generate:
        print("\n--- heuristic answer checks (still grade by hand) ---")
        fact_gaps = [r for r in records if r.get("missing_facts")]
        forbidden = [r for r in records if r.get("forbidden_present")]
        refusals = [r for r in records if r.get("refused") is False]
        print(f"  questions missing an expected fact : {len(fact_gaps)}")
        for record in fact_gaps:
            print(f"      {record['id']}  missing {record['missing_facts']}")
        print(f"  answers containing a forbidden string: {len(forbidden)}")
        for record in forbidden:
            print(f"      {record['id']}  found {record['forbidden_present']}")
        print(f"  refusal questions that did NOT refuse: {len(refusals)}")
        for record in refusals:
            print(f"      {record['id']}  {record['answer'][:110]}")
        summary["answer_checks"] = {
            "missing_facts": len(fact_gaps),
            "forbidden_present": len(forbidden),
            "failed_refusals": len(refusals),
        }

    config.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    mode = "full" if args.generate else "retrieval"
    path = config.RESULTS_DIR / f"{stamp}-{mode}.json"
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(
            {
                "timestamp": stamp,
                "elapsed_seconds": round(elapsed, 1),
                "config": {
                    "embedding_model": llm.embed_model_name(),
                    "embed_backend": config.EMBED_BACKEND,
                    "llm": llm.llm_model_name(),
                    "llm_backend": config.LLM_BACKEND,
                    "llm_think": config.LLM_THINK,
                    "temperature": config.LLM_TEMPERATURE,
                    "top_k": config.TOP_K,
                    "chunking": "heading-based",
                    "prompt_version": config.PROMPT_VERSION,
                },
                "summary": summary,
                "records": records,
            },
            handle,
            indent=2,
            ensure_ascii=False,
        )
    print(f"\nwritten: {path.relative_to(config.RAG_DIR.parent)}")


if __name__ == "__main__":
    main()
