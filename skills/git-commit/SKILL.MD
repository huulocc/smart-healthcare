---
name: git-commit
description: Use when suggesting a commit message, branching, staging, committing, merging, resolving conflicts, or pushing in any project of this workspace.
---

# Git Commit

## Agent behaviour

Format every commit message per the convention below. Derive the ticket ID from
the current branch name (branches are `feature/<ticket-id>-<slug>`, e.g.
`feature/DEMO-101-close-guard` → `DEMO-101`); if none can be derived, ask the
user — never guess or invent a ticket ID.

## Branching

- One branch per ticket: `feature/<ticket-id>-<slug>`, started from an
  up-to-date `main`. Never push directly to `main`.

## Actions

**Suggest message** — read-only: `git status`, `git diff HEAD`,
`git branch --show-current`, `git log --oneline -10`. Present the message in a
fenced code block with the files it covers. Do not modify the repository.

**Stage** — stage only the files belonging to the change (no blanket
`git add -A`). If the diff contains unrelated changes, propose a split with
file groupings and stage only one group.

**Commit** — commit the staged files with a message following the convention.
Show the resulting commit (hash + message + file list).

**Push** — NEVER push without asking the user first; prior approval to commit
is not approval to push:
1. `git fetch origin`, then `git status -sb` (without a fetch, status is stale).
2. If the branch is behind its remote, merge the remote branch first. Never
   merge with staged or uncommitted changes present.
3. Show the user the outgoing commits (`git log origin/<branch>..HEAD --oneline`)
   and diff, then ask for explicit approval and wait for a yes. Never force-push.

## Message format

```
<ticket-id>: <Capitalized imperative summary>
```

- Ticket ID from the branch name; first word capitalized; no trailing period.
- **Single title line by default** — add a body or trailer only when the user
  asks. `Co-Authored-By` / "Generated with" are AI-tooling defaults, not ours.
- No vague messages ("fix bug"); isolate refactoring in its own commit(s).
- Multiple small commits per ticket are fine — each carries the ticket ID.
- Multi-line messages: use a heredoc or `-F <file>`, never inline `\n` escapes.

Examples:

```
DEMO-101: Block closing a task while its scan is pending
DEMO-101: Add functional test for close-guard against the simulator
```

## Common mistakes

- Appending a body or trailer unrequested — only when the user asks.
- Inventing a ticket ID when the branch name has none — ask instead.
- Pushing automatically without showing the outgoing commits/diff and getting
  explicit approval — the push gate applies in every mode, including auto mode.