# Edit Rules

## Core rule
Edit the narrowest file set that can truthfully solve the task.

## Governance rule
No automatic process may modify `/engine/` or `/solver/`.
The assistant may inspect, analyze, compare, test, and report findings, but any repository change requires explicit human approval.

## Do not cross layers casually
- Do not change `/engine/*` to solve a UI bug.
- Do not change `/solver/*` to redefine engine doctrine.
- Do not change `/ui/*` to redefine engine doctrine.
- Do not use `/cases/*` as a substitute for documentation.

## Allowed edit zones by task

### Engine/doctrine tasks
Editable only with explicit human approval:
- `/engine/*`
- `/main/TOC.md`
- `/main/GPT_OPERATOR_MANUAL.md`
- `/main/SYSTEM_MAP.md`
- `/main/EDIT_RULES.md`
- `/main/REPO_SCHEMA.json`

### Solver tasks
Editable only with explicit human approval:
- `/solver/*`
- relevant `/main/*` files if governance or routing changes

### UI/debugging tasks
Editable only with explicit human approval:
- `index.html`
- `privacy.html`
- `/ui/*`
- relevant workflow files under `.github/`

Avoid touching `/engine/*` unless the issue is actually doctrinal.

### Data/case tasks
Editable only with explicit human approval:
- `/cases/*`
- supporting save/load implementation if required

## Fix style
- Prefer direct replacement over layered patching when a module has become syntactically unstable.
- Prefer preserving interfaces already used elsewhere in the app.
- Keep commit messages descriptive and local.

## Bootstrap discipline
When asked to “inspect the repo” or “Start from the TOC”:
- read `/main/TOC.md` first
- do not jump straight into code unless the task is already code-specific

## Repo-control discipline
- inspect current file contents before major edits
- verify branch/ref when branch-specific work is involved
- avoid deleting branches or files unless explicitly requested
- report findings in chat before proposing write actions

## Change categories
- **Bootstrap docs**: safe to refine when architecture changes
- **Canonical engine docs**: human-revised only
- **Solver implementation**: human-approved only
- **UI implementation**: change for behavior fixes or requested improvements
- **Case data**: add/update/delete only when task-specific and approved

## When to ask less and act more
- if the repo clearly shows the blocker, diagnose it directly
- if uncertainty is about doctrine, inspect engine files instead of guessing
- if uncertainty is about implementation, inspect solver or UI files instead of guessing
