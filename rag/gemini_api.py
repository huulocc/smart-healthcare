"""Minimal Gemini client: embeddings and chat.

Mirrors `ollama_api` exactly - same three functions, same arguments, same
return shapes - so `llm.py` can pick either one and nothing downstream knows
which answered. Dependency-free for the same reason as the Ollama client: the
HTTP call is easier to reason about when it is visible.

Run this file directly to check a key and see which models it can reach:

    python rag/gemini_api.py

The key is sent as an `x-goog-api-key` header, never as a `?key=` query
parameter, so it cannot leak into proxy logs, browser history or an exception
message that quotes the URL.
"""

import json
import urllib.error
import urllib.request

import config
from errors import ModelError

TIMEOUT = 120


class GeminiError(ModelError):
    pass


def _require_key():
    if not config.GEMINI_API_KEY:
        raise GeminiError(
            f"GEMINI_API_KEY is not set. Put it in {config.ENV_FILE} as "
            "GEMINI_API_KEY=your-key (that file is gitignored)."
        )
    return config.GEMINI_API_KEY


def _request(model, method, payload, stream=False):
    suffix = "?alt=sse" if stream else ""
    url = f"{config.GEMINI_HOST}/models/{model}:{method}{suffix}"
    return urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": _require_key(),
        },
    )


def _explain(exc):
    """Turn an HTTP failure into something actionable.

    Google puts the real reason in the response body; the status line alone
    says "HTTP Error 400: Bad Request" and sends you looking in the wrong place.
    """
    if isinstance(exc, urllib.error.HTTPError):
        try:
            detail = json.loads(exc.read()).get("error", {}).get("message", "")
        except Exception:
            detail = ""
        if exc.code in (400, 401, 403) and "API key" in detail:
            return GeminiError(f"Gemini rejected the API key: {detail}")
        if exc.code == 404:
            return GeminiError(
                f"{detail or 'Model not found'}. Run `python rag/gemini_api.py` "
                "to list the models this key can reach, then fix the name in config.py."
            )
        if exc.code == 429:
            return GeminiError(
                f"Gemini rate limit hit: {detail}. The free tier allows only a few "
                "requests per minute - space out eval runs."
            )
        return GeminiError(f"Gemini returned HTTP {exc.code}: {detail or exc.reason}")
    return GeminiError(f"Cannot reach Gemini ({exc}). Check the network connection.")


def _post(model, method, payload):
    try:
        with urllib.request.urlopen(_request(model, method, payload), timeout=TIMEOUT) as response:
            return json.loads(response.read())
    except urllib.error.URLError as exc:
        raise _explain(exc) from exc


# --- embeddings ----------------------------------------------------------


def embed(texts, is_query):
    """Embed texts, tagging them with the task type Gemini expects.

    `is_query` matters here for the same reason it matters for nomic: a query
    and a passage are embedded differently, and getting it wrong degrades
    ranking silently. Only the mechanism differs - a parameter, not a prefix.
    """
    task = config.GEMINI_QUERY_TASK if is_query else config.GEMINI_PASSAGE_TASK
    model = config.GEMINI_EMBED_MODEL
    payload = {
        "requests": [
            {
                "model": f"models/{model}",
                "content": {"parts": [{"text": text}]},
                "taskType": task,
                "outputDimensionality": config.GEMINI_EMBED_DIM,
            }
            for text in texts
        ]
    }
    data = _post(model, "batchEmbedContents", payload)
    vectors = [item["values"] for item in data.get("embeddings", [])]
    if len(vectors) != len(texts):
        raise GeminiError(
            f"Asked for {len(texts)} embeddings, got {len(vectors)}."
        )
    return vectors


# --- chat ----------------------------------------------------------------


def _chat_payload(system, user):
    budget = (
        config.GEMINI_THINKING_BUDGET_ON
        if config.LLM_THINK
        else config.GEMINI_THINKING_BUDGET_OFF
    )
    return {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {
            "temperature": config.LLM_TEMPERATURE,
            "thinkingConfig": {
                "thinkingBudget": budget,
                "includeThoughts": bool(config.LLM_THINK),
            },
        },
    }


def _parts(chunk):
    """Yield ("thinking" | "content", text) for one response chunk.

    Gemini marks reasoning by setting `thought: true` on the part rather than
    using a separate field, so a part with no flag is answer text.
    """
    for candidate in chunk.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            text = part.get("text")
            if not text:
                continue
            yield ("thinking" if part.get("thought") else "content"), text


def chat(system, user):
    data = _post(config.GEMINI_LLM_MODEL, "generateContent", _chat_payload(system, user))
    text = "".join(t for kind, t in _parts(data) if kind == "content")
    if not text:
        # An empty candidate list usually means a safety filter fired. Saying so
        # beats returning "" and letting the widget show a blank bubble.
        reason = (
            data.get("candidates", [{}])[0].get("finishReason")
            or data.get("promptFeedback", {}).get("blockReason")
            or "unknown"
        )
        raise GeminiError(f"Gemini returned no answer text (finishReason: {reason}).")
    return text.strip()


def chat_stream(system, user):
    """Yield ("thinking" | "content", text) as the model produces it.

    Server-sent events here rather than Ollama's newline-delimited JSON, but
    the contract handed to `generate.answer_stream` is identical, so server.py
    and the React widget need no branch on which backend is running.
    """
    request = _request(config.GEMINI_LLM_MODEL, "streamGenerateContent",
                       _chat_payload(system, user), stream=True)
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            for raw in response:
                line = raw.decode("utf-8").strip()
                # SSE: payload lines start with "data: ", everything else
                # (blank lines, comments) is framing.
                if not line.startswith("data: "):
                    continue
                body = line[len("data: "):]
                if body == "[DONE]":
                    return
                yield from _parts(json.loads(body))
    except urllib.error.URLError as exc:
        raise _explain(exc) from exc


# --- self-test -----------------------------------------------------------


def _list_models():
    """Print the models this key can reach, so config.py can name a real one."""
    request = urllib.request.Request(
        f"{config.GEMINI_HOST}/models",
        headers={"x-goog-api-key": _require_key()},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read()).get("models", [])


if __name__ == "__main__":
    import time

    print(f"key    : {'set (' + str(len(config.GEMINI_API_KEY)) + ' chars)' if config.GEMINI_API_KEY else 'MISSING'}")
    print(f"config : llm={config.GEMINI_LLM_MODEL}  embed={config.GEMINI_EMBED_MODEL}")
    print("-" * 70)

    try:
        models = _list_models()
    except urllib.error.URLError as exc:
        raise SystemExit(_explain(exc))

    names = [m["name"].removeprefix("models/") for m in models]
    generators = [n for n in names if "embedding" not in n and "embed" not in n]
    embedders = [n for n in names if "embed" in n]

    print(f"generation models available ({len(generators)}):")
    for name in generators:
        mark = "  <- config" if name == config.GEMINI_LLM_MODEL else ""
        print(f"   {name}{mark}")
    print(f"\nembedding models available ({len(embedders)}):")
    for name in embedders:
        mark = "  <- config" if name == config.GEMINI_EMBED_MODEL else ""
        print(f"   {name}{mark}")

    print("-" * 70)
    for label, name, pool in [
        ("GEMINI_LLM_MODEL", config.GEMINI_LLM_MODEL, names),
        ("GEMINI_EMBED_MODEL", config.GEMINI_EMBED_MODEL, names),
    ]:
        print(f"{label:20s} {name:32s} {'OK' if name in pool else 'NOT AVAILABLE - fix config.py'}")

    print("-" * 70)
    started = time.perf_counter()
    vector = embed(["What are the signs of an asthma attack?"], is_query=True)[0]
    print(f"embed  : {len(vector)} dims in {(time.perf_counter() - started) * 1000:.0f} ms")

    started = time.perf_counter()
    reply = chat("Answer in one short sentence.", "What is asthma?")
    print(f"chat   : {time.perf_counter() - started:.1f} s")
    print(f"         {reply[:160]}")
