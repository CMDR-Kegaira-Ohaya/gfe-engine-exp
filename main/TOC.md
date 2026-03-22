# GFE Repository TOC

This file is the canonical bootstrap entrypoint for GPT sessions and operator re-entry.

## First-use rule
If a GPT session has repo-control access, start here before touching implementation files.
Read in this order unless the task explicitly requires a narrower path.

## Authority and traversal order

### Layer 1 — Canonical engine doctrine
Read these first when the task concerns model meaning, doctrine, case analysis rules, payload structure, dashboard semantics, or anti-drift constraints.

1. `/engine/formed_existence_model_v15_7.md`
2. `/engine/AENAONEQU3.md`
3. `/engine/kernel_v15_7.md`
4. `/engine/spec_v15_7.md`
5. `/engine/gfe_exp_engine_core_v15_7.md`

### Layer 2 — Repo operating map
Read these next when the task concerns how this repository is organized or how the GPT should operate inside it.

1. `/main/GPT_OPERATOR_MANUAL.md`
2. `/main/SYSTEM_MAP.md`
3. `/main/EDIT_RULES.md`
4. `/main/INSTRUCTIONS_INDEX.md`
5. `/main/REPO_SCHEMA.json`
6. `/PROCEDURE_INDEX.md`
7. `/main/GPT_CAPABILITY_SURFACE.md`

### Layer 3 — Solver implementation
Read these when the task concerns executable math, validation, normalization, dashboard shaping, or future runtime implementation.

- `/solver/`

### Layer 4 — Application implementation
Read these when the task concerns the workbench UI, rendering, repo connection logic, or Pages behavior.

- `/index.html`
- `/workbench-v2.html`
- `/privacy.html`
- `/ui-v2/`
- `/.github/workflows/`

### Layer 5 — Case payloads
Read these when the task concerns saved cases, case indexes, smoke tests, or markdown companions.

- `/cases/`

## Quick routing by task

### Case analysis / dashboard generation
- Start with Layer 1
- Then `/main/GPT_OPERATOR_MANUAL.md`
- Then relevant case files under `/cases/`

### Solver work
- Start with Layer 1
- Then `/main/EDIT_RULES.md`
- Then `/solver/`

### Workflows / automation
- Start with `/.github/workflows/`
- Check `solver-selftest.yml`
- Check `validate-cases.yml`
- Then relevant `/solver/` scripts

### Repo debugging / UI bugs / Pages issues
- Start with `/main/SYSTEM_MAP.md`
- Then `/main/EDIT_RULES.md`
- Then relevant files in `index.html`, `workbench-v2.html`, `/ui-v2/*`, `.github/`

### Save/load flow or schema issues
- Start with `/main/REPO_SCHEMA.json`
- Then `/main/EDIT_RULES.md`
- Then relevant implementation files

### JavaScript structural inspection
- Start with `/main/INSTRUCTIONS_INDEX.md`
- Then `/tools/js/README.md`
- Then use `npm run js:summary-all` or the narrower `js:check` / `js:symbols` / `js:deps` commands

### Session re-entry after context loss
- Read this file
- Read `/main/GPT_OPERATOR_MANUAL.md`
- Read `/main/SYSTEM_MAP.md`
- Only then branch into engine, solver, UI, or workflow files

## Operational cross-links
- Instructions and tooling: `/main/INSTRUCTIONS_INDEX.md`
- GPT repo-control capabilities: `/main/GPT_CAPABILITY_SURFACE.md`
- Troubleshooting and repo-write recovery: `/PROCEDURE_INDEX.md`
- JS parser tooling: `/tools/js/README.md`

## Hard rules
- Do not treat dashboard or matrix outputs as ontology-source.
- Do not invent structure outside canonical engine files.
- Do not let implementation files outrank Layer 1 doctrine.
- Do not edit files outside the task-relevant zone if a narrower fix is available.
- If repo files and memory from prior chats conflict, prefer the repo files.
- No automatic process may modify `/engine/`.
- No automatic process may modify `/solver/`.
- The assistant may inspect, analyze, test, and report findings, but repository changes require explicit human approval.

## Current operational facts
- `/solver/` now exists and contains executable runtime modules.
- `/.github/workflows/` now contains at least two useful workflows: `solver-selftest.yml` and `validate-cases.yml`.
- The public workbench now routes through `/index.html` and `/ui-v2/app.js`.
- `workbench-v2.html` remains as a compatibility surface for the same v2 workbench.
- If a large file write fails through the assistant tool path, prefer manual paste or git-object write paths rather than redefining architecture.
- JavaScript structural inspection tooling now exists under `/tools/js/` and should be discoverable from boot via `/main/INSTRUCTIONS_INDEX.md`.

## Canonical status labels
- **Canonical**: source of truth for meaning
- **Operational**: how the GPT should traverse or act in this repo
- **Executable**: runnable implementation
- **Implementation**: UI/app behavior
- **Data**: saved cases and generated companions

## Starter prompt for future sessions
Use repo-control first. Start at `/main/TOC.md`. Follow the authority order exactly. Do not infer structure outside mapped files.
