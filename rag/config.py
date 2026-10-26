"""Single source of truth for every baseline parameter.

Runtime settings live here; versioned prompt text lives in prompts/. When a
result is recorded, both settings and prompt versions are needed to explain it.
"""

import os
from pathlib import Path

from prompts import LEAFLET_SYSTEM, LEAFLET_USER

# --- paths ---------------------------------------------------------------

RAG_DIR = Path(__file__).resolve().parent
DATA_RAW = RAG_DIR / "data" / "raw"
CHROMA_PATH = RAG_DIR / "data" / "chroma"
EVAL_FILE = RAG_DIR / "eval" / "eval_questions.yaml"
RESULTS_DIR = RAG_DIR / "eval" / "results"

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
LLM_BACKEND = os.environ.get("RAG_LLM_BACKEND", "gemini")
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
GEMINI_LLM_MODEL = "gemini-3.6-flash"
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

COLLECTION = "patient_leaflets"
TOP_K = 3

# No similarity cut-off on purpose. Measured on this corpus (all five runs in
# eval/results/ agree): the unanswerable Q25 tops out at 0.607 while Q14's
# correct section scores only 0.584. The unanswerable question scores HIGHER, so
# a threshold would not merely fail to separate them - it would reject the good
# answer and admit the bad one. Refusal is enforced by SYSTEM_PROMPT instead and
# verified by the `refusal` eval group.
MIN_SCORE = None

# --- chunking ------------------------------------------------------------

# ingest.py chunks each PDF with the first strategy that works:
#
#   1. manual   headings written by hand in DOCUMENTS below
#   2. headings headings detected from font size and weight
#   3. pages    one section per page, when too few headings are detected
#
# Then any section longer than MAX_CHUNK_CHARS is split with overlap, and any
# section shorter than MIN_SECTION_CHARS is folded into the next one.
#
# Why font size and not the words: measured 2026-09-29 on the 8 leaflets added
# that day, headings share no wording ("Symptoms", "8.1 Diagnostic
# investigations", "What causes a migraine?") but in 6 of 8 they are set larger
# or bolder than the body text. The other two (Rashes, COVID-19) fall to pages.

# Measured the same day: the largest asthma section is 1533 characters, so
# 1500 is roughly "one leaflet section". Manual documents are never split, to
# keep the asthma chunks - and every score recorded against them - identical.
MAX_CHUNK_CHARS = 1500
CHUNK_OVERLAP_CHARS = 200
MIN_SECTION_CHARS = 200

# A line counts as a heading when it is at least this many points larger than
# the document's body text, or bold and at least HEADING_BOLD_GAIN larger.
# 1.0 and not more: "Medicines that can help" in the hay fever leaflet is set
# 13pt regular on 12pt body.
# Documents with no larger text at all (the migraine leaflet) fall back to
# bold-at-body-size.
HEADING_SIZE_GAIN = 1.0
HEADING_BOLD_GAIN = 0.5
HEADING_MAX_CHARS = 80
HEADING_MAX_WORDS = 12

# Text over 2.5x the body size is cover art, not a heading: the flu poster
# sets single words at 60-100pt, the UTI cover title is 28pt on 11pt body.
# The document title is already on every chunk, so these lines are dropped.
DISPLAY_TEXT_RATIO = 2.5

# Detected headings must turn up on at least this share of pages, or detection
# is judged to have failed and the document is chunked by page. Measured on the rashes
# guideline (since removed from the corpus): one condition per page, names set in
# body text, and the few bold lines are table labels on 7 of its 24 pages.
MIN_HEADING_PAGE_SHARE = 1 / 3

# A line on at least this share of pages is running header or footer, e.g.
# "Ref: IPC-0001-024-v2 Page 7 of 38". Only applied from 3 pages up, so a
# 2-page leaflet cannot lose a real heading that happens to repeat.
REPEATED_LINE_SHARE = 0.5

# Embedding requests are sent in batches. Gemini's batchEmbedContents accepts
# at most 100 texts per call; Ollama has no limit but the progress is useful.
EMBED_BATCH = 50

# (regex for a stripped line, section id). Order follows the document, and the
# ids must match `sections:` in eval/eval_questions.yaml - that is what ties a
# retrieved chunk to the evaluation ground truth.
#
# Hand-specified for the asthma leaflet, which the eval set was written
# against. Every other document gets detected headings.
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

# --- corpus --------------------------------------------------------------

# Every *.pdf in DATA_RAW is indexed. An entry here is optional and overrides
# what would otherwise be derived from the file:
#
#   doc_id    stable id; default is the file name, lower-cased and slugged
#   title     default is the PDF's own /Title, which is often wrong - the
#             migraine leaflet's reads "PIL Clinical Procedure no General
#             Anaesthetic or Sedation Template", the UTI and rashes ones are
#             empty. The title is written into every chunk, so it matters.
#   headings  hand-written (regex, section id) pairs; skips detection
DOCUMENTS = {
    "asthma-what-you-need-to-know.pdf": {
        "doc_id": "asthma-leaflet",
        "headings": SECTION_HEADINGS,
    },
    "Allergic-Rhinitis-June-2025.pdf": {
        "doc_id": "allergic-rhinitis",
        "title": "Allergic Rhinitis (hay fever)",
    },
    "Common-Cold-FS-508.pdf": {
        "doc_id": "common-cold",
        "title": "Preventing and Managing the Common Cold",
    },
    "COVID19-symptoms.pdf": {
        "doc_id": "covid19-symptoms",
        "title": "Symptoms of COVID-19",
    },
    "PIAG-533-Migraine-1.pdf": {
        "doc_id": "migraine",
        "title": "Migraine in children: information for parents and carers",
    },
    "sick-with-the-flu.pdf": {
        "doc_id": "flu",
        "title": "Sick with the flu? Know what to do",
    },
}

# --- prompting -----------------------------------------------------------

# Bump this on every prompt change and record it next to the result, otherwise
# a week from now no number can be traced back to the prompt that produced it.
#
#   v1-baseline      first run, 2026-09-21
#   v2-completeness  added the list/steps rule after Q23 dropped two of the
#                    four attack steps while Q29 (same chunk) kept all four
PROMPT_VERSION = "v2-completeness"

SYSTEM_PROMPT = LEAFLET_SYSTEM
USER_PROMPT = LEAFLET_USER


# --- telemetry -----------------------------------------------------------

TELEMETRY_ENABLED = os.environ.get("RAG_TELEMETRY_ENABLED", "true").lower() in ("true", "1", "yes")
TELEMETRY_URL = os.environ.get(
    "RAG_TELEMETRY_URL", "http://127.0.0.1:8080/api/ai/telemetry"
)
TELEMETRY_SECRET = os.environ.get(
    "RAG_TELEMETRY_SECRET",
    os.environ.get("AI_TELEMETRY_SECRET", "")
).strip()
