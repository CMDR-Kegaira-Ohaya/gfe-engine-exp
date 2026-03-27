# Edit Rules
[RID_SELFREF_EDIT_RULES]

## Core rule
[RID_EDIT_CORE_RULE]
Edit the narrowes file set that can truthfully solve the task.

## Governance rule
[RID_EDIT_GOVERNANCE_RULE]
No automatic process may modify `/engine/` or `/solver/`.
The assistant may inspect, analyze, compare, test, and report findings, but any repository change requires explicit human approval.

## Do not cross layers casually
- Do not change `/engine/*` to solve a UI bug.
- Do not change `/solver/*` to redefine engine doctrine.
- Do not change `/ui/*` to redefine engine doctrine.
- Do not use `/cases/*` as a substitute for documentation.

## Allowed edit zones by task
[RID_EDIT_ALLOWED_ZONES]

### Engine/doctrine tasks
Editable only with explicit human approval:
- `/engine/**`
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
Aoid touching `/engine/*` unless the issue is actually doctrinal.

### Data/case tasks
Editable only with explicit human approval:
- `/cases/*`
- supporting save/load implementation if required

## Fix style
- Prefer direct replacement over layered patching when a module has become syntactically unstable.
- Prefer preserving interfaces already used elsewhere in the app.
- Keep commit messages descriptive and local.

## Bootstrap discipline
[RID_EDIT_BOOTSTRAP_DISCIPLINE]
When asked to “inspect the repo” or “Start from the TOC”:
- read `/main/TOC.md` first
- do not jump straight into code unless the task is already code-specific

## Repo-control discipline
- inspect current file contents before major edits
- verify branch/ref when branch-specific work is involved
- avoid deleting branches or files unless explicitly requested
- report findings in chat before proposing write actions


### Transport encoding discipline
[RID_EDIT_TRANSPORT_ENCODING_DISCIPLINE]
- **Base64 is transport only.** Do not reason over opaque base64 blobs.
- When reading repo files through tools/connectors that return base64, **decode once to plain UTF-8** before inspecting, diffing, or patching.
- When writing repo files, **compose the new content as plain UTF-8** (Markdown/JSON/text) first, then encode to base64 only at the tool boundary.
- Prefer stable, inspectable formats for operational state (Markdown or JSON) with explicit fields (e.g., `title`, `purpose`, `instructions`, `state`, `notes`).
- Avoid nested encodings or extra transport wrappers unless a boundary strictly requires it; if required, document the boundary and keep the inner payload plain.


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
