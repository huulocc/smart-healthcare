# Smart Healthcare

Smart Healthcare is a React, Spring Boot, SQL Server and Python RAG application
for patient accounts, doctor discovery, appointment management and an AI
assistant. The assistant answers from patient leaflets and can suggest a clinic
department from symptoms by calling read-only Spring Boot tools. It does not
diagnose illness or book an appointment automatically.

## Run locally

### Prerequisites

- Java 21
- Node.js 20 or later and npm
- Python 3.10 or later
- Microsoft SQL Server reachable over TCP
- [Ollama](https://ollama.com/) with `nomic-embed-text`; `qwen3` is also needed
  when generation runs locally

The repository does not currently contain a verified Docker setup or a public
deployment. The steps below are the supported way to run the project. Database
setup details and the reasons for using a local SQL Server instance are in
[`docs/DATABASE.md`](docs/DATABASE.md).

### 1. Configure environment files

From the repository root:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
Copy-Item rag/.env.example rag/.env
```

Fill the required values in the copied files. Do not commit them. The templates
are the source of truth for variable names:

- [`backend/.env.example`](backend/.env.example): SQL Server, JWT, optional
  mail/Google login, admin bootstrap and AI telemetry.
- [`frontend/.env.example`](frontend/.env.example): backend proxy and optional
  Google client ID.
- [`rag/.env.example`](rag/.env.example): optional Gemini, telemetry secret,
  LLM/embedding backends and Spring Boot URL.

At minimum, set `DB_USERNAME`, `DB_PASSWORD`, and a random `JWT_SECRET` in
`backend/.env`. Create an empty database named `SmartHealthcareDB` first if it
does not exist. Keep `AI_TELEMETRY_SECRET` and `RAG_TELEMETRY_SECRET` identical
when telemetry is enabled.

### 2. Install and start the backend

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Spring Boot listens on `http://localhost:8080` by default. On a new database,
the current configuration lets Hibernate create/update the schema; Flyway is
disabled by default. See [`docs/DATABASE.md`](docs/DATABASE.md) before changing
that database policy.

### 3. Install, index and start the RAG service

Open a second terminal at the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r rag\requirements.txt
ollama pull nomic-embed-text
ollama pull qwen3
.\.venv\Scripts\python.exe rag\ingest.py
.\.venv\Scripts\python.exe rag\server.py
```

The RAG API listens on `http://127.0.0.1:8000`. With Gemini generation, provide
`GEMINI_API_KEY`; Ollama embedding is still the default, so Ollama and the built
index remain required unless the embedding backend is changed and re-ingested.

### 4. Install and start the frontend

Open a third terminal at the repository root:

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`. Binding explicitly to IPv4 avoids the Windows
`listen EACCES ::1:5173` error seen on machines where IPv6 localhost is blocked.

## Local test accounts

Add `SPRING_PROFILES_ACTIVE=demo` to `backend/.env` before starting the backend.
The application then creates these real, email-verified accounts and a doctor
profile if they do not already exist:

| Role | Email | Password |
|---|---|---|
| Admin | `admin.demo@smarthealth.local` | `Demo123!` |
| Doctor | `doctor.demo@smarthealth.local` | `Demo123!` |
| Patient | `patient.demo@smarthealth.local` | `Demo123!` |

These are public local fixtures. Never enable the `demo` profile on a shared or
production deployment. The old rows from `V4__seed_demo_doctors.sql` are display
data only and are not login accounts.

## Verification

```powershell
cd backend
.\mvnw.cmd test

cd ..\frontend
npm run build
npm run lint

cd ..
.\.venv\Scripts\python.exe -m unittest discover -s rag -p "test_*.py" -v
```

The 25-case live chatbot evaluation is separate because it calls running
services and model providers. Instructions and result locations are in
[`rag/eval/CHATBOT_EVAL.md`](rag/eval/CHATBOT_EVAL.md).

## Design and evidence

- [Overall architecture](docs/ARCHITECTURE.md)
- [User stories](docs/USER_STORIES.md) and
  [traceability matrix](docs/TRACEABILITY.md)
- [Architecture decision records](docs/adr/README.md)
- [Chatbot/RAG design](docs/CHATBOT.md) and [RAG measurements](rag/README.md)
- [AI-assisted development disclosure](AI_USAGE.md)

