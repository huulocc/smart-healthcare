# RAG baseline

A minimal, fully local retrieval-augmented generation pipeline over patient
information leaflets. Its job is **not** to be good. Its job is to run end to
end and produce a number that every later change has to beat.

> **New here?** Read [`docs/CHATBOT.md`](../docs/CHATBOT.md) first
> ([tiếng Việt](../docs/CHATBOT.vi.md)) - it explains how the whole thing works
> and assumes no prior knowledge of RAG. This file is the working log:
> measurements, what was tried, and what is still broken.

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
| Corpus | 6 PDFs in `data/raw/`, 33 chunks (was 1 PDF, 9 chunks, until 2026-09-29) |
| Chunking | hand-written headings (asthma), detected headings, or pages; max 1500 chars, 200 overlap |
| Embedding | `nomic-embed-text` via Ollama, 768-dim, cosine |
| Vector store | ChromaDB, persistent |
| Generation | `qwen3` via Ollama, `temperature=0` |
| Retrieval | top-k = 3 |
| Backend switch | `llm.py` - Ollama (default) or Gemini, see below |

> The baseline numbers below were produced with `prompt=v1-baseline,
> think=false`. `config.py` has since moved on - see **Hillclimb log**. Every
> file in `eval/results/` records the config that produced it, so that file is
> the authority, not this README.

No LangChain or LlamaIndex. At this size a framework would hide the exact
behaviour we are trying to measure.

### Swapping the model backend

`llm.py` routes `embed` / `chat` / `chat_stream` to either Ollama or Gemini;
nothing else in the pipeline knows which answered. Generation and embedding
switch independently, set in `config.py` or overridden per-run:

```
RAG_LLM_BACKEND=gemini python rag/evaluate.py
```

Gemini needs a key in `rag/.env` (gitignored; `rag/.env.example` shows the
shape). `python rag/gemini_api.py` checks the key, lists the models it can
reach and times one call of each kind - run it before trusting a model name,
because Google retires them regularly.

**Where the time actually goes.** Measured 2026-09-25 on this machine, warm,
one question, medians:

| Stage | Time | Share |
|---|---|---|
| Embed the question (`nomic-embed-text`) | 2.169 s | 3.0 % |
| ChromaDB search (9 chunks) | 0.004 s | 0.0 % |
| `qwen3` generates the answer | 70.9 s | 97.0 % |

Cold, with model load, the first call took 130 s. So moving **generation** to
a hosted model is the entire speed story; moving embedding saves ~2 s and
costs a full re-ingest. Embedding choice matters for `recall@1`, not latency -
and for ingest time once the corpus grows past a few hundred chunks.

Mixing embedding models is the one failure in this pipeline with no symptom:
the search still returns three chunks with plausible scores, just the wrong
ones. `ingest.py` therefore stamps the collection with the model that built it
and `retrieve.py` refuses to query it with a different one.

**What a hosted backend costs you.** All measured 2026-09-25, and all things a
local model never does:

| Failure | What happened | Handling |
|---|---|---|
| Model retired | `gemini-2.5-flash` is listed by the API and 404s for new keys | Listing proves nothing; only a call does. `python rag/gemini_api.py` calls. |
| Capacity 503 | `3.8-flash` and `3.7-flash` refused nearly every request **with thinking on**; the same prompt with thinking off succeeded | Backoff, and `3.5-flash` pinned as default. Turning thinking off would trade away the Q23 ambulance step. |
| Silent truncation | `3.8-flash` once streamed 475 chars of reasoning and **no answer**, HTTP 200 | `chat_stream` raises if a stream ends with no content, so the widget shows an error instead of a hanging "thinking" label. |
| Daily quota | **20 requests per model per day** on the free tier | A 34-question eval run cannot finish on one model. Evaluation stays on Ollama. |

So: Gemini is the fast path for the live widget, Ollama remains the backend the
baseline is measured on. That split is deliberate - the recorded numbers stay
reproducible offline, and no quota can make them unreproducible.

## Corpus

6 patient leaflets since 2026-09-29 (was the asthma leaflet alone).
`python rag/ingest.py` picks the chunking strategy per file:

| Document | Pages | Strategy | Chunks |
|---|---:|---|---:|
| asthma-leaflet | 4 | manual (hand-written headings) | 9 |
| allergic-rhinitis | 3 | headings | 6 |
| common-cold | 2 | headings | 5 |
| covid19-symptoms | 1 | whole | 1 |
| migraine | 5 | headings (bold only) | 10 |
| flu | 1 | pages | 2 |

**Left out on purpose** (supplied with the others, removed the same day):

- An older edition of the hay fever leaflet (May 2023). It duplicated the 2025
  one and took a top-3 slot on Q03, Q20 and Q28; without it recall@1 went
  back from 73.1% to 76.9% on the asthma questions.
- Two clinical guidelines written for staff - rashes in children (24 pages)
  and UTI management (38 pages). They hold paediatric antibiotic doses, and
  `SYSTEM_PROMPT` forbids inventing a dose but not quoting one to a patient.

Ingest takes well under a minute. Answering is no slower: search time barely
moves with corpus size (1.07 ms at 9 chunks, 1.72 ms at 1000) and generation
still reads only the top 3.

**The asthma chunks are byte-for-byte unchanged**, verified against the old
index, so their scores stay comparable.

### Retrieval, eval set v2 (2026-09-29, 33 chunks)

`eval/eval_questions.yaml` v2 adds 37 questions for the new documents and
rewords Q08, Q15, Q16, which said "this" when asthma was the only thing "this"
could mean.

| | n | recall@1 | recall@3 |
|---|---:|---:|---:|
| **All headline questions** | 60 | 81.7% | 90.0% |
| asthma-leaflet | 26 | 80.8% | 84.6% |
| allergic-rhinitis | 6 | 100% | 100% |
| common-cold | 7 | 42.9% | 85.7% |
| covid19-symptoms | 3 | 100% | 100% |
| flu | 4 | 100% | 100% |
| migraine | 10 | 80.0% | 90.0% |
| disambiguation (cold vs flu vs COVID vs hay fever) | 4 | 100% | 100% |

For reference, asthma alone on v1: recall@1 76.9%, recall@3 100%.

What the numbers say:

- **Asthma lost recall@3 to real distractors.** Q14 (tight chest at night),
  Q20 (dusty job, wheezing), Q21 (menopause, breathless) and Q22 never say
  "asthma"; cold and hay fever chunks now outrank the right section. The asthma
  chunk scores themselves did not change.
- **The common cold is the weak document**, and the cause is extraction, not
  embedding. The leaflet is two columns; pypdf reads them interleaved, so
  "When to Seek Medical Care" lands inside the chunk headed "What is Common
  Cold?" and C07 ("when should I see a doctor") misses it. Same effect gives
  the hay fever chunks a subtitle as their heading. A layout-aware extractor is
  the fix, not a retrieval change.
- **Disambiguation held**: all four questions where cold, flu, COVID-19 and hay
  fever share symptoms went to the right document first.

Generation over v2 has not been run yet (`python rag/evaluate.py --generate`,
roughly an hour on Ollama for 71 questions).

A detected heading that is wrong can split an instruction. The migraine
leaflet's "Go to the nearest Hospital / **Emergency (A&E)** / Department or
phone 999" first cut "phone 999" off the RED advice and attached it to AMBER.
A bold line that finishes an unfinished sentence at the same size is no longer
taken as a heading, and M03 now guards it. Check `python rag/ingest.py -v`
after adding any document.

## Deliberately not in the baseline

Left out so that each can be measured against the numbers above, one at a time:
reranking, hybrid search (BM25 + vector), query rewriting / HyDE, multi-query,
multi-turn conversation memory, streaming, caching, integration with the Spring
Boot backend, and the chat UI.

## Evaluation set

`eval/eval_questions.yaml` - 30 scored questions plus 4 optional crosslingual
ones, across seven groups. Ground truth points at **section ids**, not chunk
indices, so the file stays valid when the chunking strategy changes.
