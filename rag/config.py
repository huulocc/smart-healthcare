"""Single source of truth for every baseline parameter.

Nothing tunable lives outside this file. When a result is recorded in the
README, it is only meaningful alongside the values below.
"""

import os
from pathlib import Path

# --- paths ---------------------------------------------------------------

RAG_DIR = Path(__file__).resolve().parent
DATA_RAW = RAG_DIR / "data" / "raw"
CHROMA_PATH = RAG_DIR / "data" / "chroma"
EVAL_FILE = RAG_DIR / "eval" / "eval_questions.yaml"
RESULTS_DIR = RAG_DIR / "eval" / "results"

SOURCE_PDF = DATA_RAW / "asthma-what-you-need-to-know.pdf"
DOC_ID = "asthma-leaflet"

ENV_FILE = RAG_DIR / ".env"

# --- secrets -------------------------------------------------------------


def _load_env_file(path):
    """Read KEY=VALUE lines into os.environ without overwriting real env vars.

    A three-line parser instead of python-dotenv: the file holds one key, and
    the baseline's no-dependency rule is worth more than quoting edge cases.
    A real environment variable always wins, so CI can set the key without a
    file on disk.
    """
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


_load_env_file(ENV_FILE)

# Never hard-code this. rag/.env is gitignored; the repo tracks .env.example.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()

# --- backend selection ---------------------------------------------------

# "ollama" (local, private, slow) or "gemini" (hosted, fast, needs a key).
#
# Generation and embedding switch independently on purpose. Generation is 97%
# of the wall clock, so moving it to Gemini is the whole speed win; moving
# embedding saves ~2s but forces a full re-ingest, because vectors from two
# different models are not comparable and mixing them breaks retrieval with no
# error message. Measured 2026-09-25: embed 2.17s, chroma 0.004s, qwen3 70.9s.
#
# The env override exists so a backend can be A/B'd without editing a tracked
# file; evaluate.py records the effective value next to every score.
LLM_BACKEND = os.environ.get("RAG_LLM_BACKEND", "ollama")
EMBED_BACKEND = os.environ.get("RAG_EMBED_BACKEND", "ollama")

# --- ollama --------------------------------------------------------------

OLLAMA_HOST = "http://localhost:11434"

EMBED_MODEL = "nomic-embed-text"
EMBED_DIM = 768

# nomic-embed-text is trained with task prefixes and fails SILENTLY without
# them - no error, just worse ranking. Measured on 2026-09-21: dropping these
# flipped eval question Q14 to the wrong section.
PASSAGE_PREFIX = "search_document: "
QUERY_PREFIX = "search_query: "

LLM_MODEL = "qwen3"
# think=False scores 27/30 and drops "call for an ambulance" from the attack
# instructions (Q23); think=True scores 29/30 but takes 45-80s, which is why it
# was reverted while the widget could only wait in silence. Streaming removes
# that constraint - /api/chat/stream sends reasoning within ~4s and the answer
# as it is written - so the safer setting is back on. See README "Streaming".
LLM_THINK = True
LLM_TEMPERATURE = 0.0  # must stay 0 - a baseline that cannot be reproduced is not a baseline

# --- gemini --------------------------------------------------------------

GEMINI_HOST = "https://generativelanguage.googleapis.com/v1beta"

# Google renames and retires these regularly. `python rag/gemini_api.py` lists
# the models the key can actually reach - run it before trusting either name.
#
# Pinned to an exact version, never "gemini-flash-latest": an alias would swap
# the model underneath a recorded score and make the baseline unreproducible.
# 2026-09-25: gemini-2.5-flash is listed but returns 404 for new keys, with
# gemini-3.8-flash named as its replacement. Listing a model does not mean the
# key may call it - only the call proves that.
#
# 3.8-flash is NOT the default despite being the newest. Measured the same day,
# with thinking on, it returned 503 on almost every call and once streamed 475
# characters of reasoning and no answer at all. 3.5-flash answered every time
# in ~5s with thinking on. Reliability with thinking on is what matters here,
# because thinking off is what drops the ambulance step from Q23. Retry the
# newer model once its capacity settles.
GEMINI_LLM_MODEL = "gemini-3.5-flash"
GEMINI_EMBED_MODEL = "gemini-embedding-001"

# gemini-embedding-001 defaults to 3072 dimensions. Pinned to 768 so a Gemini
# index is the same shape as the nomic one and the two stay comparable.
GEMINI_EMBED_DIM = 768

# Gemini has no prefix convention; it takes the task as a parameter instead.
# Same idea as PASSAGE_PREFIX/QUERY_PREFIX, same silent failure if confused.
GEMINI_PASSAGE_TASK = "RETRIEVAL_DOCUMENT"
GEMINI_QUERY_TASK = "RETRIEVAL_QUERY"

# LLM_THINK drives both backends. -1 lets the model choose how long to think,
# 0 turns thinking off. Keep these aligned with LLM_THINK's trade-off above:
# thinking on is what keeps "call for an ambulance" in the Q23 answer.
GEMINI_THINKING_BUDGET_ON = -1
GEMINI_THINKING_BUDGET_OFF = 0

# A hosted model fails in ways a local one never does. Measured 2026-09-25:
# gemini-3.8-flash and 3.7-flash returned 503 "high demand" for every request
# with thinking ON, while the same prompt with thinking OFF succeeded and
# 3.5-flash succeeded with thinking ON - so it is thinking capacity that runs
# out, not the model. It recovers on its own, which is exactly what a retry is
# for. Turning thinking off to dodge it would trade the Q23 safety step away.
GEMINI_MAX_ATTEMPTS = 5
GEMINI_BACKOFF_SECONDS = 2.0
GEMINI_MAX_BACKOFF_SECONDS = 70.0  # a free-tier quota window is a minute long
GEMINI_RETRY_CODES = (429, 500, 502, 503, 504)

# Free tier: 20 generate_content requests per minute. Measured 2026-09-25, an
# unpaced eval run tripped the quota at question 21 of 34. 3.2s spacing keeps a
# batch just under the limit; interactive chat never comes close, so a real
# user waits nothing extra.
GEMINI_MIN_INTERVAL = 3.2

# --- retrieval -----------------------------------------------------------

COLLECTION = "asthma_baseline"
TOP_K = 3

# No similarity cut-off on purpose. Measured on this corpus, an unanswerable
# question scored 0.596 while an answerable one scored 0.606 on its correct
# section - the bands overlap, so no threshold can separate them. Refusal is
# enforced by SYSTEM_PROMPT instead and verified by the `refusal` eval group.
MIN_SCORE = None

# --- chunking ------------------------------------------------------------

# (regex for a stripped line, section id). Order follows the document, and the
# ids must match `sections:` in eval/eval_questions.yaml - that is what ties a
# retrieved chunk to the evaluation ground truth.
#
# Hand-specified for this leaflet. When more documents arrive, generalise this
# into a real heading detector rather than guessing a universal one now.
SECTION_HEADINGS = [
    (r"^What is asthma\?$", "what-is-asthma"),
    (r"^Why do people get asthma\?$", "why-people-get-asthma"),
    (r"^How is asthma diagnosed\?$", "how-diagnosed"),
    (r"^What triggers asthma symptoms\?$", "triggers"),
    (r"^How is asthma treated\?$", "treatment"),
    (r"^Your asthma is considered well controlled if:$", "well-controlled"),
    (r"^Is asthma serious\?$", "is-it-serious"),
    (r"^What is an asthma attack\?$", "asthma-attack"),
    (r"^Further Information:$", "further-info"),
]

# Repeated page furniture. Left in, it would appear in most chunks and pull
# their embeddings towards each other.
NOISE_PATTERNS = [
    r"^\d+$",                          # bare page number
    r"^Leaflet title:",                # repeated on every page
    r"^Version date:",                 # repeated on every page (captured below first)
    r"^Patient information leaflet$",
    r"^\.$",                           # stray full stop left by the PDF extractor
]

VERSION_LINE = r"^Version date:\s*(.+)$"

# --- prompting -----------------------------------------------------------

# Bump this on every prompt change and record it next to the result, otherwise
# a week from now no number can be traced back to the prompt that produced it.
#
#   v1-baseline      first run, 2026-09-21
#   v2-completeness  added the list/steps rule after Q23 dropped two of the
#                    four attack steps while Q29 (same chunk) kept all four
PROMPT_VERSION = "v2-completeness"

SYSTEM_PROMPT = """You answer questions about patient information leaflets.

Rules:
- Answer ONLY from the DOCUMENTS given to you. Never use outside knowledge.
- If the documents do not contain the answer, say plainly that the information
  is not in the available documents. Do not guess and do not fill the gap.
- When the documents give a sequence of steps, a list of criteria, or safety
  instructions, reproduce EVERY item, in the document's order. Never stop
  part-way through a list, and never summarise it into fewer steps.
- Never invent a dose, a price, or any medical figure.
- Do not diagnose. Point the reader to a healthcare professional where relevant.
- End with the section name(s) you used, like: (section: asthma-attack)
- Keep the answer short and direct - but completeness comes first: never drop a
  step or a safety instruction to make the answer shorter."""

USER_PROMPT = """DOCUMENTS:
{context}

Question: {question}"""
