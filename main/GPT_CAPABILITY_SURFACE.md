# GPT Capability Surface
[RID_SELFREF_GPT_CAPABILITY_SURFACE]

This file records the current **custom GPT API action surface** available in this repository context.
It is operational, not canonical engine doctrine.

This file covers:
- what the current custom GPT API action exposes
- which operation families exist through that action
- practical action-path implications for repo work

This file does **not** define:
- the effective token permission surface
- repo governance doctrine
- branch protection or repository policy behavior

## Capability layers
[RID_CAPABILITY_LAYERS]

Distinguish three layers:
1. **Connector action surface**
   - which operations the custom GPT API action exposes
2. **Token permission surface**
   - which of those operations the currently configured token is authorized to perform
3. **Repo policy surface**
   - which operations still depend on branch protection, workflow settings, merge policy, or other repository rules

This file covers **Layer 1 only**.
Read `/main/TOKEN_PERMISSION_SURFACE.md` for Layer 2.
Read `/main/EDIT_RULES.md` and related repo-operating docs for Layer 3.

## Current working custom GPT API action
[RID_CAPABILITY_CONNECTOR_SURFACE]

As currently configured, the custom GPT API action:
- is titled **TARS GitHub Repo Connector**
- targets **CMDR-Kegaira-Ohaya/tars-memory-vault**, not this repository by default
- uses `servers: - url: https://api.github.com`
- is intended for GPT Actions with **API Key -> Bearer** authentication
- specifies that the PAT should be stored in the GPT Action editor, not in the OPENAPI file

This file must not collapse the custom GPT Action repo target with the current chat repo target. They are separate surfaces.

## Current action operation families

The current working custom GPT API action exposes at least these operation families:

- **Auth/identity**
  - `getAuthenticatedUser`
  - `getRepository`

- **Contents/path operations**
  - `listRoot`
  - `getPath`
  - `saveFile`
  - `deleteFile`

- **Branches/refs**
  - `listBranches`
  - `getBranchRef`
  - `createBranch`
  - `getGitRefFresh`
  - `updateGitRefFresh`

- **Git objects**
  - `getTree`
  - `createBlob`
  - `createTree`
  - `getCommit`
  - `createCommit`

- **Pull requests and merges**
  - `listPullRequests`
  - `createPullRequest`
  - `getPullRequest`
  - `updatePullRequest`
  - `mergePullRequest`
  - `mergeBranch`

- **Actions/workflows/runs**
  - `listWorkflows`
  - `listWorkflowRuns`
  - `getWorkflowRun`
  - `rerunWorkflowRun`
  - `cancelWorkflowRun`
  - `dispatchWorkflow`

- **Repository_dispatch**
  - `repositoryDispatch`

- **Pages**
  - `getPagesSite`

## Current action structural notes

- Legacy ref operations are explicitly removed. Use ``getGitRefFresh`` and ``updateGitRefFresh` only.
- Ganeric path-based contents operations are the primary file surface.
  They are not restricted to a case-only helper pattern.
- The `getPath` path parameter is marked ``allowReserved: true`` in the custom GPT Action spec, so nested paths are intended to be supported by the action surface.
- The action surface now includes PR/merge control and both workflow_dispatch and repository_dispatch surfaces.

## Practical implications

- Do not assume that the current custom GPT Action writes to this repository by default. It currently targets `CMDR-Kegaira-Ohaya/tars-memory-vault`.
- When a task concerns this repo specifically, prefer the active repo-control surface that targets this repo directly.
- When a task concerns the TARS repo, the custom GPT API action is now broad enough for contents, branches, refs, git objects, PRs, merges, workflows, dispatches, and Pages inspection.
- Connector capability alone does not prove that an operation is permitted. Cross-check the token permission surface and repo policy surface before assuming a write, merge, or dispatch should succeed.

## How to use this file

Read this file:
- after `/main/TOC.md`
- when custom GPT API Action capability is relevant to the task
- before assuming that a repo limitation is tooling-wide when it may actually be repo-target specific
- before designing around outdated or legacy-helper-only assumptions

## Update rule

Update this file when:
- the custom GPT API action surface changes materially
- the action's repo target changes
- legacy/fresh ref assumptions change
- operator assumptions about which GPT Action surface is current would otherwise drift out of date
