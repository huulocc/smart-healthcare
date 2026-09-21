"""HTTP wrapper around the baseline pipeline.

    python rag/server.py          # serves on http://localhost:8000

Deliberately thin. It owns no retrieval or prompting logic of its own and calls
the same `retrieve` / `answer` functions that evaluate.py scores, so what gets
served is exactly what was measured. Any behaviour change belongs in config.py,
where it will show up in the next evaluation run.

Routes are mounted under /api/chat - the same path Spring Boot will expose when
it fronts this service - so moving behind the backend later is a change of proxy
target only, with no edit to the React code.
"""

import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import config
from generate import answer as generate_answer
from ollama_api import OllamaError, embed
from retrieve import retrieve

MAX_QUESTION_CHARS = 500

app = FastAPI(title="Smart Healthcare RAG", version="0.1.0")

# The React dev server talks to us through Vite's proxy, so same-origin - these
# entries only matter when calling the service directly (curl, a second app,
# hitting :8000 from the browser while debugging).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=MAX_QUESTION_CHARS)


class Source(BaseModel):
    section: str
    heading: str
    pages: str
    document: str
    score: float


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]
    elapsed_seconds: float


@app.get("/api/chat/health")
def health():
    """Report whether the two things that can realistically be down are up.

    The widget uses this to explain an outage instead of just failing to send.
    """
    status = {"index": False, "ollama": False, "chunks": 0}
    try:
        from retrieve import _collection

        status["chunks"] = _collection().count()
        status["index"] = status["chunks"] > 0
    except Exception:
        pass
    try:
        embed(["health check"], is_query=True)
        status["ollama"] = True
    except OllamaError:
        pass
    status["ready"] = status["index"] and status["ollama"]
    return status


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is empty.")

    started = time.time()
    try:
        hits = retrieve(question, k=config.TOP_K)
        text = generate_answer(question, hits)
    except OllamaError as exc:
        # The model backend being down is an operational problem, not a bad
        # request - 503 so the widget can say so rather than blaming the user.
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return ChatResponse(
        answer=text,
        sources=[
            Source(
                section=hit["section_id"],
                heading=hit["heading"],
                pages=hit["pages"],
                document=hit["source"],
                score=round(hit["score"], 3),
            )
            for hit in hits
        ],
        elapsed_seconds=round(time.time() - started, 1),
    )


if __name__ == "__main__":
    import uvicorn

    print(f"model={config.LLM_MODEL} think={config.LLM_THINK} top_k={config.TOP_K}")
    if config.LLM_THINK:
        print("note: think=True answers take ~30-50s each. See README 'Hillclimb log'.")
    uvicorn.run(app, host="127.0.0.1", port=8000)
