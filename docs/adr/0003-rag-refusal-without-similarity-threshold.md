# ADR-003: Enforce unsupported-question refusal in the prompt

- **Status:** Accepted
- **Date:** 2026-09-21
- **Scope:** Patient-leaflet RAG safety

## Context

The assistant must refuse questions the indexed patient leaflets cannot answer.
A common design rejects retrieval results below a cosine-similarity threshold.
On this corpus, that score does not separate answerable from unanswerable input:
unanswerable Q25 reached `0.607`, while the correct section for answerable Q14
scored only `0.584`.

## Decision

Do not use a minimum similarity cutoff (`MIN_SCORE = None`). Always supply the
top retrieved passages, instruct the model to answer only from those passages
and require a refusal when support is absent. Verify that behavior with the
evaluation set's `refusal` group and fail closed when structured output is
invalid.

## Alternatives considered

- **Fixed similarity threshold:** simple and deterministic, but the measured
  score overlap would admit at least one unsupported question while rejecting a
  supported one.
- **Always answer from top-k:** maximizes answer rate but encourages unsupported
  medical statements.
- **Train a separate answerability classifier:** potentially stronger, but adds
  a model, labeled data and another failure mode that this project has not yet
  evaluated.

## Consequences

- Refusal quality depends on prompt/model behavior and must be regression-tested.
- Retrieval scores remain diagnostic signals, not safety guarantees.
- A future threshold or classifier must beat the existing refusal cases before
  replacing this decision.

The measurements and result files are documented in
[`rag/README.md`](../../rag/README.md) and `rag/eval/results/`.

