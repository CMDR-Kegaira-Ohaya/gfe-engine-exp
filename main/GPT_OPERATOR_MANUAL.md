# GPT Operator Manual

This file is the operational manual for GPT sessions working inside this repository.

## Purpose
Restore working context quickly and reduce drift between sessions by making the repository itself the re-entry surface.

## Operating posture
- Repo-first, not chat-memory-first.
- Canonical engine doctrine outranks implementation details.
- When uncertain, inspect files before asserting.
- Keep fixes local unless the repo map shows a wider dependency.
- Report findings before proposing edits.
- No repository write should happen without explicit human approval.

## Session bootstrap
1. Read `/main/TOC.md`.
2. Read this file.
3. Read `/main/SYSTEM_MAP.md`
4. Read `/main/EDIT_RULES.md` if edits are likely.
5. Read `/main/INSTRUCTIONS_INDEX.md` for repo-useful tooling and operational helpers.
6. Read `/PROCEDURE_INDEX.md` if troubleshooting or repo-write recovery is relevant.
7. Only then open task-relevant engine, solver, UI, workflow, or case files.

## Priority rules
- Engine meaning comes from `/engine/*`.
- GPT operating behavior inside this repo comes from `/main/*`.
- Solver code in `/solver/*` implements canon; it does not define doctrine.
- UI code never defines doctrine.
- Workflow files under `/.github/workflows/*` automate checks and maintenance; they do not define doctrine.
- Case files do not redefine the engine.

## Use the action deliberately
When repo-control is available:
- inspect before editing
- prefer minimal edits
- preserve working features before improving architecture
- avoid speculative rewrites unless explicitly requested or clearly necessary
- do not write to `/engine/` or `/solver/` automatically
- if a large file update fails through the assistant tool path, prefer manual paste or git-object write paths rather than changing architecture to fit the tool

## Allowed inferences
- You may infer file relationships from code imports, filenames, and repo structure.
- You may not infer new engine doctrine beyond what Layer 1 states.
- If data is missing, mark it missing.

## Editing policy
- Fix the smallest real blocker first.
- Do not rewrite large files merely for style.
- When a module is repeatedly unstable, replace it cleanly rather than stacking brittle patches.
- Keep shared entrypoints stable: `index.html`, `/ui/`, `/cases/`, `/main/`, `/engine/`, `/solver/`, `/.github/workflows/`.

## Report-first governance
- The assistant may inspect, analyze, compare, and test.
- Findings should be reported in chat first.
- Repository changes require explicit human approval.
- `/engine/` is human-maintained only.
- `/solver/` is also human-approved only.

## Re-entry policy
If a new session starts with no prior context:
- do not ask for the project history first
- rebuild context from `/main/TOC.md`
- summarize the repo state briefly before acting if the task is ambiguous

## Safe escalation order
1. Inspect
2. Analyze
3. Report findings
4. Patch narrowly only if explicitly approved
5. Change architecture only when requested

## What this manual is not
- not engine doctrine
- not a case-reading source
- not a substitute for `/engine/*`

## Suggested first reply style after TOC bootstrap
- confirm the active layer you are using
- state the task-relevant files
- proceed directly

## Current repo role split
- `/engine/` = canonical model stack
- `/main/` = bootstrap and operator map
- `/solver/` = executable implementation layer
- `/ui/*` and root HTML = workbench implementation
- `/.github/workflows/` = automated checks and maintenance flows
- `/cases/` = saved data and smoke tests
- `/tools/js/` = operational JavaScript inspection tooling

## Current operational facts
- `/solver/` exists and is active.
- `solver-selftest.yml` checks solver integrity.
- `validate-cases.yml` checks saved cases against solver validation.
- The workbench should route ingest through `ui/app.js` and the solver runtime.
- Repo-useful tooling and troubleshooting should be discoverable from boot through `/main/INSTRUCTIONS_INDEX.md` and `/PROCEDURE_INDEX.md`.
