# Smart Healthcare

An appointment-booking application for a clinic, with an AI assistant that
answers from patient-information leaflets and suggests a department from
described symptoms.

Final project for **New Technologies in Software Engineering 2026–2027**.

| | |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite |
| **Backend** | Spring Boot 4.1 · Java 21 · Spring Security + JWT · OAuth2 Google |
| **Database** | SQL Server |
| **AI assistant** | FastAPI · ChromaDB · Ollama or Google Gemini |

Architecture diagram and the data flow of one AI request:
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## AI capabilities implemented

Section 4.1 of the brief asks a team of three for at least three of them. This
team implemented **A, B and C**:

| | Capability | Where |
|---|---|---|
| **A** | RAG over documents: chunking, embedding, vector search, answers with cited sources, and saying plainly when the documents do not contain the answer | `rag/ingest.py`, `rag/retrieve.py`, `rag/generate.py` |
| **B** | Tool-calling agent: the model requests three **read-only** tools that fetch real data from Spring Boot | `rag/triage.py` |
| **C** | Structured output: the result is JSON validated against a Pydantic schema, and the application uses it to block six ways the model could make things up | `rag/triage.py` — `TriageDecision` |

Capability **D** is deliberately not claimed. File upload works —
`rag/uploaded.py` extracts text from a PDF or TXT, embeds it, uses it for that
one question and then forgets it — but because nothing is written to disk or to
the database it does not satisfy *"the result is stored and used by the app"*.

---

## What you need on the machine

| | Version | Notes |
|---|---|---|
| **JDK** | 21 | |
| **Node.js** | 20 or newer | |
| **Python** | 3.11 or newer | tested on 3.12 |
| **SQL Server** | 2019 or newer | the Developer edition is enough |
| **Ollama** | latest | skip if you use Gemini |

This project has **no Docker**. The reasoning and what it costs:
[`docs/adr/0001`](docs/adr/0001-use-sql-server.md).

---

## How to run

Run every command **from the repository root** unless stated otherwise. The
commands are written for PowerShell on Windows; on macOS or Linux replace
`.\mvnw.cmd` with `./mvnw`.

### 1. SQL Server

Three things have to be enabled on the instance, and **none of them is on by
default** in the Developer installation:

- **TCP/IP** — Configuration Manager → Protocols for *\<INSTANCE\>* → TCP/IP =
  Enabled. Without it SSMS and `sqlcmd` still connect but the backend does not,
  because the JDBC driver only speaks TCP.
- **SQL Server Authentication** — mixed mode, not Windows Authentication only.
- **The service is running.** The installer often leaves StartType = Manual.

Then create the database and a login for the application, and restart the SQL
Server service.

The team shares one `.bak` file; how to restore it and the traps already hit
are in [`docs/DATABASE.md`](docs/DATABASE.md).

### 2. Backend

```powershell
copy backend\.env.example backend\.env
```

Open `backend/.env` and fill in the values — that file is the checklist, with a
comment on every variable. Spring Boot reads it through `spring.config.import`
in `application.properties`, so no environment variables need setting by hand.

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Comes up on <http://localhost:8080>.

### 3. AI assistant

```powershell
pip install -r rag/requirements.txt
ollama pull nomic-embed-text
ollama pull qwen3

copy rag\.env.example rag\.env
python rag/ingest.py        # build the index; rerun whenever documents change
python rag/server.py        # :8000
```

`ingest.py` has to run **before** `server.py` at least once, otherwise every
question stops at "No index found".

**The default in `config.py` is Gemini, not Ollama.** So a `rag/.env` freshly
copied from the template takes the Gemini path with an empty key and fails on
the first question. Pick one:

- **Ollama** — set `RAG_LLM_BACKEND=ollama` in `rag/.env`. Private, free, about
  50–70 seconds per answer.
- **Gemini** — set `GEMINI_API_KEY` and leave `RAG_LLM_BACKEND` as the template
  has it. A few seconds per answer, but see the warning below.

**Keep embedding on Ollama** — an index built with one model has to be queried
with that same model, and `retrieve.py` stops outright if it detects a
mismatch.

> ⚠️ **Gemini's free tier cannot carry the chatbot evaluation.** The 25 cases
> cost 44 model calls (each triage case costs 4), and the free quota runs out
> after roughly 15–20. Two different keys were tried and both died mid-run —
> the evidence is in
> [`rag/eval/results/chatbot-gemini-quota-hit.json`](rag/eval/results/chatbot-gemini-quota-hit.json).
> Run `evaluate_chatbot.py` on Ollama. Keep Gemini for demos, where only a few
> questions are asked and speed matters.

### 4. Frontend

```powershell
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Open <http://localhost:5173>. Vite is already configured to proxy
`/api/chat/**` to port 8000 and `/api/**` to 8080 — the browser stays on a
single origin, so no CORS configuration is needed.

### Start-up order

SQL Server → Ollama → backend → `ingest.py` → RAG service → frontend.

The assistant needs the backend already running, because its three tools call
back into `/api/booking/**`.

---

## Environment variables

The three template files below **are in the repository and contain no real
values**. The real files (`.env`, `.env.local`) are blocked by `.gitignore`.

| Template | Copy to | Used for |
|---|---|---|
| [`backend/.env.example`](backend/.env.example) | `backend/.env` | database, JWT, mail, Google, telemetry |
| [`rag/.env.example`](rag/.env.example) | `rag/.env` | Gemini key, LLM backend choice, telemetry |
| [`frontend/.env.example`](frontend/.env.example) | `frontend/.env.local` | proxy target, Google Client ID |

The variables, **without values**:

| Variable | Where | Required | Purpose |
|---|---|---|---|
| `DB_URL` | backend | — | JDBC string; leave empty to use the default in `application.properties` |
| `DB_USERNAME`, `DB_PASSWORD` | backend | ✅ | the SQL Server login |
| `JWT_SECRET` | backend | ✅ | HS256 signing key |
| `SERVER_PORT` | backend | — | change only if 8080 is already taken |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | backend | ✅ | activation and password-reset emails |
| `GOOGLE_CLIENT_ID` | backend | — | leave empty and the "Continue with Google" button hides itself |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | backend | — | creates an admin account at start-up, see below |
| `SPRING_PROFILES_ACTIVE` | backend | — | set to `demo` to create three throwaway local accounts, see below |
| `AI_TELEMETRY_SECRET` | backend | — | must match `RAG_TELEMETRY_SECRET` |
| `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` | backend | — | the AI usage statistics page |
| `GEMINI_API_KEY` | rag | — | only needed when `RAG_LLM_BACKEND=gemini` |
| `RAG_LLM_BACKEND`, `RAG_EMBED_BACKEND` | rag | — | `ollama` or `gemini` |
| `RAG_APP_BACKEND_URL` | rag | — | the Spring Boot instance the three tools call |
| `RAG_TELEMETRY_SECRET` | rag | — | must match `AI_TELEMETRY_SECRET` |
| `RAG_EVAL_TOKEN` | rag | — | a patient's JWT, used only when running the evaluation |
| `API_PROXY_TARGET` | frontend | — | change only if the backend is not on 8080 |
| `VITE_GOOGLE_CLIENT_ID` | frontend | — | the same Client ID as the backend |

---

## Test accounts

**Admin** is created at backend start-up, not by a migration. Set `ADMIN_EMAIL`
and `ADMIN_PASSWORD` in `backend/.env` (at least 8 characters) and restart the
backend; `AdminAccountBootstrap` creates the account if it is missing. This
avoids baking a BCrypt hash into a migration file.

**Patients** register themselves at `/register`, but have to open the
activation link in their email before they can log in.

**Doctors** cannot create themselves. An account registers with a `DOCTOR`
request, and an admin approves it in the admin area. The five doctors in
`V4__seed_demo_doctors.sql` **cannot log in** — they are display data and their
passwords are placeholder values.

The accounts the team uses for the demo:

| Role | Email | Password |
|---|---|---|
| Admin | 23110010@student.hcmute.edu.vn | Bin2005@ |
| Doctor | 23110025@student.hcmute.edu.vn | 12345678 |
| Patient | tranquochuy26022005@gmail.com | 12345678 |

Use demo-only passwords here. Do not reuse anyone's real password, because this
table lives in Git.

There is also a throwaway set behind a Spring profile: set
`SPRING_PROFILES_ACTIVE=demo` in `backend/.env` and `DemoAccountBootstrap`
creates `admin.demo@`, `doctor.demo@` and `patient.demo@smarthealth.local` with
the password `Demo123!`, logging a warning while the profile is active. Useful
on a clean machine; **never enable it on a shared or public deployment**.

---

## Running the tests

```powershell
cd backend; .\mvnw.cmd test
```

```powershell
cd frontend; npm run test:booking; npm run test:doctor
```

```powershell
cd rag; python -m unittest discover -s . -p "test_*.py"
```

Assistant quality evaluation (needs the services actually running):

```powershell
python rag/evaluate.py                      # retrieval, 60 scored questions
python rag/evaluate_chatbot.py --validate   # validate the case set, contacts nothing
```

---

## Documentation

| File | Contents |
|---|---|
| [`docs/REPORT.pdf`](docs/REPORT.pdf) | the project report |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | system diagram and the flow of one AI request |
| [`docs/adr/`](docs/adr/) | architecture decisions with their reasoning |
| [`docs/USER_STORIES.md`](docs/USER_STORIES.md) | user stories with acceptance criteria |
| [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md) | story → endpoint → file → test |
| [`docs/OWNERSHIP.md`](docs/OWNERSHIP.md) | who answers for which area |
| [`docs/DATABASE.md`](docs/DATABASE.md) | SQL Server, migrations, traps already hit |
| [`docs/CHATBOT.md`](docs/CHATBOT.md) | how the assistant works ([Vietnamese version](docs/CHATBOT.vi.md)) |
| [`rag/README.md`](rag/README.md) | RAG pipeline and evaluation harness in detail |
| [`backend/docs/BOOKING_BACKEND.md`](backend/docs/BOOKING_BACKEND.md) | booking endpoints and authorisation |
| [`AI_USAGE.md`](AI_USAGE.md) | log of AI tool usage (section 5.3 of the brief) |
