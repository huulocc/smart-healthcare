"""Minimal Ollama client: embeddings and chat.

Dependency-free on purpose. Two endpoints do not justify another package, and
the baseline is easier to reason about when the HTTP call is visible.
"""

import json
import urllib.error
import urllib.request

from config import (
    EMBED_MODEL,
    LLM_MODEL,
    LLM_TEMPERATURE,
    LLM_THINK,
    OLLAMA_HOST,
    PASSAGE_PREFIX,
    QUERY_PREFIX,
)


class OllamaError(RuntimeError):
    pass


def _post(path, payload, timeout=600):
    request = urllib.request.Request(
        OLLAMA_HOST + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read())
    except urllib.error.URLError as exc:
        raise OllamaError(
            f"Cannot reach Ollama at {OLLAMA_HOST} ({exc}). Start it with `ollama serve`."
        ) from exc


def embed(texts, is_query):
    """Embed texts, applying the task prefix that nomic-embed-text expects.

    `is_query` is not a convenience flag - queries and passages must be
    prefixed differently, and getting it wrong degrades ranking with no error.
    """
    prefix = QUERY_PREFIX if is_query else PASSAGE_PREFIX
    payload = {"model": EMBED_MODEL, "input": [prefix + text for text in texts]}
    return _post("/api/embed", payload)["embeddings"]


def _chat_payload(system, user, stream):
    return {
        "model": LLM_MODEL,
        "think": LLM_THINK,
        "stream": stream,
        "options": {"temperature": LLM_TEMPERATURE},
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }


def chat(system, user):
    payload = _chat_payload(system, user, stream=False)
    return _post("/api/chat", payload)["message"].get("content", "").strip()


def chat_stream(system, user):
    """Yield ("thinking" | "content", text) as the model produces it.

    Same request as `chat`, only streamed - at temperature 0 the text is the
    same either way, so streaming changes delivery and not what was evaluated.

    Reasoning is yielded separately because it arrives first and takes most of
    the wall clock: with thinking on, the first reasoning token lands within
    seconds while the first answer token takes far longer. Surfacing it gives
    the reader real evidence of progress instead of an indefinite spinner.
    """
    payload = _chat_payload(system, user, stream=True)
    request = urllib.request.Request(
        OLLAMA_HOST + "/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=600) as response:
            for line in response:
                if not line.strip():
                    continue
                chunk = json.loads(line)
                message = chunk.get("message", {})
                if message.get("thinking"):
                    yield "thinking", message["thinking"]
                if message.get("content"):
                    yield "content", message["content"]
                if chunk.get("done"):
                    return
    except urllib.error.URLError as exc:
        raise OllamaError(
            f"Cannot reach Ollama at {OLLAMA_HOST} ({exc}). Start it with `ollama serve`."
        ) from exc
