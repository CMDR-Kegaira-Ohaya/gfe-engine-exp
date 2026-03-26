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
- `WORKBENCH_V3_OPERATOR_MAP.md` = canonical live GUI/operator map
- `INSTRUCTIONS_INDEX.md` = operational tooling and helper workflows
- `GPT_CAPABILITY_SURFACE.md` = custom connector action surface and caveats
- `TOKEN_PERMISSION_SURFACE.md` = live token permission surface
- `EDIT_RULES.md` = edit boundaries and workflow constraints
- `REPO_SCHEMA.json` = machine-readable directory and file-role map

This is the only repo-wide self-referential layer.
Lane-local notes may exist elsewhere, but they do not replace `/main/`.

### `/solver/`
Executable implementation layer for validation, normalization, payload handling, prevalence, envelope, compensation, cascade, dashboard shaping, and future runtime math.
This layer implements canon but does not revise it.
No automatic process may modify this layer.

### Root HTML
- `index.html` = public Pages entrypoint that redirects to `./workbench-v3.html`
- `workbench-v3.html` = direct v3 workbench surface
- `privacy.html` = public privacy page

### `/ui-v3/`
Active frontend workbench modules for rendering, workspace assembly, repo case loading, local package import, reading handoff, timeline focus, participant/encounter focus, derived-state inspection, atlas behavior, and UI polish.
`/ui-v3/app.js` is the active app entrypoint for the v3 workbench surface.

Important split inside `/ui-v3/`:
- `atlas-renderer-core.js` = atlas structure / metadata / shell owner
- `atlas-renderer.js` = thinner atlas interaction wiring layer

### `/cases/`
Repository-level case storage for public/shared/demo/smoke-test data.
Cases are consumed by the workbench and by solver validation scripts and workflows.

### `/catalog/`
Catalog/index layer for discoverable case artifacts used by the workbench open-case surface.

### `/.github/workflows/`
Workflow and automation files for repository maintenance, solver checks, case validation, GUI validation, Pages behavior, and operational deploy loops.

Important current workflows include:
- `solver-selftest.yml`
- `validate-cases.yml`
- `gui-structure-check.yml`
- `gui-live-smoke.yml`
- `gui-deploy-verify.yml`
- `gui-force-redeploy.yml`

### `/tools/js/`
Operational JavaScript inspection tooling and GUI tooling for syntax checks, AST parsing, symbol summaries, dependency edges, identifier lookup, GUI entry audits, cut checks, local smoke, Pages smoke, artifact verification, repo diffs, rewrites, slice views, and validation chains.

### `/tools/cases/`
Operational case migration, catalog-build, and validation tooling.

### `/users/`
Lane-local user working areas.
Useful for notes, tools, and project boards.
Not part of the repo-wide self-referential authority layer.

## Self-referential capability map
[RID_SYSTEM_SELFREF_CAPABILITY_MAP]
- bootstrap surfaces = `/main/*`
- workbench surfaces = `/index.html`, `/workbench-v3.html`, `/ui-v3/*`
- workflow surfaces = `/.github/workflows/*` for validation, deploy checks, solver checks, and repo maintenance
- inspection/tooling surfaces = `/tools/js/*` and `/tools/cases/*`
- GPT repo-control connector surface = `/main/GPT_CAPABILITY_SURFACE.md`
- live token permission surface = `/main/TOKEN_PERMISSION_SURFACE.md`

## Conceptual flow
[RID_SYSTEM_CONCEPTUAL_FLOW]
1. Operator or GPT enters through `/main/TOC.md`
2. Canonical meaning comes from `/engine/*`
3. Repo operating behavior comes from `/main/*`
4. Executable logic, when present, lives in `/solver/*`
5. The public workbench renders and manipulates case state through `index.html`, `workbench-v3.html`, and `/ui-v3/*`
6. Catalog data under `/catalog/*` tells the workbench what canonical repo cases are available
7. Cases live under `/cases/*`
8. Workflows run repo-level checks over solver, cases, GUI, and Pages behavior

## Governance rules
[RID_SYSTEM_GOVERNANCE_RULES]
- `/engine/` is canonical and human-maintained only.
- `/solver/` is executable and human-approved only.
- No automatic process may modify `/engine/` or `/solver/`.
- The assistant may inspect, analyze, and report findings, but repository changes require explicit human approval.

## Current intended usage
- `main` branch = public workbench and canonical implementation branch

## What should not be collapsed
- engine doctrine vs solver implementation
- engine doctrine vs UI code
- workflow automation vs canonical model
- repo operating map vs saved case data
- bootstrap manuals vs canonical model files
- repo-wide self-reference in `/main/` vs lane-local notes under `/users/`

## Session rebuild path
If context is lost, the minimum recovery path is:
`/main/TOC.md` → `/main/GPT_OPERATOR_MANUAL.md` → `/main/SYSTEM_MAP.md` → `/main/WORKBENCH_V3_OPERATOR_MAP.md`

## Editing hotspots
- solver work: `/solver/*`
- UI bugs: `/ui-v3/*`, `index.html`, `workbench-v3.html`
- package/load/import behavior: `/ui-v3/app.js`, `/catalog/*`, `/cases/*`
- atlas/timeline behavior: `/ui-v3/app.js`, `/ui-v3/atlas-renderer-core.js`, `/ui-v3/atlas-renderer.js`
- automation/validation: `/.github/workflows/*`, `tools/js/gui-*`, `tools/cases/*`
- engine doctrine: `/engine/*` only when explicitly revising canonical content
- if a large file write fails through the assistant tool path, prefer manual paste or git-object write paths rather than restructuring the repo to match the tool
