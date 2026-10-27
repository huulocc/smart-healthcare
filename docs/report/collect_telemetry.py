"""Snapshot real AI telemetry out of SQL Server into a JSON summary.

Run this once after an evaluation run; build_report.py then reads the JSON, so
rebuilding the PDF never needs database credentials.

The seeded demo rows from backend/sqlserver/admin/002_admin_features.sql are
excluded by request_id: they carry hand-written token counts and costs and
would turn a measurement into a fabrication.

    python docs/report/collect_telemetry.py
"""
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "rag" / "eval" / "results" / "telemetry-summary.json"

# Seeded rows look like REQ-AI-20261023-001; real ones are REQ-AI-<16 hex>.
SEEDED = "REQ-AI-20261023-%' OR request_id LIKE 'REQ-AI-20261022-%' OR " \
         "request_id LIKE 'REQ-AI-20261021-%' OR request_id LIKE 'REQ-AI-20261020-%"
REAL_ONLY = (
    "status <> 'SEED' "
    f"AND NOT (request_id LIKE '{SEEDED}') "
    "AND request_id <> 'REQ-AI-PROBE0001'"
)

QUERY = f"""
SET NOCOUNT ON;
SELECT provider, model, feature,
       COUNT(*)                AS n,
       MIN(latency_ms)         AS min_ms,
       MAX(latency_ms)         AS max_ms,
       AVG(CAST(latency_ms AS bigint)) AS avg_ms,
       SUM(CAST(prompt_tokens AS bigint))     AS prompt_tokens,
       SUM(CAST(completion_tokens AS bigint)) AS completion_tokens,
       SUM(CAST(estimated_cost AS float))     AS cost,
       SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) AS ok
FROM ai_usage_events
WHERE {REAL_ONLY}
GROUP BY provider, model, feature
ORDER BY n DESC;
"""


def env(path, key):
    if not path.exists():
        return None
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip().startswith(key + "="):
            return line.strip().split("=", 1)[1]
    return None


def find_sqlcmd():
    found = shutil.which("sqlcmd")
    if found:
        return found
    for base in Path("C:/Program Files/Microsoft SQL Server").glob(
            "Client SDK/ODBC/*/Tools/Binn/sqlcmd.exe"):
        return str(base)
    return None


def main():
    backend_env = ROOT / "backend" / ".env"
    user = env(backend_env, "DB_USERNAME") or "sa"
    password = env(backend_env, "DB_PASSWORD")
    database = env(backend_env, "DB_NAME") or "SmartHealthcareDB"
    if not password:
        sys.exit("DB_PASSWORD not found in backend/.env")

    sqlcmd = find_sqlcmd()
    if not sqlcmd:
        sys.exit("sqlcmd not found")

    proc = subprocess.run(
        [sqlcmd, "-S", "localhost,1433", "-d", database, "-U", user, "-P", password,
         "-C", "-h", "-1", "-W", "-s", "|", "-Q", QUERY],
        capture_output=True, text=True)
    if proc.returncode != 0:
        sys.exit(proc.stdout + proc.stderr)

    rows = []
    for line in proc.stdout.splitlines():
        parts = [p.strip() for p in line.split("|")]
        if len(parts) != 11 or not parts[3].isdigit():
            continue
        rows.append({
            "provider": parts[0], "model": parts[1], "feature": parts[2],
            "n": int(parts[3]), "min_ms": int(parts[4]), "max_ms": int(parts[5]),
            "avg_ms": int(parts[6]), "prompt_tokens": int(parts[7]),
            "completion_tokens": int(parts[8]), "cost_usd": float(parts[9]),
            "ok": int(parts[10]),
        })
    if not rows:
        sys.exit("no real telemetry rows found - was the run made with the "
                 "telemetry secret configured on both sides?")

    total = {
        "events": sum(r["n"] for r in rows),
        "ok": sum(r["ok"] for r in rows),
        "prompt_tokens": sum(r["prompt_tokens"] for r in rows),
        "completion_tokens": sum(r["completion_tokens"] for r in rows),
        "cost_usd": round(sum(r["cost_usd"] for r in rows), 6),
    }
    OUT.write_text(json.dumps(
        {"note": "Chi cac su kien do that. Da loai 14 dong seed cua "
                 "002_admin_features.sql va mui thu REQ-AI-PROBE0001.",
         "rows": rows, "total": total},
        ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {total['events']} events")


if __name__ == "__main__":
    main()
