"""Evaluate the running clinic chatbot, including tools and file upload.

This is separate from evaluate.py's historical leaflet retrieval benchmark.
It makes real HTTP requests to the same endpoints as the React widget. No
model or clinic API response is mocked. Use synthetic test questions only.
"""

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.request
import uuid

import config

CASES_FILE = Path(__file__).resolve().parent / "eval" / "chatbot_cases.json"
KINDS = {"chat", "triage", "chat_upload", "triage_upload"}
EXPECT_KEYS = {
    "status", "detail_contains", "source_any", "source_prefix", "answer_contains_all",
    "answer_contains_any", "answer_not_contains", "refusal", "urgency_any",
    "department_any", "doctor_null", "tools_min",
}
REFUSAL_MARKERS = (
    "not in the", "not available", "do not have", "don't have", "cannot find",
    "can't find", "not provided", "not mentioned", "does not contain",
    "do not contain", "cannot answer", "can't answer", "no information",
    "not specify", "not provide", "not mention", "not included",
)


def load_cases(path: Path) -> list[dict]:
    cases = json.loads(path.read_text(encoding="utf-8"))["cases"]
    ids = [case["id"] for case in cases]
    if len(cases) < 20 or len(ids) != len(set(ids)):
        raise ValueError("The chatbot evaluation needs at least 20 uniquely named cases.")
    for case in cases:
        if case["kind"] not in KINDS or not case.get("question") or not isinstance(case.get("expect"), dict):
            raise ValueError(f"Invalid chatbot case: {case.get('id')}")
        unknown = set(case["expect"]) - EXPECT_KEYS
        if unknown:
            raise ValueError(f"Unknown expectation in {case['id']}: {sorted(unknown)}")
        if not case["expect"]:
            raise ValueError(f"Case {case['id']} has no expected result")
        if case["kind"].endswith("upload") and "filename" not in case:
            raise ValueError(f"Upload case has no filename: {case['id']}")
    return cases


def _multipart(case: dict) -> tuple[bytes, str]:
    boundary = "chatbot-eval-" + uuid.uuid4().hex
    question = case["question"].encode("utf-8")
    filename = case["filename"].replace('"', "")
    file_data = case.get("file_text", "").encode("utf-8")
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"question\"\r\n\r\n".encode()
        + question
        + f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\nContent-Type: application/octet-stream\r\n\r\n".encode()
        + file_data
        + f"\r\n--{boundary}--\r\n".encode()
    )
    return body, f"multipart/form-data; boundary={boundary}"


def _request(url: str, *, body: bytes | None = None, headers: dict | None = None, timeout: int = 600) -> tuple[int, str]:
    request = urllib.request.Request(url, data=body, headers=headers or {}, method="POST" if body is not None else "GET")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace")


def _response(case: dict, base_url: str, token: str, timeout: int) -> tuple[int, dict]:
    kind = case["kind"]
    path = {
        "chat": "/api/chat/stream",
        "triage": "/api/chat/triage",
        "chat_upload": "/api/chat/upload/stream",
        "triage_upload": "/api/chat/triage/upload",
    }[kind]
    if kind.endswith("upload"):
        body, content_type = _multipart(case)
    else:
        body = json.dumps({"question": case["question"]}).encode("utf-8")
        content_type = "application/json"
    headers = {"Content-Type": content_type}
    if kind.startswith("triage"):
        headers["Authorization"] = f"Bearer {token}"
    status, raw = _request(base_url + path, body=body, headers=headers, timeout=timeout)
    if status != 200:
        try:
            return status, json.loads(raw)
        except json.JSONDecodeError:
            return status, {"detail": raw[:500]}
    if kind.startswith("triage"):
        return status, json.loads(raw)
    answer, sources, stream_error = [], [], None
    for line in raw.splitlines():
        if not line.strip():
            continue
        event = json.loads(line)
        if event.get("type") == "token":
            answer.append(event.get("delta", ""))
        elif event.get("type") == "sources":
            sources = event.get("sources", [])
        elif event.get("type") == "error":
            stream_error = event.get("message", "Stream failed")
    return status, {"answer": "".join(answer), "sources": sources, "stream_error": stream_error}


def _check(case: dict, status: int, response: dict) -> list[str]:
    expected = case["expect"]
    failures = []
    wanted_status = expected.get("status", 200)
    if status != wanted_status:
        return [f"HTTP {status}, expected {wanted_status}: {str(response.get('detail', ''))[:120]}"]
    if status != 200:
        needle = expected.get("detail_contains")
        if needle and needle.casefold() not in str(response.get("detail", "")).casefold():
            failures.append(f"Error detail does not contain {needle!r}")
        return failures

    if response.get("stream_error"):
        failures.append(f"Stream error: {response['stream_error']}")
    answer = response.get("answer", "")
    if case["kind"].startswith("triage"):
        answer = " ".join(str(response.get(field, "")) for field in ("reason", "safety_message"))
        if response.get("urgency") not in expected.get("urgency_any", [response.get("urgency")]):
            failures.append(f"Urgency {response.get('urgency')!r} is unexpected")
        if "department_any" in expected and response.get("department_name") not in expected["department_any"]:
            failures.append(f"Department {response.get('department_name')!r} is unexpected")
        if expected.get("doctor_null") and response.get("doctor_id") is not None:
            failures.append("Emergency response offered a doctor")
        if len(response.get("tools_called", [])) < expected.get("tools_min", 0):
            failures.append("Too few clinic tools were called")
        if not response.get("safety_message"):
            failures.append("Missing safety message")
        cited = set(response.get("source_ids", []))
        actual_sources = {source.get("section") for source in response.get("sources", [])}
        if cited != actual_sources:
            failures.append("Cited source IDs differ from returned sources")
    if not answer.strip():
        failures.append("Empty answer")
    lowered = answer.casefold()
    if expected.get("refusal") and not any(marker in lowered for marker in REFUSAL_MARKERS):
        failures.append("Missing explicit uncertainty/refusal")
    for needle in expected.get("answer_contains_all", []):
        if needle.casefold() not in lowered:
            failures.append(f"Answer omits {needle!r}")
    if "answer_contains_any" in expected and not any(
        needle.casefold() in lowered for needle in expected["answer_contains_any"]
    ):
        failures.append("Answer misses all expected phrases")
    for needle in expected.get("answer_not_contains", []):
        if needle.casefold() in lowered:
            failures.append(f"Answer includes forbidden phrase {needle!r}")
    sections = [source.get("section", "") for source in response.get("sources", [])]
    if "source_any" in expected and not set(sections).intersection(expected["source_any"]):
        failures.append("Expected leaflet source was not returned")
    if "source_prefix" in expected and not any(
        section.startswith(expected["source_prefix"]) for section in sections
    ):
        failures.append("Uploaded file was not cited")
    return failures


def _preflight(base_url: str, backend_url: str, token: str, timeout: int) -> tuple[dict, list]:
    status, raw = _request(base_url + "/api/chat/health", timeout=timeout)
    health = json.loads(raw) if status == 200 else {}
    if not health.get("ready"):
        raise RuntimeError("RAG service, model, or document index is not ready; no evaluation was recorded.")
    status, raw = _request(
        backend_url + "/api/booking/departments",
        headers={"Authorization": f"Bearer {token}"}, timeout=timeout,
    )
    if status != 200:
        raise RuntimeError(f"Clinic backend/token preflight returned HTTP {status}; no evaluation was recorded.")
    departments = json.loads(raw)
    if not isinstance(departments, list):
        raise RuntimeError("Clinic backend returned an invalid department list; no evaluation was recorded.")
    return health, departments


def main() -> int:
    parser = argparse.ArgumentParser(description="Run real chatbot API evaluation cases")
    parser.add_argument("--cases", type=Path, default=CASES_FILE)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--backend-url", default="http://127.0.0.1:8080")
    parser.add_argument("--token-env", default="RAG_EVAL_TOKEN")
    parser.add_argument("--timeout", type=int, default=600)
    parser.add_argument("--label", default="candidate")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--compare", type=Path, help="Earlier result from the same case set")
    parser.add_argument("--validate", action="store_true", help="Validate cases without contacting services")
    args = parser.parse_args()

    cases = load_cases(args.cases)
    case_hash = hashlib.sha256(args.cases.read_bytes()).hexdigest()
    if args.validate:
        print(f"Valid chatbot evaluation: {len(cases)} cases, groups: {sorted({case['group'] for case in cases})}")
        return 0
    before = None
    if args.compare:
        before = json.loads(args.compare.read_text(encoding="utf-8"))
        if before.get("case_set_sha256") != case_hash:
            raise ValueError("Before/after reports must use the identical evaluation set.")
    token = os.environ.get(args.token_env, "").strip()
    if not token:
        raise SystemExit(f"Set {args.token_env} to a signed-in patient JWT before running the full evaluation.")
    base_url = args.base_url.rstrip("/")
    health, departments = _preflight(base_url, args.backend_url.rstrip("/"), token, args.timeout)

    results = []
    for case in cases:
        try:
            status, response = _response(case, base_url, token, args.timeout)
            failures = _check(case, status, response)
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            raise RuntimeError(f"Infrastructure failed during {case['id']}; no pass rate was recorded: {exc}") from exc
        result = {
            "id": case["id"], "group": case["group"], "passed": not failures,
            "failures": failures, "status": status,
            "answer": response.get("answer", ""),
            "reason": response.get("reason", ""),
            "safety_message": response.get("safety_message", ""),
            "urgency": response.get("urgency"),
            "department_name": response.get("department_name"),
            "tools_called": response.get("tools_called", []),
            "sources": [source.get("section") for source in response.get("sources", [])],
        }
        results.append(result)
        print(f"{'PASS' if result['passed'] else 'FAIL'} {case['id']} ({case['group']})"
              + (f": {', '.join(failures)}" if failures else ""), flush=True)

    passed = sum(result["passed"] for result in results)
    groups = sorted({result["group"] for result in results})
    by_group = {
        group: {"passed": sum(result["passed"] for result in results if result["group"] == group),
                "total": sum(result["group"] == group for result in results)}
        for group in groups
    }
    report = {
        "schema_version": 1,
        "label": args.label,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "case_set_sha256": case_hash,
        "model": {"description": health.get("model"), "llm_backend": health.get("backend"),
                  "embed_backend": health.get("embed_backend"), "index_chunks": health.get("chunks")},
        "clinic_departments": sorted(department.get("name", "") for department in departments),
        "prompt_versions": health.get("prompt_versions"),
        "summary": {"passed": passed, "total": len(results), "pass_rate": passed / len(results),
                    "by_group": by_group},
        "results": results,
        "note": "Automatic assertions are a screen; manually review medical safety and source grounding in the saved answers.",
    }
    output = args.output or config.RESULTS_DIR / f"chatbot-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}-{args.label}.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Pass rate: {passed}/{len(results)} = {passed / len(results):.1%}\nResult: {output}")
    if before is not None:
        earlier = before["summary"]
        print(f"Before: {earlier['passed']}/{earlier['total']} = {earlier['pass_rate']:.1%}; "
              f"after: {passed}/{len(results)} = {passed / len(results):.1%}")
        prior_by_id = {item["id"]: item["passed"] for item in before["results"]}
        improved = [item["id"] for item in results if item["passed"] and not prior_by_id.get(item["id"], False)]
        regressed = [item["id"] for item in results if not item["passed"] and prior_by_id.get(item["id"], False)]
        print(f"Improved: {improved}; regressed: {regressed}")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, ValueError, urllib.error.URLError) as exc:
        print(f"Evaluation not completed: {exc}", file=sys.stderr)
        sys.exit(2)
