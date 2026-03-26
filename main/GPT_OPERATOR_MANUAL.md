# GPT Operator Manual
[RID_SELFREF_OPERATOR_MANUAL]

This file is the operational manual for GPT sessions working inside this repository.

## Purpose
Restore working context quickly and reduce drift between sessions by making the repository itself the re-entry surface.

## Operating posture
[RID_OPERATOR_POSTURE]
- Repo-first, not chat-memory-first.
- Canonical engine doctrine outranks implementation details.
- When uncertain, inspect files before asserting.
- Keep fixes local unless the repo map shows a wider dependency.
- Report findings before proposing edits.
- No repository write should happen without explicit human approval.
- Assume the user may not be technical enough to guide repo architecture; guide from the repo maps and current implementation reality instead of expecting the user to supply technical navigation.
- For GUI/public-workbench work, prefer the next best small user-visible step over renewed architecture churn unless a real blocker appears.

## Session bootstrap
[RID_OPERATOR_SESSION_BOOTSTRAP]
1. Read `/main/TOC.md`.
2. Read this file.
3. Read `/main/SYSTEM_MAP.md`.
4. Read `/main/WORKBENCH_V3_OPERATOR_MAP.md` when the task concerns the GUI, Pages, or public workbench behavior.
5. Read `/main/EDIT_RULES.md` if edits are likely.
6. Read `/main/INSTRUCTIONS_INDEX.md` for repo-useful tooling and operational helpers.
7. Read `/PROCEDURE_INDEX.md` if troubleshooting or repo-write recovery is relevant.
8. Only then open task-relevant engine, solver, UI, workflow, or case files.

## Priority rules
- Engine meaning comes from `/engine/*`.
- GPT operating behavior inside this repo comes from `/main/*`.
- Solver code in `/solver/*` implements canon; it does not define doctrine.
- UI code never defines doctrine.
- Workflow files under `/.github/workflows/*` automate checks and maintenance; they do not define doctrine.
- Case files do not redefine the engine.
- Repo-wide self-reference is centered in `/main/*` and should not be spread into lane-local notes.

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
[RID_OPERATOR_EDITING_POLICY]
- Fix the smallest real blocker first.
- Do not rewrite large files merely for style.
- When a module is repeatedly unstable, replace it cleanly rather than stacking brittle patches.
- Keep shared entrypoints stable:
  - `index.html`
  - `workbench-v3.html`
  - `/ui-v3/`
  - `/cases/`
  - `/main/`
  - `/engine/`
  - `/solver/`
  - `/.github/workflows/`

## Report-first governance
[RID_OPERATOR_REPORT_FIRST_GOVERNANCE]
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
- for GUI work, read `/main/WORKBENCH_V3_OPERATOR_MAP.md` before making UI or workflow claims
- for GUI/public-workbench work, begin with:
  - where we are now
  - the next best small step
  - the exact files to inspect first
- guide the user from repo files and current implementation reality rather than expecting technical repo direction from the user

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
- give a concise repo-state summary when the task is GUI/public-workbench related
- propose the next best small step before widening scope
- proceed directly

## Current repo role split
- `/engine/` = canonical model stack
- `/main/` = bootstrap, operator map, GUI map, capability map, and repo-wide self-reference
- `/solver/` = executable implementation layers
- `index.html`, `workbench-v3.html`, and `/ui-v3/*` = active workbench implementation
- `/.github/workflows/` = automated checks and maintenance flows
- `/cases/` = saved data and smoke tests
- `/catalog/` = discoverable case index for the workbench
- `/tools/js/` = operational JavaScript and GUI inspection tooling
- `/users/` = local user lanes, not repo-wide authority

## Current operational facts
- `/solver/` exists and is active.
- `solver-selftest.yml` checks solver integrity.
- `validate-cases.yml` checks saved cases against solver validation.
- `workbench-v3.html` is the canonical live GUI surface.
- Root `index.html` redirects to the v3 surface.
- Workbench v3 supports:
  - canonical repo case loading
  - local package import
  - case / encoding / reading tabs
  - timeline focus
  - atlas inspection
  - GPT-side reading handoff
- Reading generation remains GPT-side.
- Save/delete/promotion are not browser-native authoring flows.
- The canonical GUI validation/deploy lane is centered on:
  - `gui-structure-check.yml`
  - `gui-live-smoke.yml`
  - `gui-deploy-verify.yml`
  - `gui-force-redeploy.yml`
- GitHub Pages is now configured for GitHub Actions publishing.
- The canonical deploy lane is now working in steady state with deployed smoke passing.
- The repo is past infrastructure rescue and past Pages bootstrap blockage.
- The current lane is user-visible Workbench v3 polish, not renewed architecture rescue.
- Repo-useful tooling and troubleshooting should be discoverable from boot through `/main/INSTRUCTIONS_INDEX.md`, `/main/WORKBENCH_V3_OPERATOR_MAP.md`, and `/PROCEDURE_INDEX.md`.
