# GPT Capability Surface
[RID_SELFREF_GPT_CAPABILITY_SURFACE]

This file records the current **custom GPT API action surface** available in this repository context.
It is operational, not canonical engine doctrine.

This file covers:
- what the active custom GPT API action exposes
- which operation families exist through that action
- practical action-path implications for repo work

This file does **not** define:
- the effective token permission surface
- repo governance doctrine
- branch protection or repository policy behavior

Do not collapse those layers.
An action endpoint may exist while the live token or repo policy still blocks the action.

## Capability layers
[RID_CAPABILITY_LAYERS]

Distinguish three layers:

1. **Connector action surface**
   - which operations the current custom GPT API action exposes
2. **Token permission surface**
   - which of those operations the currently configured token is authorized to perform
3. **Repo policy surface**
   - which operations still depend on branch protection, workflow settings, merge policy, or other repository rules

This file covers **Layer 1 only**.
Read `/main/TOKEN_PERMISSION_SURFACE.md` for Layer 2.
Read `/main/EDIT_RULES.md` and related repo-operating docs for Layer 3.

## Current active GFE custom GPT Action
[RID_CAPABILITY_CONNECTOR_SURFACE]

The current active custom GPT API action for this repo targets:
- `https://api.github.com/repos/CMDR-Kegaira-Ohaya/gfe-engine-exp`

The current live connector pack is a **30-operation action surface**.

The current active operation set is:

### Contents and path operations
- `listRoot` — `GET /contents`
- `getPath` — `GET /contents/{path}`
- `saveFile` — `PUT /contents/{path}`
- `deleteFile` — `DELETE /contents/{path}`
- `listCases` — `GET /contents/cases`

### Branch and ref operations
- `listBranches` — `GET /branches`
- `getBranchRef` — `GET /git/ref/heads/{branch}`
- `getRef` — `GET /git/ref/{ref}`
- `createBranch` — `POST /git/refs`
- `updateRef` — `PATCH /git/refs/{ref}`

### Git object operations
- `getTree` — `GET /git/trees/{tree_sha}`
- `createBlob` — `POST /git/blobs`
- `createTree` — `POST /git/trees`
- `getCommit` — `GET /git/commits/{commit_sha}`
- `createCommit` — `POST /git/commits`

### Merge and promotion operations
- `promoteCases` — `POST /merges`

### Pages operations
- `getPagesSite` — `GET /pages`
- `updatePagesSite` — `PUT /pages`
- `requestPagesBuild` — `POST /pages/builds`
- `getLatestPagesBuild` — `GET /pages/builds/latest`

### Workflow and run operations
- `listWorkflows` — `GET /actions/workflows`
- `listWorkflowRuns` — `GET /actions/workflows/{workflow_id}/runs`
- `getWorkflowRun` — `GET /actions/runs/{run_id}`
- `dispatchWorkflow` — `POST /actions/workflows/{workflow_id}/dispatches`
- `listWorkflowRunArtifacts` — `GET /actions/runs/{run_id}/artifacts`
- `listWorkflowRunJobs` — `GET /actions/runs/{run_id}/jobs`
- `rerunWorkflowRun` — `POST /actions/runs/{run_id}/rerun`
- `rerunFailedJobs` — `POST /actions/runs/{run_id}/rerun-failed-jobs`
- `cancelWorkflowRun` — `POST /actions/runs/{run_id}/cancel
- `forceCancelWorkflowRun` — `POST /actions/runs/{run_id}/force-cancel

## Practical implications
[RID_CAPABILITY_PRACTICAL_IMPLICATIONS]

### General repo work
The current action surface supports:
- root and arbitrary-path repository inspection
- arbitrary-path file create / update / delete through contents endpoints
- top-level case listing through `/contents/cases`
- branch listing, branch creation, and ref inspection/update
- lower-level git-object fallback work through blob / tree / commit operations
- merge-style promotion flows
- Pages inspection and Pages settings update
- workflow inspection, workflow dispatch, workflow rerun/cancel control, job inspection, and run-artifact inspection

### Pages-control implications
The connector can now:
- inspect the current GitHub Pages site
- attempt to switch Pages source behavior through `updatePagesSite`
- request a Pages build
- inspect the latest Pages build state

Do **not** treat `updatePagesSite(build_type="workflow")` as a dependable bootstrap path.
The stable operating model is:
- one-time manual bootstrap in repo UI: `Settings → Pages → Source → GitHub Actions`
- steady-state automation through the canonical workflow deploy lane after that switch

The API path remains useful for explicit admin testing and classification work, but a persistent `403` there should be treated as an auth/policy problem, not as a reason to redesign steady-state deployment around repeated mode-switch attempts.

### Workflow-control implications
The connector can now:
- list workflow-run artifacts for verification work
- list jobs for a workflow run
- rerun a whole workflow run
- rerun only failed jobs from a run
- cancel or force-cancel stuck runs

This materially improves deploy recovery and validation-loop control for the canonical Workbench v3 GUI lane.

### Token-versus-connector note
The token permission surface may include broader families than the current connector exposes.
For example, the live token permission record includes **Repository hooks — read / write** and **Security events — read / write**, but the current custom GPT action surface still does **not** expose repository-hook or security-event CRUD endpoints.

So broader authority should not be treated as a blocker assumption, but it also should not be treated as a directly callable connector capability unless the action surface is expanded.

### Current path model note
The active file surface is the generic `/contents/{path}` model.
That means nested repository paths are part of the intended working surface.

 `listCases` remains a convenience helper for top-level `/cases` inspection, not the full file-capability model.

### Ref-path note
Use `getBranchRef` for simple `heads/{branch}` lookups.
Use `getRef` and `updateRef` when the ref path itself matters more generally.

### Legacy-surface note
This active GFE action surface does **not** rely on older flat case-helper write/read/delete operations.
The generic path-based contents endpoints and the git-object endpoints are the primary control surface.

In the current 30-operation pack, the older case-specific helper trio is intentionally not part of the live connector pack:
- `getCase`
- `saveCase`
- `deleteCase`

### Browser app caution
Repo-control capability available to the GPT/operator is not the same thing as a safe browser-app feature.
Do not automatically assume that because the GPT can mutate or delete stored artifacts, the public app should expose the same operation in the same way.

## How to use this file
[RID_CAPABILITY_USAGE]

Read this file:
- after `/main/TOC.md`
- when custom GPT API action capability is relevant to the task
- before assuming a repo limitation that may no longer be true
- before designing around outdated or legacy-helper-only assumptions

Cross-check with:
- `/main/TOKEN_PERMISSION_SURFACE.md` for the live token permission surface
- `/main/SYSTEM_MAP.md` for structural role mapping
- `/main/EDIT_RULES.md` for governance and edit boundaries
- `/PROCEDURE_INDEX.md` for write-path recovery and stable procedures

## Update rule

Update this file when:
- the active custom GPT API action surface changes materially
- operation families are added or removed
- endpoint assumptions used by operators would otherwise drift out of date
- the active repo target changes
