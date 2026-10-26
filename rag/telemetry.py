"""Telemetry client for AI consultation and RAG services.

Dispatches non-blocking, privacy-preserving usage events to Spring Boot
(/api/ai/telemetry). Consultation text, patient identities, and clinical
notes are strictly excluded.
"""

import json
import logging
import time
import urllib.error
import urllib.request
import uuid

import config

logger = logging.getLogger("rag.telemetry")
_warned_missing_secret = False


def generate_request_id(prefix: str = "REQ-AI") -> str:
    """Generate a unique tracking identifier for an AI invocation."""
    token = uuid.uuid4().hex[:16].upper()
    return f"{prefix}-{token}"


def estimate_tokens(text: str) -> int:
    """Fallback token estimation when exact token count is not provided by provider."""
    if not text:
        return 0
    words = len(text.split())
    chars = len(text)
    # Average rule of thumb: ~4 characters per token or ~1.3 tokens per word
    return max(1, max(words * 4 // 3, chars // 4))


def send_telemetry(
    feature: str = "CHAT",
    provider: str | None = None,
    model: str | None = None,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    latency_ms: int = 0,
    status: str = "SUCCESS",
    request_id: str | None = None,
    error_code: str | None = None,
    error_message: str | None = None,
    timeout: float = 4.0,
) -> bool:
    """Record an AI invocation event with the Spring Boot telemetry service.

    Guaranteed never to raise exceptions that could disrupt patient chat.
    Returns True if sent successfully, False otherwise.
    """
    if not getattr(config, "TELEMETRY_ENABLED", True):
        return False

    req_id = request_id or generate_request_id()
    ai_provider = (
        provider
        or ("GOOGLE" if getattr(config, "LLM_BACKEND", "") == "gemini" else "OLLAMA")
    ).upper()

    ai_model = model or (
        getattr(config, "GEMINI_LLM_MODEL", "gemini-2.5-flash")
        if ai_provider == "GOOGLE"
        else getattr(config, "LLM_MODEL", "llama3:8b")
    )

    p_tokens = max(0, int(prompt_tokens))
    c_tokens = max(0, int(completion_tokens))
    lat_ms = max(0, int(latency_ms))

    payload = {
        "requestId": req_id,
        "traceId": req_id,
        "feature": feature.upper(),
        "provider": ai_provider,
        "model": str(ai_model),
        "promptTokens": p_tokens,
        "completionTokens": c_tokens,
        "latencyMs": lat_ms,
        "status": status.upper(),
        "errorCode": error_code[:50] if error_code else None,
        "errorType": error_code[:50] if error_code else None,
        "errorMessage": error_message[:255] if error_message else None,
    }

    url = getattr(config, "TELEMETRY_URL", "http://127.0.0.1:8080/api/ai/telemetry")
    secret = getattr(config, "TELEMETRY_SECRET", "")
    if not secret:
        global _warned_missing_secret
        if not _warned_missing_secret:
            logger.warning("AI telemetry is disabled until RAG_TELEMETRY_SECRET is configured")
            _warned_missing_secret = True
        return False

    headers = {
        "Content-Type": "application/json",
        "X-Telemetry-Secret": secret,
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status in (200, 201)
    except urllib.error.HTTPError as exc:
        logger.warning(
            "Telemetry delivery failed with HTTP %s: %s (req_id=%s)",
            exc.code,
            exc.reason,
            req_id,
        )
        return False
    except Exception as exc:
        logger.warning(
            "Telemetry delivery failed: %s (req_id=%s)",
            exc,
            req_id,
        )
        return False
