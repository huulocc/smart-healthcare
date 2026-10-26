"""Versioned prompts shared by the leaflet, upload, and triage flows."""

from pathlib import Path
import json

PROMPT_DIR = Path(__file__).resolve().parent / "prompts"
VERSIONS = {
    "leaflet_system": "v2",
    "leaflet_user": "v1",
    "tool_call": "v1",
    "tool_tasks": "v1",
    "triage": "v1",
    "upload_appendix": "v1",
}


def load_prompt(name: str) -> str:
    version = VERSIONS[name]
    return (PROMPT_DIR / f"{name}_{version}.txt").read_text(encoding="utf-8").strip()


LEAFLET_SYSTEM = load_prompt("leaflet_system")
LEAFLET_USER = load_prompt("leaflet_user")
TOOL_CALL = load_prompt("tool_call")
TOOL_TASKS = json.loads(load_prompt("tool_tasks"))
TRIAGE = load_prompt("triage")
UPLOAD_SYSTEM = LEAFLET_SYSTEM + "\n" + load_prompt("upload_appendix")
