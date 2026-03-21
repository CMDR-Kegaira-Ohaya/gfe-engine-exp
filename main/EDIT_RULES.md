# Edit Rules

## Core rule
Edit the narrowest file set that can truthfully solve the task.

## Do not cross layers casually
- Do not change `/engine/*` to solve a UI bug.
- Do not change `/ui/*` to redefine engine doctrine.
- Do not use `/cases/*` as a substitute for documentation.

## Allowed edit zones by task

### Engine/doctrine tasks
Editable:
- `/engine/*`
- `/main/TOC.md`
- `/main/GPT_OPERATOR_MANUAL.md`
- `/main/SYSTEM_MAP.md`
- `/main/EDIT_RULES.md`
- `/main/REPO_SCHEMA.json`

### UI/debugging tasks
Editable:
- `index.html`
- `privacy.html`
- `/ui/*`
- relevant workflow files under `.github/`

Avoid touching `/engine/*` unless the bug is actually doctrinal.

### Data/case tasks
Editable:
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

## Change categories
- **Bootstrap docs**: safe to refine when architecture changes
- **Canonical engine docs**: change only with intent
- **UI implementation**: change for behavior fixes or requested improvements
- **Case data**: add/update/delete only when task-specific

## When to ask less and act more
- if the repo clearly shows the blocker, fix it
- if a repeated syntax/module failure exists, replace the unstable file cleanly
- if uncertainty is about doctrine, inspect engine files instead of guessing
