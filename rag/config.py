"""Single source of truth for every baseline parameter.

Nothing tunable lives outside this file. When a result is recorded in the
README, it is only meaningful alongside the values below.
"""

from pathlib import Path

# --- paths ---------------------------------------------------------------

RAG_DIR = Path(__file__).resolve().parent
DATA_RAW = RAG_DIR / "data" / "raw"
CHROMA_PATH = RAG_DIR / "data" / "chroma"
EVAL_FILE = RAG_DIR / "eval" / "eval_questions.yaml"
RESULTS_DIR = RAG_DIR / "eval" / "results"

SOURCE_PDF = DATA_RAW / "asthma-what-you-need-to-know.pdf"
DOC_ID = "asthma-leaflet"

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
LLM_THINK = True       # see README "Hillclimb": think=False truncated Q23's safety
                       # steps; enabling thinking restored all four. Costs ~5x time.
LLM_TEMPERATURE = 0.0  # must stay 0 - a baseline that cannot be reproduced is not a baseline

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
