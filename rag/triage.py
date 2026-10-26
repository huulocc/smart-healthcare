"""Read-only tool agent and validated department recommendation.

The model requests each tool by name with JSON arguments. Only allowlisted
functions run; the bearer token is used solely for Spring requests and is never
included in a model prompt. No appointment or other data is changed here.
"""

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

import prompts
from errors import ModelError
from generate import build_context
from llm import chat

BACKEND_URL = os.environ.get("RAG_APP_BACKEND_URL", "http://127.0.0.1:8080").rstrip("/")


class ToolError(RuntimeError):
    pass


class ToolCall(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tool: Literal["list_departments", "search_doctors", "get_availability"]
    arguments: dict = Field(default_factory=dict)


class TriageDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    urgency: Literal["routine", "soon", "emergency", "uncertain"]
    department_id: int | None
    doctor_id: int | None
    reason: str = Field(min_length=1, max_length=500)
    safety_message: str = Field(min_length=1, max_length=500)
    source_ids: list[str]


def _json_object(raw: str) -> dict:
    """Accept a plain JSON object or a fenced JSON object, nothing else."""
    raw = raw.strip()
    if raw.startswith("```json"):
        raw = raw[7:].strip()
        if raw.endswith("```"):
            raw = raw[:-3].strip()
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ModelError("The assistant returned invalid JSON.") from exc
    if not isinstance(value, dict):
        raise ModelError("The assistant must return a JSON object.")
    return value


def _get(path: str, token: str, params: dict | None = None) -> dict | list:
    query = "?" + urllib.parse.urlencode(params) if params else ""
    request = urllib.request.Request(
        BACKEND_URL + path + query,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403):
            raise ToolError("Sign in with an account allowed to view clinic data.") from exc
        raise ToolError("Clinic data is temporarily unavailable.") from exc
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        raise ToolError("Clinic data is temporarily unavailable.") from exc


def list_departments(token: str) -> list[dict]:
    data = _get("/api/booking/departments", token)
    if not isinstance(data, list):
        raise ToolError("The clinic returned an invalid department list.")
    return data


def search_doctors(token: str, department_id: int | None) -> list[dict]:
    params = {"size": 50}
    if department_id is not None:
        params["departmentId"] = department_id
    data = _get("/api/booking/doctors", token, params)
    if not isinstance(data, dict) or not isinstance(data.get("content"), list):
        raise ToolError("The clinic returned an invalid doctor list.")
    return data["content"]


def get_availability(token: str, doctor_id: int) -> dict:
    data = _get(f"/api/booking/doctors/{doctor_id}/availability", token)
    if not isinstance(data, dict) or not isinstance(data.get("slots"), list):
        raise ToolError("The clinic returned invalid availability.")
    return {"doctor_id": doctor_id, "timezone": data.get("timezone"), "slots": data["slots"][:5]}


def _call_model(system: str, payload: dict) -> dict:
    return _json_object(chat(system, json.dumps(payload, ensure_ascii=False)))


def _request_tool(expected: str, payload: dict) -> dict:
    try:
        call = ToolCall.model_validate(_call_model(prompts.TOOL_CALL, payload))
    except ValidationError as exc:
        raise ModelError("The assistant returned an invalid tool call.") from exc
    if call.tool != expected:
        raise ModelError("The assistant requested an unexpected tool.")
    return call.arguments


def recommend(question: str, hits: list[dict], token: str) -> tuple[TriageDecision, list[str], str | None, str | None]:
    """Three model-requested, read-only clinic tools followed by schema validation."""
    used_tools: list[str] = []
    args = _request_tool("list_departments", {
        "task": prompts.TOOL_TASKS["list_departments"], "patient_text": question,
        "tool_schema": {"tool": "list_departments", "arguments": {}},
    })
    if args:
        raise ModelError("list_departments accepts no arguments.")
    departments = list_departments(token)
    used_tools.append("list_departments")
    active_ids = {item["id"] for item in departments}

    args = _request_tool("search_doctors", {
        "task": prompts.TOOL_TASKS["search_doctors"],
        "patient_text": question,
        "leaflet_context": build_context(hits),
        "departments": departments,
        "tool_schema": {"tool": "search_doctors", "arguments": {"department_id": "integer or null"}},
    })
    if set(args) != {"department_id"}:
        raise ModelError("search_doctors requires department_id.")
    department_id = args["department_id"]
    if department_id is not None and (type(department_id) is not int or department_id not in active_ids):
        raise ModelError("The assistant selected an unknown department.")
    doctors = search_doctors(token, department_id)
    used_tools.append("search_doctors")
    doctor_ids = {item["id"] for item in doctors}

    availability = None
    if doctors:
        args = _request_tool("get_availability", {
            "task": prompts.TOOL_TASKS["get_availability"],
            "doctors": doctors,
            "tool_schema": {"tool": "get_availability", "arguments": {"doctor_id": "integer"}},
        })
        if set(args) != {"doctor_id"} or type(args["doctor_id"]) is not int or args["doctor_id"] not in doctor_ids:
            raise ModelError("The assistant selected an unknown doctor.")
        availability = get_availability(token, args["doctor_id"])
        used_tools.append("get_availability")

    payload = {
        "patient_text": question, "leaflet_context": build_context(hits),
        "departments": departments, "doctors": doctors,
        "availability": availability,
    }
    try:
        decision = TriageDecision.model_validate(_call_model(prompts.TRIAGE, payload))
    except ValidationError as exc:
        raise ModelError("The assistant returned an invalid recommendation.") from exc
    if decision.department_id is not None and decision.department_id not in active_ids:
        raise ModelError("The recommendation names an unknown department.")
    if decision.doctor_id is not None and decision.doctor_id not in doctor_ids:
        raise ModelError("The recommendation names an unknown doctor.")
    selected_doctor = next((item for item in doctors if item["id"] == decision.doctor_id), None)
    if selected_doctor and selected_doctor.get("departmentId") != decision.department_id:
        raise ModelError("The recommended doctor does not belong to the recommended department.")
    allowed_sources = {hit["section_id"] for hit in hits}
    if not set(decision.source_ids).issubset(allowed_sources):
        raise ModelError("The recommendation cites an unknown source.")
    if decision.urgency in ("routine", "soon") and decision.department_id is None:
        raise ModelError("The recommendation has no department.")
    if decision.urgency in ("emergency", "uncertain"):
        decision = decision.model_copy(update={"department_id": None, "doctor_id": None})
        selected_doctor = None
    if selected_doctor and availability and not availability["slots"]:
        decision = decision.model_copy(update={"doctor_id": None})
        selected_doctor = None
    department_name = next((item["name"] for item in departments if item["id"] == decision.department_id), None)
    doctor_name = selected_doctor.get("name") if selected_doctor else None
    return decision, used_tools, department_name, doctor_name
