"""The one exception type callers need to know about.

`server.py` turns a model-backend failure into HTTP 503, and it should not have
to care which backend failed. Each client raises its own subclass so the message
can be specific, while every caller catches `ModelError`.
"""


class ModelError(RuntimeError):
    """A model backend (Ollama, Gemini, ...) could not be reached or refused."""
