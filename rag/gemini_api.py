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
import random
import re
import sys
import time
import urllib.error
import urllib.request

import config
from errors import ModelError

TIMEOUT = 120

_last_call = 0.0


def _throttle():
    """Keep consecutive calls at least MIN_INTERVAL apart.

    The free tier allows 20 requests per minute. A 34-question eval run sends
    them as fast as it can and trips the quota around question 21, so pacing
    them is cheaper than retrying after the window closes. Interactive chat is
    never this fast, so this costs a real user nothing.
    """
    global _last_call
    wait = config.GEMINI_MIN_INTERVAL - (time.monotonic() - _last_call)
    if wait > 0:
        time.sleep(wait)
    _last_call = time.monotonic()


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


def _body(exc):
    """Read an HTTPError's body once - it cannot be read twice."""
    try:
        return json.loads(exc.read())
    except Exception:
        return {}


def _retry_delay(body):
    """The wait Google asks for, in seconds, or None.

    Sent as a RetryInfo detail, and repeated in prose in the message. Both are
    checked because the structured field is the contract but the prose is what
    actually showed up when the free-tier quota tripped.
    """
    error = body.get("error", {})
    for detail in error.get("details", []):
        value = detail.get("retryDelay")
        if value:
            match = re.match(r"([\d.]+)s?$", str(value))
            if match:
                return float(match.group(1))
    match = re.search(r"retry in ([\d.]+)s", error.get("message", ""))
    return float(match.group(1)) if match else None


def _explain(exc, body=None):
    """Turn an HTTP failure into something actionable.

    Google puts the real reason in the response body; the status line alone
    says "HTTP Error 400: Bad Request" and sends you looking in the wrong place.
    """
    if isinstance(exc, urllib.error.HTTPError):
        if body is None:
            body = _body(exc)
        detail = body.get("error", {}).get("message", "")
        if exc.code in (400, 401, 403) and "API key" in detail:
            return GeminiError(f"Gemini rejected the API key: {detail}")
        if exc.code == 404:
            return GeminiError(
                f"{detail or 'Model not found'}. Run `python rag/gemini_api.py` "
                "to list the models this key can reach, then fix the name in config.py."
            )
        if exc.code == 429:
            return GeminiError(
                f"Gemini quota hit: {detail}\n"
                "The free tier caps requests PER MODEL PER DAY (20 as measured on "
                "2026-09-25), not per minute - waiting will not clear it. A 34-question "
                "eval run cannot finish on one model. Either enable billing, or leave "
                "evaluation on Ollama and use Gemini for the live widget."
            )
        return GeminiError(f"Gemini returned HTTP {exc.code}: {detail or exc.reason}")
    return GeminiError(f"Cannot reach Gemini ({exc}). Check the network connection.")


def _open(request):
    """urlopen with backoff on the failures that clear up by themselves.

    A local model either answers or is down. A hosted one also gets told to
    come back later - 429 for rate limits, 503 when a capacity pool is full -
    and those are worth waiting out rather than surfacing to the reader.
    Anything else (bad key, wrong model name, safety block) is permanent and
    raises on the first attempt, because retrying it only wastes the quota.

    Returns an open response; the caller closes it. Only ever called before a
    single byte has been read, so retrying cannot replay a half-sent stream.
    """
    last = last_body = None
    for attempt in range(1, config.GEMINI_MAX_ATTEMPTS + 1):
        _throttle()
        try:
            return urllib.request.urlopen(request, timeout=TIMEOUT)
        except urllib.error.HTTPError as exc:
            if exc.code not in config.GEMINI_RETRY_CODES:
                raise
            last, last_body = exc, _body(exc)
            if attempt == config.GEMINI_MAX_ATTEMPTS:
                break
            # Google says how long to wait when it knows - a quota window is a
            # fixed length, and guessing shorter just burns another attempt.
            # Fall back to exponential backoff for 503s, which carry no hint.
            # The jitter keeps a batch of eval questions from retrying in
            # lockstep and rebuilding the spike we are backing off from.
            header = exc.headers.get("Retry-After") if exc.headers else None
            delay = (
                _retry_delay(last_body)
                or (float(header) if header and header.isdigit() else None)
                or config.GEMINI_BACKOFF_SECONDS * (2 ** (attempt - 1))
            )
            delay = min(delay, config.GEMINI_MAX_BACKOFF_SECONDS) + random.uniform(0, 0.5)
            print(
                f"  gemini {exc.code}, retrying in {delay:.1f}s "
                f"({attempt}/{config.GEMINI_MAX_ATTEMPTS - 1})",
                file=sys.stderr,
            )
            time.sleep(delay)
    raise _explain(last, last_body)


def _post(model, method, payload):
    try:
        with _open(_request(model, method, payload)) as response:
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
    produced = False
    finish = None
    try:
        with _open(request) as response:
            for raw in response:
                line = raw.decode("utf-8").strip()
                # SSE: payload lines start with "data: ", everything else
                # (blank lines, comments) is framing.
                if not line.startswith("data: "):
                    continue
                body = line[len("data: "):]
                if body == "[DONE]":
                    break
                chunk = json.loads(body)
                for candidate in chunk.get("candidates", []):
                    finish = candidate.get("finishReason") or finish
                for kind, text in _parts(chunk):
                    produced = produced or kind == "content"
                    yield kind, text
    except urllib.error.URLError as exc:
        raise _explain(exc) from exc

    # A stream that carried reasoning but no answer is the worst failure mode
    # here: no exception, HTTP 200, and the widget shows a thinking label that
    # never resolves. Observed on gemini-3.8-flash under load. Raise instead,
    # so server.py turns it into an `error` event the reader can act on.
    if not produced:
        raise GeminiError(
            f"Gemini streamed reasoning but no answer (finishReason: {finish or 'none'}). "
            "The model usually recovers - try again, or pin a model with spare "
            "thinking capacity in config.py."
        )


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
    # Being listed is not permission to call it: gemini-2.5-flash appears in
    # the listing and still 404s for keys created after it was retired. The
    # calls below are the only real check, so a missing name is a warning and
    # a present one proves nothing.
    for label, name in [
        ("GEMINI_LLM_MODEL", config.GEMINI_LLM_MODEL),
        ("GEMINI_EMBED_MODEL", config.GEMINI_EMBED_MODEL),
    ]:
        print(f"{label:20s} {name:32s} {'listed' if name in names else 'NOT LISTED - fix config.py'}")

    print("-" * 70)
    started = time.perf_counter()
    vector = embed(["What are the signs of an asthma attack?"], is_query=True)[0]
    print(f"embed  : OK - {len(vector)} dims in {(time.perf_counter() - started) * 1000:.0f} ms")

    started = time.perf_counter()
    reply = chat("Answer in one short sentence.", "What is asthma?")
    print(f"chat   : OK - {time.perf_counter() - started:.1f} s")
    print(f"         {reply[:160]}")
