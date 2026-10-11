"""Backend switch: route `embed` / `chat` / `chat_stream` to Ollama or Gemini.

Everything upstream imports from here rather than from a specific client, so
changing backend is a config edit and nothing else. Generation and embedding
route independently - see the note on LLM_BACKEND / EMBED_BACKEND in config.py
for why moving generation is the speed win and moving embedding is not.

Clients are imported lazily so that running fully local never needs a Gemini
key, and running fully on Gemini never needs Ollama installed.
"""

import config
from errors import ModelError

BACKENDS = ("ollama", "gemini")


def _client(name):
    if name == "ollama":
        import ollama_api

        return ollama_api
    if name == "gemini":
        import gemini_api

        return gemini_api
    raise ModelError(
        f"Unknown backend {name!r} in config.py. Choose one of: {', '.join(BACKENDS)}."
    )


def embed(texts, is_query):
    return _client(config.EMBED_BACKEND).embed(texts, is_query)


def chat(system, user):
    return _client(config.LLM_BACKEND).chat(system, user)


def chat_stream(system, user):
    yield from _client(config.LLM_BACKEND).chat_stream(system, user)


def embed_model_name():
    """The embedding model actually in use - what an index must be read with."""
    return (
        config.GEMINI_EMBED_MODEL
        if config.EMBED_BACKEND == "gemini"
        else config.EMBED_MODEL
    )


def embed_dim():
    return (
        config.GEMINI_EMBED_DIM
        if config.EMBED_BACKEND == "gemini"
        else config.EMBED_DIM
    )


def llm_model_name():
    return (
        config.GEMINI_LLM_MODEL if config.LLM_BACKEND == "gemini" else config.LLM_MODEL
    )


def describe():
    """One line for logs and eval records - a score is meaningless without it."""
    return (
        f"embed={config.EMBED_BACKEND}:{embed_model_name()} "
        f"llm={config.LLM_BACKEND}:{llm_model_name()} think={config.LLM_THINK}"
    )
