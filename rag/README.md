# RAG baseline

A minimal, fully local retrieval-augmented generation pipeline over patient
information leaflets. Its job is **not** to be good. Its job is to run end to
end and produce a number that every later change has to beat.

## Run it

```bash
pip install -r rag/requirements.txt
ollama pull nomic-embed-text
ollama pull qwen3

python rag/ingest.py                      # build the index
python rag/ask.py "How many puffs can I take during an attack?"
python rag/evaluate.py                    # retrieval only, ~30s
python rag/evaluate.py --generate         # with answers, ~4 min
```

Run from the repository root. Results are written to `rag/eval/results/`.

## Pipeline

```
ingest.py    PDF -> strip page furniture -> chunk by heading -> embed -> Chroma
retrieve.py  question -> embed -> top-k by cosine
generate.py  top-k + question -> prompt -> qwen3 -> answer + section cited
evaluate.py  34 questions -> recall@1 / recall@3 + heuristic answer checks
```

Everything tunable lives in `config.py`. A result is only meaningful alongside
the config that produced it, so record both together.

## Stack

| Step | Choice |
|---|---|
| Loader | `pypdf` |
| Chunking | heading-based, 9 sections |
| Embedding | `nomic-embed-text` via Ollama, 768-dim, cosine |
| Vector store | ChromaDB, persistent |
| Generation | `qwen3` via Ollama, `temperature=0` |
| Retrieval | top-k = 3 |

> The baseline numbers below were produced with `prompt=v1-baseline,
> think=false`. `config.py` has since moved on - see **Hillclimb log**. Every
> file in `eval/results/` records the config that produced it, so that file is
> the authority, not this README.

No LangChain or LlamaIndex. At this size a framework would hide the exact
behaviour we are trying to measure.

## Corpus

One document: *Asthma: What you need to know*, University Hospitals Plymouth
NHS Trust, version June 2026. 4 pages, ~6,400 characters, ~1,600 tokens,
9 chunks (151-1,533 chars). The `treatment` section spans a page break, which
is why chunking by page would be wrong here.

## Baseline result - 2026-09-21

Retrieval, 26 scorable questions (the 4 refusal questions have no correct
section by design):

| Group | n | recall@1 | recall@3 |
|---|---|---|---|
| **Headline** | **26** | **76.9%** | **100.0%** |
| factual | 8 | 100.0% | 100.0% |
| numeric | 5 | 100.0% | 100.0% |
| paraphrase | 4 | 25.0% | 100.0% |
| patient-voice | 4 | 50.0% | 100.0% |
| synthesis | 3 | 66.7% | 100.0% |
| safety | 2 | 100.0% | 100.0% |
| *optional crosslingual* | *4* | *0.0%* | *25.0%* |

**recall@3 = 100% is not a result.** With 9 chunks, k=3 retrieves a third of
the entire corpus. Treat recall@1 (76.9%) as the baseline figure and ignore
recall@3 until the corpus is larger.

The split across groups is the useful part: questions that share vocabulary
with the source (factual, numeric) are solved completely, while rephrased
questions (paraphrase 25%, patient-voice 50%) are where the embedding model
actually struggles. Those groups are the ones to watch when tuning.

Answers, hand-graded: **27 / 30 acceptable**. The automated checker flagged 11,
but 8 were artifacts of substring matching - it is stem-blind (`rinse` vs
`rinsing`, `hormones` vs `hormonal`) and phrasing-blind (`medical advice` vs
`consult your healthcare provider`). Refusals: **4 / 4 correct**. Forbidden
strings (invented doses, prices, higher puff counts): **0**.

### The three real failures

1. **Q23 - incomplete safety instructions.** Asked to list every step of
   responding to an attack in order, the answer stopped after step 2, dropping
   "call for an ambulance" and "repeat after 15 minutes". Retrieval was correct
   (rank 1). The revealing part: **Q29** asks the same thing phrased as "I'm
   having an attack right now" and gets the complete four-step answer from the
   same chunk. So this is prompt sensitivity, not a retrieval or context
   problem - the system prompt does not enforce completeness for list-shaped
   questions. Highest-priority fix.
2. **Q17 - over-refusal.** "I feel fine, can I stop my steroid inhaler?" is
   answered by the document (preventer inhalers must be taken every day even
   when symptom free; take medication as prescribed even if you feel well). The
   model refused instead. Safer than inventing an answer, but it withheld
   safety-relevant guidance that was sitting in the retrieved context.
3. **Q07 - dropped the URL.** Asked where to find more information, the answer
   named the organisation but omitted `asthma.org.uk`, the actionable part.

## Hillclimb log

One change at a time, re-scored against the same 34 questions. Result files:

| Run | Config | recall@1 | Answers OK (hand) | Wall clock |
|---|---|---|---|---|
| `20260921-213530-full` | v1-baseline, think=false | 76.9% | 27/30 | ~4 min |
| `20260921-214648-full` | v2-completeness, think=false | 76.9% | 27/30 | ~4 min |
| `20260921-221934-full` | v2-completeness, **think=true** | 76.9% | **29/30** | ~30 min |

`20260921-212657-full` is an earlier run of the same config as `213530` and is
kept only for provenance - its refusal check had a bug (the marker list missed
"do not provide"), so it reports two false failures. Use `213530`.

**v1 -> v2, adding a completeness rule to the system prompt.** Retrieval was
bit-identical, which is the expected result and a useful check that the harness
does not leak prompt changes into retrieval. But **26 of 34 answers changed
text** from one added rule - prompts are a noisy lever, and without a fixed
question set that churn is invisible. It fixed Q07 (the missing URL) and made
Q08/Q15 more complete, but regressed Q11, which went from a written answer to a
verbatim copy of the document's bullet. **It did not fix Q23**, its actual
target: the answer still stopped after step 2 despite an explicit instruction
never to stop part-way through a list. Not clearly a net improvement.

**Root cause of Q23, found by probing rather than guessing.** The retrieved
context provably contained all four steps (`ambulance`, `15 minutes`,
`Repeat step 2`). Re-running the same prompt and the same context with
`think=true` produced all four steps; `think=false` produced two. So the lever
is the model's reasoning mode, not the prompt wording.

This also invalidates how `think=false` was chosen in the first place: it was
picked from a 2-question probe where the answers looked identical and it ran
~5x faster. Two questions were not enough to see the difference. The 30-question
set was.

**think=false -> think=true, prompt held at v2.** Answers graded by hand went
from 27/30 to **29/30**, and all three outstanding problems closed at once:

- **Q23** now returns all four attack steps including "call for an ambulance"
  and "repeat after 15 minutes" - the safety failure is gone.
- **Q17** stopped over-refusing. It now answers from the document ("preventer
  inhalers need to be taken every day even if you are symptom-free") instead of
  claiming the guidance is absent.
- **Q11** recovered from the v2 regression, back to a written sentence rather
  than a verbatim bullet.

One small regression: **Q06** dropped the actionable half of its answer. It says
exercise can bring on symptoms but no longer mentions that taking a reliever
beforehand often prevents them, which `think=false` did include.

The cost is time: about 30 minutes per full run against about 4, roughly 7x.
That is tolerable for a nightly scoring run and painful for an interactive loop,
so the sensible split is `think=false` while iterating and `think=true` for any
number that gets recorded or shipped.

**Not tested:** whether the v1 prompt would also fix Q07 once thinking is on.
v2's gains were measured with thinking off, so part of what it bought may now be
redundant. That cell of the grid costs another 30-minute run to fill.

**Retrieval has not moved in any round - 76.9% in all three.** That is not a
disappointing result, it is the correct one: nothing changed so far touches
retrieval. Moving recall@1 requires acting on the retrieval side - a different
embedding model, a different chunking strategy, or adding reranking or hybrid
search - and each of those belongs to a later phase, measured one at a time
against this same table.

## Known limitations

- **Corpus too small to draw conclusions from.** One document, 9 chunks,
  ~1,600 tokens - small enough to fit in a single prompt, which means this
  corpus does not by itself justify RAG. It is a fixture for building and
  debugging the pipeline. Add documents until the corpus exceeds ~50 chunks
  before treating any number here as stable.
- **No similarity threshold, on purpose.** Measured on this corpus, an
  unanswerable question (Q25) scored 0.596 while an answerable one (Q14) scored
  0.606 on its correct section. The bands overlap, so no cut-off can separate
  "relevant" from "irrelevant". Refusal is enforced by the system prompt and
  verified by the `refusal` group instead. Revisit once the corpus is larger.
- **`nomic-embed-text` is English-only.** The optional crosslingual block
  scores 0% at k=1 by design; it exists as a before/after probe for swapping in
  a multilingual model, not as a failure.
- **Heading map is hand-written** for this leaflet (`SECTION_HEADINGS` in
  `config.py`). Generalise it when more documents arrive rather than guessing a
  universal heading detector now.
- On Windows, `–` and `’` may render as `?` in the console. The stored data is
  correct UTF-8 (U+2013 / U+2019); it is a cp1252 console artifact only.

## Deliberately not in the baseline

Left out so that each can be measured against the numbers above, one at a time:
reranking, hybrid search (BM25 + vector), query rewriting / HyDE, multi-query,
multi-turn conversation memory, streaming, caching, integration with the Spring
Boot backend, and the chat UI.

## Evaluation set

`eval/eval_questions.yaml` - 30 scored questions plus 4 optional crosslingual
ones, across seven groups. Ground truth points at **section ids**, not chunk
indices, so the file stays valid when the chunking strategy changes.
