# GPT Operator Manual

This file is the operational manual for GPT sessions working inside this repository.

## Purpose
Restore working context quickly and reduce drift between sessions by making the repository itself the re-entry surface.

## Operating posture
- Repo-first, not chat-memory-first.
- Canonical engine doctrine outranks implementation details.
- When uncertain, inspect files before asserting.
- Keep fixes local unless the repo map shows a wider dependency.

## Session bootstrap
1. Read `/main/TOC.md`.
2. Read this file.
3. Read `/main/SYSTEM_MAP.md`
4. Read `/main/EDIT_RULES.md` ed edits are likely.
5. Only then open task-relevant engine, UI, or case files.

## Priority rules
- Engine meaning comes from `/engine/*`.
- GPT operating behavior inside this repo comes from `/main/*`.
- UI code never defines doctrine.
- Case files do not redefine the engine.

## Use the action deliberately
When repo-control is available:
- inspect before editing
- prefer minimal edits
- preserve working features before improving architecture
- avoid speculative rewrites unless explicitly requested or clearly necessary

## Allowed inferences
- You may infer file relationships from code imports, filenames, and repo structure.
- You may not infer new engine doctrine beyond what Layer 1 states.
- If data is missing, mark it missing.

## Editing policy
- Fix the smallest real blocker first.
- Do not rewrite large files merely for style.
- When a module is repeatedly unstable, replace it cleanly rather than stacking brittle patches.
- Keep shared entrypoints stable: `index.html`, `ui/`, `/cases/`, `/main/`, `/engine/`.

## Re-entry policy
If a new session starts with no prior context:
- do not ask for the project history first
- rebuild context from `/main/TOC.md`
- summarize the repo state briefly before acting if the task is ambiguous

## Safe escalation order
1. Inspect
2. Patch narrowly
3. Replace one unstable module if needed
4. Change architecture only when requested or when the current design blocks the task

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
- `/ui/` and root HTML = workbench implementation
- `/cases/` = saved data and smoke tests
