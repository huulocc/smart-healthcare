# ADR-0003 — No similarity threshold for refusal

**Date:** 2026-09-21 · **Commit:** `c010831` *(add the RAG evaluation set and
the first corpus document)* · **Scope:** AI design

## Status

Accepted, still in force. The extra blocking layer in `rag/guardrails.py`
(PR #15, 2026-10-26) does **not** replace this decision — it rejects
out-of-scope questions *before* the model is called, while "the documents do
not answer this" is still handled by the system prompt.

## Context

The assistant has to say so honestly when the documents do not contain the
answer. This is required by section 4.1 A of the brief — *"The bot must say it
doesn't know when the answer is not in the app data"* — and for a healthcare
application it matters more than it would for an exercise, because an invented
sentence about a dose is not a harmless bug.

The obvious approach is a threshold: embed the question, take the nearest
chunk, and if the similarity score falls below some level, answer "I don't
know". It appears in almost every RAG tutorial, it is easy to understand, and
it is checked with a single numeric comparison.

## Alternatives considered

**1. A similarity-score threshold.** Below the line, refuse without calling the
model. Cheap, deterministic, explainable as a number.

**2. Enforce refusal through the system prompt.** Always take top-k and always
call the model, but instruct it to answer only from the DOCUMENTS section and
to say plainly when the answer is not there.

**3. A second model call that grades itself.** Ask the model "do these passages
answer that question" before generating an answer.

## Decision

Option 2. There is no threshold anywhere in the code.

The reason is a measurement, not a preference. On the evaluation set:

| Question | Kind | Score of the deciding chunk |
|---|---|---|
| Q25 | **not** answerable from the documents | **0.607** — its highest-scoring chunk |
| Q14 | answerable, correct section is `well-controlled` | **0.584** — the **correct** chunk, ranked second |

These two numbers are not the same kind of number, and that is the whole point.
For Q14 the highest-scoring chunk is `treatment` at 0.614 — **the wrong
section**; the correct chunk only reaches 0.584. So a threshold has to accept
0.584 in order not to lose Q14, and accepting 0.584 lets Q25 (0.607) through
with it.

The cause: a cosine score measures **topical similarity**, not **whether the
answer is contained**. A question about an asthma medicine that is not in the
documents still looks very much like the passage about asthma medicines.

Option 3 was rejected on cost: every question would need an extra model call,
and with `qwen3` running locally one call is already around 50 seconds.
Doubling the latency to do what the prompt already does is a bad trade.

## Consequences

**Gained:**

- There is no constant to retune every time the embedding model or the document
  set changes. A threshold tuned for 9 chunks would be wrong at 33.
- Refusal is based on the **content** of the passages rather than on a single
  number standing in for that content.

**Paid for:**

- Refusal becomes model behaviour, which means it is not deterministic. This is
  why the evaluation set has a whole `refusal` group: without measuring it,
  nobody would know whether it still works.
- Every question costs a model call, including the ones certain to be refused.
  The later `guardrails.py` layer recovers *part* of that cost, but only for
  clearly out-of-scope questions, not for a legitimate question the documents
  happen not to answer.
- Changing the prompt changes safety behaviour. That is why the prompts are
  versioned under `rag/prompts/` instead of being written inline in the code.

## Where this is checked

- The refusal rule: `rag/prompts/leaflet_system_v2.txt` — *"If the documents do
  not contain the answer, say plainly that the information is not in the
  available documents."*
- That there is no threshold: read `rag/retrieve.py`, function `retrieve()`,
  which returns top-k directly and never compares `score` against anything.
- Measured continuously: the `refusal` group in `rag/eval/eval_questions.yaml`,
  and cases L06 and L07 in `rag/eval/chatbot_cases.json`
  (`expect: {"refusal": true}`).
- The numbers 0.607 and 0.584 come from
  `rag/eval/results/20260921-211903-retrieval.json`, records `Q14` and `Q25`
  (9-chunk corpus, `nomic-embed-text`, `top_k=3`).
- A note when cross-checking: commit `0028bfc` records a different pair
  (0.596 / 0.606) for the same argument, from an earlier measurement that is no
  longer in `results/`. The usable pair is the one above, because it can be
  traced to individual records. On the 33-chunk corpus (`20260929-144325`),
  `well-controlled` is **no longer retrieved at all**, which only strengthens
  the argument.
