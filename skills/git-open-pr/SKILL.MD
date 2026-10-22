---
name: git-open-pr
description: Draft well-structured Pull Request titles and descriptions. Use whenever the user wants to open a PR, write a pull request, draft a PR description, or prepare a PR for review — also when they give a ticket ID or branch name alongside code changes without saying "pull request".
---

# Open PR

Draft and open Pull Requests following the workspace conventions.

## Format

- **Title:** `<ticket-id>: <short summary>` — e.g. `DEMO-101: Block closing tasks with pending scans`.
- **Target:** `main` unless stated otherwise; if unclear, **ask — don't guess**.
- **Body:** one or two sentences plus a tight bullet list of key changes —
  don't enumerate files. Add a `## Side task` section only for minor,
  loosely-related out-of-scope changes.

```markdown
<!-- One or two sentences: what this PR does and why. -->

- <key change>

## Side task *(optional)*
<!-- Minor, loosely-related out-of-scope changes only. -->
```

## Decision rules

- Keep changes within the ticket. Don't fix unrelated issues — even
  pre-existing ones — note them instead; an unavoidable minor related change
  goes under `## Side task`.
- New endpoints or processing paths need test coverage before the PR.

## Workflow

1. **Collect inputs** — target branch, ticket ID, a brief description, and any
   side tasks.
2. **Draft** title + body in the format above; omit empty sections; keep it tight.
3. **Present** the title and body in a copyable block; iterate on feedback and
   **confirm before opening**. A person merges — the agent never merges.
4. **Open** with the GitHub CLI, passing the body via a file:
   ```
   gh pr create --base <target-branch> --title "<title>" --body-file <file>.md
   ```

## Writing multi-line bodies (commit or PR)

Never pass a multi-line message as an inline quoted string with `\n` escapes —
the shell does not expand `\n`, so literal `\n` ends up in the PR. Use a file
or a heredoc:

```bash
gh pr create --body-file body.md   # not: --body "line1\nline2"
```

## Example

**`DEMO-101: Block closing tasks with pending scans`**
```markdown
Prevent a task from being closed while its attachment scan is still pending.

- Added a close-guard check against the scan status in the task service
- Returned 409 with a user-facing message when the scan is pending
- Functional test against the scan simulator

## Side task
- Fixed a typo in the task-board column header noticed while testing.
```