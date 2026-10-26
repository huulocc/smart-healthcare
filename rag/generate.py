"""Phase B, step 2 - assemble the prompt and generate the answer.

The LLM is reached only through `llm.chat`, so swapping the model (or the whole
backend, Ollama <-> Gemini) means touching config.py and that one module, not
this file's logic.
"""

import config
from llm import chat, chat_stream


def build_context(hits):
    blocks = []
    for index, hit in enumerate(hits, start=1):
        blocks.append(f"[{index}] (section: {hit['section_id']})\n{hit['text']}")
    return "\n\n".join(blocks)


def answer(question, hits):
    if not hits:
        return "I do not have any documents to answer that from."
    user = config.USER_PROMPT.format(
        context=build_context(hits), question=question
    )
    return chat(config.SYSTEM_PROMPT, user)


def answer_stream(question, hits, system_prompt=None):
    """Streaming form of `answer`, yielding ("thinking" | "content", text)."""
    if not hits:
        yield "content", "I do not have any documents to answer that from."
        return
    user = config.USER_PROMPT.format(
        context=build_context(hits), question=question
    )
    yield from chat_stream(system_prompt or config.SYSTEM_PROMPT, user)
