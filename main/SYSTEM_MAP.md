# System Map
[RID_SELFREF_SYSTEM_MAP]

## Top-level role split
[RID_SYSTEM_TOP_LEVEL_SPLIT]

### `/engine/`
Canonical GFE source stack copied into the repository so sessions can bootstrap from repo state rather than hidden GPT memory.

### `/main/`
Operational control layer and centralized self-referential layer for GPT re-entry:
- `TOC.md` = bootstrap entrypoint
- `GPT_OPERATOR_MANUAL.md` = session operating logic
- `SYSTEM_MAP.md` = structural map
- `INSTRUCTIONS_INDEX.md` = operational tooling and helper workflows
- `GPT_CAPABILITY_SURFACE.md` = GPT action surface for custom connector capabilities and repo-control caveats
- `TOKEN_PERMISSION_SURFACE.md` = live token permission surface
- `EDIT_RULES.md` = edit boundaries and workflow constraints
- `REPO_SCHEMA.json` = machine-readable directory and file-role map

This is the only repo-wide self-referential layer.
Lane-local notes may exist elsewhere, but they do not replace `/main/`.

### `/solver/`
Executable implementation layer for validation, normalization, payload handling, prevalence, envelope, compensation, cascade, and future runtime math.
This layer implements canon but does not revise it.
No automatic process may modify this layer.

### Root HTML
- `index.html` = public Pages workbench entrypoint
- `workbench-v3.html` = direct v3 workbench surface
- `privacy.html` = public privacy page

### `/ui-v3/`
Active frontend workbench modules for rendering, workspace assembly, repo case loading, timeline/participant focus, derived-state inspection, salience styling, and polish behavior.
`/ui-v3/app.js` is the active app entry point for the v3 workbench surface.

### `/cases/`
Repository-level case storage for public/shared/demo/smoke-test data.
Cases are consumed by the workbench and by solver validation scripts and workflows.

### `/catalog/`
Catalog/index layer for discoverable case artifacts used by the workbench.

### `/.github/workflows/`
Workflow and automation files for repository maintenance and Pages behavior.
Currently includes at least:
- `solver-selftest.yml` = solver integrity smoke test
- `validate-cases.yml` = case validation against solver constraints

### `/tools/js/`
Operational JavaScript inspection tooling for syntax checks, AST parsing, symbol summaries, dependency edges, identifier lookup, and batch summaries.

### `/users/`
Lane-local user working areas.
Useful for notes, tools, and project boards.
Not part of the repo-wide self-referential authority layer.

## Self-referential capability map
[RID_SYSTEM_SELFREF_CAPABILITY_MAP]
- bootstrap surfaces = `/main/*`
- workbench surfaces = `/index.html`, `/workbench-v3.html`, `/ui-v3/*`
- workflow surfaces = `/.github/workflows/*` for validation, selftest, and repo maintenance
- inspection/tooling surfaces = `/tools/js/*` for JavaScript structure inspection and `/main/INSTRUCTIONS_INDEX.md` + `/PROCEDURE_INDEX.md` for operational guidance
- GPT repo-control connector surface = `/main/GPT_CAPABILITY_SURFACE.md` for custom connector capabilities and repo-control caveats
- live token permission surface = `/main/TOKEN_PERMISSION_SURFACE.md` for current token authority width

## Conceptual flow
[RID_SYSTEM_CONCEPTUAL_FLOW]
1. Operator or GPT enters through `/main/TOC.md`
2. Canonical meaning comes from `/engine/*`
3. Repo operating behavior comes from `/main/*`
4. Executable logic, when present, lives in `/solver/*`
5. The public workbench renders and manipulates case data through `index.html`, `workbench-v3.html`, and `/ui-v3/*`
6. Workflows run repo-level checks over solver and case data
7. Cases live under `/cases/*`

## Governance rules
[RID_SYSTEM_GOVERNANCE_RULES]
- `/engine/` is canonical and human-maintained only.
- `/solver/` is executable and human-approved only.
- No automatic process may modify `/engine/` or `/solver/`.
- The assistant may inspect, analyze, and report findings, but repository changes require explicit human approval.

## Current intended usage
- `main` branch = public workbench and canonical implementation

## What should not be collapsed
- engine doctrine vs solver implementation
- engine doctrine vs UI code
- workflow automation vs canonical model
- repo operating map vs saved case data
- bootstrap manuals vs canonical model files
- repo-wide self-reference in `/main/` vs lane-local notes under `/users/`

## Session rebuild path
If context is lost, the minimum recovery path is:
`/main/TOC.md` → `/main/GPT_OPERATOR_MANUAL.md` → `/main/SYSTEM_MAP.md`

## Editing hotspots
- solver work: `/solver/*`
- UI bugs: `/ui-v3/*`, `index.html`, `workbench-v3.html`
- save/load behavior: `/ui-v3/app.js`, `/cases/*`, relevant workflow files
- automation/validation: `/.github/workflows/*`, `/solver/check-cases.js`, `/solver/selftest.js`
- engine doctrine: `/engine/*` only when explicitly revising canonical content
- if a large file write fails through the assistant tool path, prefer manual paste or git-object write paths rather than restructuring the repo to match the tool
