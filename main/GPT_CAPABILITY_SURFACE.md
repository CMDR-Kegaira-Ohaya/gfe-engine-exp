# GPT Capability Surface

This file records the current repo-control capability surface available to the GPT in this repository context.
It is operational, not canonical engine doctrine.

Use it when the task concerns:
- what the GPT can inspect or mutate in the repo
- whether a planned repo operation is supported by the custom action surface
- how token permissions differ from repo protections or branch policy
- whether to prefer general-path repo operations over narrower legacy helpers

## Capability layers

Distinguish three layers:

1. **Action surface**
   - which operations the custom GPT action exposes
2. **Token permission surface**
   - which of those operations the configured token is authorized to perform
3. **Repo policy surface**
   - which operations still depend on branch protection, workflow settings, merge policy, or other repository rules

Do not collapse these layers.
An endpoint may exist but still fail because of token scope or repo policy.
A token may allow an operation that the current repository settings still block.

## Current action surface

The custom GPT action surface currently exposes broad repo-control operations, including:

- repository contents inspection
- arbitrary path read / write / delete
- legacy `/cases` convenience helpers
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

## Current token permission surface

As reported from the active configuration in this deployment, the token capability surface is broad and includes at least:

- **Actions**: read / write
- **Commit statuses**: read / write
- **Contents**: read / write
- **Custom properties**: read / write
- **Deployments**: read / write
- **Issues**: read / write
- **Merge queues**: read / write
- **Pages**: read / write
- **Pull requests**: read / write
- **Workflows**: read / write
- **Metadata**: read-only

This means the GPT should not assume a narrow read-only or file-only token by default.

## Practical implications

### General repo work
The GPT can usually plan around:
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

### Delete caution
Repo deletion is possible in principle through the repo-control surface, but destructive actions should still be treated as:
- explicitly scoped
- confirmed
- aware of repo policy and branch protections

### Browser app caution
Repo-control capability available to the GPT/operator is not the same thing as a safe browser-app feature.
Do not automatically assume that because the GPT can mutate or delete stored artifacts, the public app should expose the same operation in the same way.

## How to use this file

Read this file:
- after `/main/TOC.md`
- when repo-control capability is relevant to the task
- before assuming a repo limitation that may no longer be true
- before designing around outdated flat-storage assumptions

Cross-check with:
- `/main/SYSTEM_MAP.md` for structural role mapping
- `/main/INSTRUCTIONS_INDEX.md` for operational helper surfaces
- `/PROCEDURE_INDEX.md` for stable procedures and recovery paths

## Update rule

Update this file when:
- the custom GPT action surface changes materially
- the token permission surface changes materially
- repo-control assumptions used by operators or future GPT sessions would otherwise drift out of date
