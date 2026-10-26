"""Fast checks for requests the clinic assistant must not send to an LLM.

These intentionally cover only unmistakable instruction attacks and unrelated
tasks. The versioned prompts handle nuanced requests and untrusted documents.
"""

import re

INJECTION = re.compile(
    r"\b(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above|system|developer)\s+"
    r"(?:instructions|rules|prompts?|messages?)\b|"
    r"\b(?:reveal|show|print|repeat)\s+(?:me\s+)?(?:your\s+|the\s+)?"
    r"(?:system|developer|hidden)\s+(?:prompt|instructions|message)\b|"
    r"\b(?:bypass|disable)\s+(?:your\s+|the\s+)?(?:safety|guardrails|rules)\b",
    re.IGNORECASE,
)
UNRELATED = re.compile(
    r"^(?:(?:please|can you|could you|would you)\s+)?"
    r"(?:(?:write|generate|create)\s+(?:me\s+)?(?:a\s+)?(?:poem|song|essay|code|program)\b|"
    r"(?:tell me a joke|what(?:'s| is) the weather|who won the game|solve this equation)\b)",
    re.IGNORECASE,
)
BOOKING = re.compile(
    r"\b(?:book|cancel|reschedule)\s+(?:me\s+)?(?:an?\s+|my\s+)?appointment\b",
    re.IGNORECASE,
)
ROLE_LINE = re.compile(r"^\s*(?:system|developer|assistant)\s*:", re.IGNORECASE)


def rejection_for(question: str) -> str | None:
    if INJECTION.search(question):
        return "I can help with patient leaflets and department guidance, but I cannot change my instructions."
    if UNRELATED.search(question):
        return "I can answer patient leaflet questions or suggest a department from symptoms."
    if BOOKING.search(question):
        return "I can suggest a department, but appointments must be managed in the booking pages."
    return None


def neutralize_document_instructions(text: str) -> str:
    """Remove overt instructions to the assistant from untrusted file text."""
    return "\n".join(
        line for line in text.splitlines()
        if not INJECTION.search(line) and not ROLE_LINE.match(line)
    )
