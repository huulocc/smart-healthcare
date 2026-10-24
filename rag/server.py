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

import json
import time

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

import config
from errors import ModelError
from generate import answer as generate_answer
from generate import answer_stream
from llm import describe, embed
from retrieve import retrieve
from triage import ToolError, recommend

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


class TriageResponse(BaseModel):
    urgency: str
    department_id: int | None
    department_name: str | None
    doctor_id: int | None
    doctor_name: str | None
    reason: str
    safety_message: str
    source_ids: list[str]
    sources: list[Source]
    tools_called: list[str]
    elapsed_seconds: float


@app.get("/api/chat/health")
def health():
    """Report whether the two things that can realistically be down are up.

    The widget uses this to explain an outage instead of just failing to send.
    """
    status = {
        "index": False,
        "ollama": False,
        "chunks": 0,
        "backend": config.LLM_BACKEND,
        "embed_backend": config.EMBED_BACKEND,
    }
    try:
        from retrieve import _collection

        status["chunks"] = _collection().count()
        status["index"] = status["chunks"] > 0
    except Exception:
        pass
    try:
        embed(["health check"], is_query=True)
        # Kept as "ollama" for the widget's sake - it is really "the model
        # backend answered", whichever one is configured. Renaming it would
        # break AIChatWidget's health check for no gain.
        status["ollama"] = True
    except ModelError:
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
    except ModelError as exc:
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


def _source_payload(hits):
    return [
        {
            "section": hit["section_id"],
            "heading": hit["heading"],
            "pages": hit["pages"],
            "document": hit["source"],
            "score": round(hit["score"], 3),
        }
        for hit in hits
    ]


@app.post("/api/chat/triage", response_model=TriageResponse)
def triage(request: ChatRequest, authorization: str | None = Header(default=None)):
    """Symptom-to-department recommendation using live, authenticated clinic data."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sign in to use department guidance.")
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is empty.")
    started = time.time()
    try:
        hits = retrieve(question, k=config.TOP_K)
        decision, used_tools, department_name, doctor_name = recommend(question, hits, authorization[7:])
    except ToolError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ModelError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return TriageResponse(
        **decision.model_dump(),
        department_name=department_name,
        doctor_name=doctor_name,
        sources=[Source(**source) for source in _source_payload(hits)
                 if source["section"] in decision.source_ids],
        tools_called=used_tools,
        elapsed_seconds=round(time.time() - started, 1),
    )


@app.post("/api/chat/stream")
def chat_stream_endpoint(request: ChatRequest):
    """Same answer as POST /api/chat, delivered as it is produced.

    Newline-delimited JSON rather than SSE, because the browser cannot send a
    POST body with EventSource and the client reads this with fetch anyway.

    Event types: sources, thinking, token, done, error. Reasoning is sent as
    `thinking` so the widget can show progress during the long pause before the
    first answer token - it is a progress signal, not something to present as
    the answer.
    """
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is empty.")

    def events():
        started = time.time()
        try:
            hits = retrieve(question, k=config.TOP_K)
            # Sources go out before generation starts, so the reader can see
            # what was found during the wait.
            yield json.dumps({"type": "sources", "sources": _source_payload(hits)}) + "\n"
            for kind, text in answer_stream(question, hits):
                event = "thinking" if kind == "thinking" else "token"
                yield json.dumps({"type": event, "delta": text}) + "\n"
        except ModelError as exc:
            # The stream has already started with a 200, so an error has to be
            # delivered in-band rather than as a status code.
            yield json.dumps({"type": "error", "message": str(exc)}) + "\n"
            return
        yield json.dumps(
            {"type": "done", "elapsed_seconds": round(time.time() - started, 1)}
        ) + "\n"

    return StreamingResponse(events(), media_type="application/x-ndjson")


if __name__ == "__main__":
    import argparse

    import uvicorn

    parser = argparse.ArgumentParser(description="Serve the RAG baseline.")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    print(f"{describe()} top_k={config.TOP_K}")
    if config.LLM_THINK and config.LLM_BACKEND == "ollama":
        print("note: think=True is slow on /api/chat; the widget uses /api/chat/stream.")
    uvicorn.run(app, host="127.0.0.1", port=args.port)
