# Clinic chatbot evaluation

`chatbot_cases.json` contains 25 synthetic cases for the app's actual flows:
leaflet answers with sources, symptom-to-department guidance backed by clinic
tools, file upload, prompt injection, unrelated requests, and unsafe actions.
The evaluator calls the same HTTP routes used by the React widget. It does not
mock the LLM, vector store, or Spring Boot. The older `evaluate.py` remains the
leaflet retrieval benchmark; its recall numbers do not measure triage quality.

Run the services and document index, then set a **patient** JWT in
`RAG_EVAL_TOKEN` locally. The script does not save the token. Validate the cases
or run the complete evaluation from the repository root:

```powershell
python rag/evaluate_chatbot.py --validate
$env:RAG_EVAL_TOKEN = '<signed-in patient JWT>'
python rag/evaluate_chatbot.py --label before --output rag/eval/results/chatbot-before.json
```

After a prompt, model, or retrieval change, run the same cases against the
updated app and compare results:

```powershell
python rag/evaluate_chatbot.py --label after --compare rag/eval/results/chatbot-before.json --output rag/eval/results/chatbot-after.json
```

For the guardrail change in this branch, `881dd8a` is the before revision.
Run its services in a separate checkout while executing this evaluator from
the updated checkout, then switch the service to the updated revision for the
after run. Both runs need the same clinic seed data and model configuration.

The script checks service readiness and token access before it records a pass
rate. A report records model settings, prompt versions, each outcome, total
pass rate, and improvements/regressions when compared with an earlier report.
The case-set hash must match so changing expected results cannot appear to
improve a score. The before/after run must use the same clinic seed data and
model settings except for the change being measured.

Automatic assertions check sources, department names, urgency, tool use,
refusal text, and known forbidden claims. A clinician or project reviewer
should read the saved synthetic answers for medical safety and grounding before
presenting the result. Unit tests (`python -m unittest discover -s rag -p
'test_*.py'`) cover deterministic contract checks such as invalid JSON, empty
answers, upload limits, and telemetry authentication. They are not an LLM
quality pass rate.
