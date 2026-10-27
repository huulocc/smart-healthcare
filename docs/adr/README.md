# Architecture decision records

Section 5.2 of the brief asks for **at least 3 ADRs**, **at least one of them
about AI design**. An ADR is a short record of one decision: the context that
forced a choice, the alternatives considered, what was chosen, and what has to
be lived with as a result.

The three below are not written up after the fact to pad a submission. All
three are decisions that actually happened in the Git history, each with a date
and a commit behind it, and in all three cases another option looked more
sensible at the start.

| Id | Decision | Date | About AI? |
|---|---|---|---|
| [ADR-0001](0001-use-sql-server.md) | SQL Server installed on the machine, MySQL `docker-compose.yml` deleted | 2026-10-22 | |
| [ADR-0002](0002-role-in-jwt.md) | The role lives in a JWT claim, not in a lookup on every request | 2026-09-14 | |
| [ADR-0003](0003-rag-refusal-without-similarity-threshold.md) | No similarity threshold for refusal; refusal is enforced by the system prompt | 2026-09-21 | ✅ |

## Format

Each file follows the same six sections: **Status · Context · Alternatives
considered · Decision · Consequences · Where this is checked**.

The last section is the one most often skipped and the one worth most in a
viva: it points straight at the line of code or the test that holds the
decision in place. An ADR that cannot be pointed to anywhere in the code is
just a paragraph.

## When to write another one

Write one when a choice **had a reasonable alternative** and someone later will
ask "why was it done this way". Do not write one for things that only had one
path.

Candidates, if the team needs more:

- The assistant's three tools are all **read-only**, and the result is checked
  against a schema before it reaches the user (`rag/triage.py`) — the strongest
  candidate, since it also covers sections 4.1 B and C of the brief.
- Chat runs in its own Python process, reached through the Vite proxy rather
  than sitting behind Spring Boot (see [`../ARCHITECTURE.md`](../ARCHITECTURE.md)).
- Splitting documents by heading rather than by a fixed character count
  ([`../CHATBOT.md`](../CHATBOT.md) section 9 already has the reasoning and
  examples).
