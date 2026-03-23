# GPT Capability Surface

This file records the current **GPT Builder connector / API action surface** available in this repository context.
It is operational, not canonical engine doctrine.

This file covers:
- what the custom connector exposes
- which operation families exist through the connector
- practical connector-path implications for repo work

This file does **not** define:
- the effective token permission surface
- repo governance doctrine
- branch protection or repository policy behavior

Do not collapse those layers.
A connector endpoint may exist while the live token or repo policy still blocks the action.

## Capability layers

Distinguish three layers:

1. **Connector action surface**
   - which operations the custom GPT connector exposes
2. **Token permission surface**
   - which of those operations the currently configured token is authorized to perform
3. **Repo policy surface**
   - which operations still depend on branch protection, workflow settings, merge policy, or other repository rules

This file covers **layer 1 only**.
Read `/main/TOKEN_PERMISSION_SURFACE.md` for layer 2.
Read `/main/EDIT_RULES.md` and related repo-operating docs for layer 3.

## Current connector action surface

The current custom GPT connector exposes broad repo-control operations, including:

- repository contents inspection
- arbitrary path read / write / delete through contents endpoints
- legacy `/cases/*` convenience helpers
- branch and ref inspection
- branch creation and ref update
- git-object operations:
  - blob creation
  - tree creation
  - commit creation
- promotion / merge-style branch flows
- Pages inspection
- workflow inspection
- workflow run inspection
- workflow dispatch

## Practical implications

### General repo work
The connector surface can support:
- multi-file repository edits
- arbitrary-path file creation
- arbitrary-path file deletion
- branch-based experimental work
- workflow inspection and dispatch
- Pages-aware repository maintenance
- structural repo reorganization

### Legacy helper caution
The older flat `/cases/{filename}` helper pattern should be treated as a narrow convenience surface, not as the full capability model.

When a task needs nested case folders, manifests, catalogs, or broader repo structure work, prefer the general path-based file operations and, if needed, the lower-level git-object path.

### Write-path fallback note
If direct `saveFile`-style writes become unstable, the lower-level git-object path is part of the current connector surface and may be used as a repo-control fallback.

### Browser app caution
Repo-control capability available to the GPT/operator is not the same thing as a safe browser-app feature.
Do not automatically assume that because the GPT can mutate or delete stored artifacts, the public app should expose the same operation in the same way.

## How to use this file

Read this file:
- after `/main/TOC.md`
- when connector/API capability is relevant to the task
- before assuming a repo limitation that may no longer be true
- before designing around outdated helper-only assumptions

Cross-check with:
- `/main/TOKEN_PERMISSION_SURFACE.md` for the live token permission surface
- `/main/SYSTEM_MAP.md` for structural role mapping
- `/main/EDIT_RULES.md` for governance and edit boundaries
- `/PROCEDURE_INDEX.md` for write-path recovery and stable procedures

## Update rule

Update this file when:
- the custom GPT connector surface changes materially
- new connector operation families are added or removed
- helper-path assumptions used by operators would otherwise drift out of date
