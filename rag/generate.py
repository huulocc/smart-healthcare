"""Phase B, step 2 - assemble the prompt and generate the answer.

The LLM is reached only through `ollama_api.chat`, so swapping the model (or
the whole backend) means touching config.py and that one function, not this
file's logic.
"""

import config
from ollama_api import chat


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
