"""HTTP wrapper around the baseline pipeline.

    python rag/server.py          # serves on http://localhost:8000

The leaflet route uses the baseline retrieval pipeline. Department guidance
and uploads add separate prompts and guardrails; evaluate_chatbot.py measures
those live routes rather than reusing historical leaflet-only scores.

Routes are mounted under /api/chat - the same path Spring Boot will expose when
it fronts this service - so moving behind the backend later is a change of proxy
target only, with no edit to the React code.
"""

import json
import time

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

import config
import prompts
from errors import ModelError
from generate import answer as generate_answer
from generate import answer_stream
from guardrails import rejection_for
from llm import describe, embed
from retrieve import retrieve
from telemetry import estimate_tokens, generate_request_id, send_telemetry
from triage import ToolError, recommend
from uploaded import MAX_UPLOAD_BYTES, UploadError, extract_upload, retrieve_upload

MAX_QUESTION_CHARS = 500
UPLOAD_SYSTEM_PROMPT = prompts.UPLOAD_SYSTEM

app = FastAPI(title="Smart Healthcare RAG", version="0.1.0")

# The React dev server talks to us through Vite's proxy, so same-origin - these
# entries only matter when calling the service directly (curl, a second app,
# hitting :8000 from the browser while debugging).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "Authorization"],
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


def _check_question(question: str) -> None:
    rejection = rejection_for(question)
    if rejection:
        raise HTTPException(status_code=400, detail=rejection)


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
        "model": describe(),
        "prompt_versions": prompts.VERSIONS,
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
    _check_question(question)

    req_id = generate_request_id()
    started = time.time()
    try:
        hits = retrieve(question, k=config.TOP_K)
        text = generate_answer(question, hits)
        latency_ms = int((time.time() - started) * 1000)

        prompt_tokens = estimate_tokens(question) + sum(
            estimate_tokens(h.get("text", "")) for h in hits
        )
        completion_tokens = estimate_tokens(text)

        send_telemetry(
            feature="CHAT",
            request_id=req_id,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            latency_ms=latency_ms,
            status="SUCCESS",
        )
    except ModelError as exc:
        latency_ms = int((time.time() - started) * 1000)
        status = "TIMEOUT" if "timed out" in str(exc).lower() else "FAILED"
        err_code = "GATEWAY_TIMEOUT" if status == "TIMEOUT" else "MODEL_ERROR"
        send_telemetry(
            feature="CHAT",
            request_id=req_id,
            prompt_tokens=estimate_tokens(question),
            completion_tokens=0,
            latency_ms=latency_ms,
            status=status,
            error_code=err_code,
            error_message=str(exc),
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        latency_ms = int((time.time() - started) * 1000)
        send_telemetry(
            feature="CHAT",
            request_id=req_id,
            prompt_tokens=estimate_tokens(question),
            completion_tokens=0,
            latency_ms=latency_ms,
            status="FAILED",
            error_code="SERVER_ERROR",
            error_message=str(exc),
        )
        raise

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
    _check_question(question)
    return _triage_result(question, authorization[7:])


def _triage_result(question: str, token: str, uploaded_pages: list[dict] | None = None):
    req_id = generate_request_id()
    started = time.time()
    try:
        hits = retrieve(question, k=config.TOP_K)
        if uploaded_pages:
            hits = retrieve_upload(question, uploaded_pages) + hits
        decision, used_tools, department_name, doctor_name = recommend(question, hits, token)
        latency_ms = int((time.time() - started) * 1000)

        prompt_tokens = estimate_tokens(question) + sum(
            estimate_tokens(h.get("text", "")) for h in hits
        )
        completion_tokens = estimate_tokens(decision.reason) + estimate_tokens(
            decision.safety_message
        )

        send_telemetry(
            feature="TRIAGE",
            request_id=req_id,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            latency_ms=latency_ms,
            status="SUCCESS",
        )
    except ToolError as exc:
        latency_ms = int((time.time() - started) * 1000)
        send_telemetry(
            feature="TRIAGE",
            request_id=req_id,
            prompt_tokens=estimate_tokens(question),
            completion_tokens=0,
            latency_ms=latency_ms,
            status="FAILED",
            error_code="TOOL_ERROR",
            error_message=str(exc),
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except UploadError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ModelError as exc:
        latency_ms = int((time.time() - started) * 1000)
        status = "TIMEOUT" if "timed out" in str(exc).lower() else "FAILED"
        err_code = "GATEWAY_TIMEOUT" if status == "TIMEOUT" else "MODEL_ERROR"
        send_telemetry(
            feature="TRIAGE",
            request_id=req_id,
            prompt_tokens=estimate_tokens(question),
            completion_tokens=0,
            latency_ms=latency_ms,
            status=status,
            error_code=err_code,
            error_message=str(exc),
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        latency_ms = int((time.time() - started) * 1000)
        send_telemetry(
            feature="TRIAGE",
            request_id=req_id,
            prompt_tokens=estimate_tokens(question),
            completion_tokens=0,
            latency_ms=latency_ms,
            status="FAILED",
            error_code="SERVER_ERROR",
            error_message=str(exc),
        )
        raise

    return TriageResponse(
        **decision.model_dump(),
        department_name=department_name,
        doctor_name=doctor_name,
        sources=[
            Source(**source)
            for source in _source_payload(hits)
            if source["section"] in decision.source_ids
        ],
        tools_called=used_tools,
        elapsed_seconds=round(time.time() - started, 1),
    )


async def _read_uploaded_pages(file: UploadFile) -> list[dict]:
    try:
        data = await file.read(MAX_UPLOAD_BYTES + 1)
    finally:
        await file.close()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="The file must be 5 MB or smaller.")
    try:
        return await run_in_threadpool(extract_upload, data, file.filename)
    except UploadError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/chat/triage/upload", response_model=TriageResponse)
async def triage_upload(
    question: str = Form(min_length=1, max_length=MAX_QUESTION_CHARS),
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sign in to use department guidance.")
    if not question.strip():
        raise HTTPException(status_code=400, detail="Question is empty.")
    _check_question(question.strip())
    pages = await _read_uploaded_pages(file)
    return await run_in_threadpool(_triage_result, question.strip(), authorization[7:], pages)


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
    _check_question(question)

    return _stream_response(question)


def _stream_response(question: str, uploaded_pages: list[dict] | None = None):
    req_id = generate_request_id()

    def events():
        started = time.time()
        prompt_tokens = estimate_tokens(question)
        completion_parts = []
        try:
            hits = retrieve(question, k=config.TOP_K)
            if uploaded_pages:
                hits = retrieve_upload(question, uploaded_pages) + hits
            prompt_tokens += sum(estimate_tokens(h.get("text", "")) for h in hits)
            # Sources go out before generation starts, so the reader can see
            # what was found during the wait.
            yield json.dumps({"type": "sources", "sources": _source_payload(hits)}) + "\n"
            system_prompt = UPLOAD_SYSTEM_PROMPT if uploaded_pages else None
            for kind, text in answer_stream(question, hits, system_prompt):
                event = "thinking" if kind == "thinking" else "token"
                if kind != "thinking":
                    completion_parts.append(text)
                yield json.dumps({"type": event, "delta": text}) + "\n"
        except (ModelError, UploadError) as exc:
            latency_ms = int((time.time() - started) * 1000)
            status = "TIMEOUT" if "timed out" in str(exc).lower() else "FAILED"
            err_code = "GATEWAY_TIMEOUT" if status == "TIMEOUT" else "MODEL_ERROR"
            send_telemetry(
                feature="STREAM",
                request_id=req_id,
                prompt_tokens=prompt_tokens,
                completion_tokens=estimate_tokens("".join(completion_parts)),
                latency_ms=latency_ms,
                status=status,
                error_code=err_code,
                error_message=str(exc),
            )
            # The stream has already started with a 200, so an error has to be
            # delivered in-band rather than as a status code.
            message = (str(exc) if isinstance(exc, UploadError)
                       else "The assistant could not produce a usable answer. Please try again.")
            yield json.dumps({"type": "error", "message": message}) + "\n"
            return
        except Exception as exc:
            latency_ms = int((time.time() - started) * 1000)
            send_telemetry(
                feature="STREAM",
                request_id=req_id,
                prompt_tokens=prompt_tokens,
                completion_tokens=estimate_tokens("".join(completion_parts)),
                latency_ms=latency_ms,
                status="FAILED",
                error_code="STREAM_ERROR",
                error_message=str(exc),
            )
            yield json.dumps({"type": "error", "message": "The assistant hit an unexpected error. Please try again."}) + "\n"
            return

        latency_ms = int((time.time() - started) * 1000)
        completion_tokens = estimate_tokens("".join(completion_parts))
        send_telemetry(
            feature="STREAM",
            request_id=req_id,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            latency_ms=latency_ms,
            status="SUCCESS",
        )
        yield json.dumps(
            {"type": "done", "elapsed_seconds": round(time.time() - started, 1)}
        ) + "\n"

    return StreamingResponse(events(), media_type="application/x-ndjson")


@app.post("/api/chat/upload/stream")
async def chat_upload_stream(
    question: str = Form(min_length=1, max_length=MAX_QUESTION_CHARS),
    file: UploadFile = File(...),
):
    if not question.strip():
        raise HTTPException(status_code=400, detail="Question is empty.")
    _check_question(question.strip())
    pages = await _read_uploaded_pages(file)
    return _stream_response(question.strip(), pages)


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
