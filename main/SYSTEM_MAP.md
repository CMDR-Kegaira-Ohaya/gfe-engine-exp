# System Map

## Top-level role split

### `/engine/`
Canonical GFE source stack copied into the repository so sessions can bootstrap from repo state rather than hidden GPT memory.

### `/main/`
Operational control layer for GPT re-entry:
- `TOC.md` = bootstrap entrypoint
- `GPT_OPERATOR_MANUAL.md` = session operating logic
- `SYSTEM_MAP.md` = structural map
- `EDIT_RULES.md` = edit boundaries and workflow constraints
- `REPO_SCHEMA.json` = machine-readable directory and file-role map

### `/solver/`
Executable implementation layer for validation, normalization, payload handling, prevalence, envelope, compensation, cascade, and future runtime math.
This layer implements canon but does not revise it.
No automatic process may modify this layer.

### Root HTML
- `index.html` = main Pages workbench entrypoint
- `privacy.html` = public privacy page

### `/ui/`
Frontend modules for rendering, repo connection, timeline behavior, right-panel behavior, and state handling.
`/ui/app.js` is the ingest entry point for running validation and solver runtime on loaded cases.

### `/cases/`
Repository-level case storage for public/shared/demo/smoke-test data.
Cases are now consumed not only by the workbench but also by solver validation scripts and workflows.

### `/.github/workflows/`
Workflow and automation files for repository maintenance and Pages behavior.
Currently includes at least:
- `solver-selftest.yml` = solver integrity smoke test
- `validate-cases.yml` = case validation against solver constraints

## Self-referential capability map
- workbench surfaces = `index.html` + `/ui/*`, and `workbench-v2.html` + `/ui-v2/*`
- workflow surfaces = `/.github/workflows/*` for validation, selftest, and repo maintenance
- inspection/tooling surfaces = `/tools/js/*` for JavaScript structure inspection and `/main/INSTRUCTIONS_INDEX.md` + `/PROCEDURE_INDEX.md` for operational guidance

## Conceptual flow
1. Operator or GPT enters through `/main/TOC.md`
2. Canonical meaning comes from `/engine/*`
3. Repo operating behavior comes from `/main/*`
4. Executable logic, when present, lives in `/solver/*`
5. UI renders and manipulates case data through root HTML and `/ui/*`
6. Workflows run repo-level checks over solver and case data
7. Cases live under `/cases/*`

## Governance rules
- `/engine/` is canonical and human-maintained only.
- `/solver/` is executable and human-approved only.
- No automatic process may modify `/engine/` or `/solver/`.
- The assistant may inspect, analyze, and report findings, but repository changes require explicit human approval.

## Current intended usage
- `main` branch = public workbench and canonical implementation
- `cases/users/shared` = shared branch
- `cases/users/various` = miscellaneous communal/testing branch

## What should not be collapsed
- engine doctrine vs solver implementation
- engine doctrine vs UI code
- workflow automation vs canonical model
- repo operating map vs saved case data
- bootstrap manuals vs canonical model files
- public workbench repo vs later personal forks/copies

## Session rebuild path
If context is lost, the minimum recovery path is:
`/main/TOC.md` → `/main/GPT_OPERATOR_MANUAL.md` → `/main/SYSTEM_MAP.md`

## Editing hotspots
- solver work: `/solver/*`
- UI bugs: `/ui/*`, `index.html`
- save/load behavior: `/ui/repo.js`, `/cases/*`, relevant workflow files
- automation/validation: `/.github/workflows/*`, `/solver/check-cases.js`, `/solver/selftest.js`
- engine doctrine: `/engine/*` only when explicitly revising canonical content
- if a large file write fails through the assistant tool path, prefer manual paste or git-object write paths rather than restructuring the repo to match the tool
