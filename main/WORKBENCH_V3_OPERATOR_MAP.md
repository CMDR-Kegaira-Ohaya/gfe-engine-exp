# Workbench v3 Operator Map
[RID_SELFREF_WORKBENCH_V3_OPERATOR_MAP]

This file is the operator-facing map for the canonical live GUI surface.
Use it to restore working context quickly in new sessions when the task concerns the public workbench, GUI behavior, Pages behavior, or the Workbench v3 validation lane.

## Canonical status
[RID_WORKBENCH_V3_CANONICAL_STATUS]
- Canonical live GUI entry: `/workbench-v3.html`
- Root public route: `/index.html` redirects to `./workbench-v3.html`
- Canonical live frontend support surface:
  - `/ui-v3/**`
  - `/solver/**`
  - `/catalog/**`
  - `/cases/**`
  - `/tools/js/gui-*`
  - `/.github/workflows/gui-*`
- `ui-v2/**` and the old root workbench are no longer treated as the live GUI surface

## Current session-start posture
[RID_WORKBENCH_V3_SESSION_START_POSTURE]
- The repo is past infrastructure rescue and past Pages bootstrap blockage.
- GitHub Pages is already on GitHub Actions.
- The canonical deploy lane is now steady-state and should be used, not re-debated.
- The current lane is user-visible Workbench v3 polish.
- Do not reopen major architecture unless a real blocker is found.
- Assume the user may not be technical enough to guide repo architecture; guide from repo files and current implementation reality.
- For GUI/public-workbench sessions, begin with:
  - where we are now
  - the next best small step
  - the exact files to inspect first

## What the GUI is for
[RID_WORKBENCH_V3_PURPOSE]
Workbench v3 is a case-first reader and inspector for:
- canonical case markdown
- canonical case encoding
- saved case reading
- timeline and atlas inspection over the loaded encoding

It is not the place where canonical engine doctrine is defined.
UI code renders and navigates case state; it does not redefine engine meaning.

## Top-level screen model
[RID_WORKBENCH_V3_SCREEN_MODEL]
The visible surface is split into three persistent zones:

### Left column
- Persistent-left atlas
- Side panel for open/package/reading actions

### Center column
- Case header and source/reading/validation badges
- Tabs:
  - `Case`
  - `Case encoding`
  - `Case reading`
- Reader/encoding/reading surface

### Bottom row
- Timeline for step selection, participant focus, and encounter focus

## Main file ownership
[RID_WORKBENCH_V3_FILE_OWNERSHIP]
- `/workbench-v3.html`
  - HTML shell, region layout, buttons, tabs, and mount points
- `/ui-v3/app.js`
  - active app controller for Workbench v3
  - catalog loading
  - case loading
  - local package import
  - reading handoff UI
  - tab state
  - timeline/atlas focus state
  - clear/delete button behavior
- `/ui-v3/atlas-renderer-core.js`
  - atlas structure owner
  - section/view metadata owner
  - atlas-map shell scaffolding owner
- `/ui-v3/atlas-renderer.js`
  - thinner interaction layer
  - detail remap
  - marker build
  - zone build
  - atlas-map wiring
- `/solver/index.js`
  - imported by the GUI for validation/solve/grouping work
- `/catalog/index.json`
  - canonical catalog discovered by the open-case panel
- `/cases/**`
  - canonical stored case artifacts used by the catalog/workbench/validation lane

## How the GUI works
[RID_WORKBENCH_V3_RUNTIME_BEHAVIOR]

### Open case
- The `Open case` mode loads the canonical repo catalog from `/catalog/index.json`
- Selecting a catalog entry loads:
  - case markdown
  - encoding JSON
  - reading markdown when present
- The loaded case becomes the active workbench surface

### Open case package
- The `Open case package` mode supports local import without repo writes
- Supported local import pattern:
  - one encoding `.json`
  - optional case markdown/text
  - optional reading markdown/text
- Imported packages load into the same main timeline/atlas/reading surface as canonical repo cases
- Imported packages are local UI state, not repo writes
- Save/delete/promotion remain GPT-side or workflow-side, not in-browser authoring features

### Generate reading
- Reading generation remains GPT-side
- The GUI provides a suggested GPT handoff cue
- The handoff cue can be copied when clipboard access is available
- The Reading tab shows saved/imported reading when present, otherwise it shows the reading empty state and the GPT handoff path

### Tabs
- `Case` shows the loaded markdown case
- `Case encoding` shows a summary plus raw encoding JSON
- `Case reading` shows the saved/imported reading when present

### Focus model
- Step selection comes from the timeline
- Participant focus and encounter focus also come from the timeline
- The atlas stays local to the selected moment and follows focus changes
- Focus can be:
  - overview
  - participant
  - encounter

### Atlas lenses
Current atlas lenses are:
- `Structure (V)`
- `Relations (H)`
- `Expression (R)`

These change atlas/timeline summaries without changing the underlying encoding.

### Header badges
The center header reports:
- source
- reading availability
- validation state

Source distinguishes canonical repo cases from local imported packages.

### Clear and delete
- `Clear` resets the currently loaded local UI state after confirmation
- `Delete` is not wired as an in-app repo delete path; it only confirms intent and reports that repo-write delete is still GPT-side

## Current GUI support CSS
[RID_WORKBENCH_V3_CSS_SURFACES]
Important GUI style files include:
- `/ui-v3/styles.css`
- `/ui-v3/reading-surfaces.css`
- `/ui-v3/open-panel.css`
- `/ui-v3/palette.css`
- `/ui-v3/layout-atlas-map.css`
- `/ui-v3/atlas-map-enhancer.css`

Treat these as part of the live GUI surface when visual or layout bugs are involved.

## Canonical validation and deploy lane
[RID_WORKBENCH_V3_VALIDATION_LANE]
The canonical operator command is:
```bash
npm run gui:validate-chain -- --base-ref HEAD~1 --head-ref HEAD --copy-scan
```

Important GUI workflows:
- `gui-structure-check.yml`
- `gui-live-smoke.yml`
- `gui-deploy-verify.yml`
- `gui-force-redeploy.yml`

Important GUI validation tools:
- `gui-entry-audit.mjs`
- `gui-cut-check.mjs`
- `gui-live-smoke.mjs`
- `gui-pages-live-smoke.mjs`
- `gui-pages-artifact-verify.mjs`
- `gui-repo-diff.mjs`
- `gui-validate-chain.mjs`

## Pages bootstrap model
[RID_WORKBENCH_V3_PAGES_BOOTSTRAP]
Do not treat `updatePagesSite(build_type="workflow")` as the dependable bootstrap path.

Stable model:
- one-time bootstrap = human/admin UI step:
  - `Settings → Pages → Source → GitHub Actions`
- steady-state deploys = workflow lane after that switch

That bootstrap is already complete for this repo.
The practical model now is steady-state Actions deploy plus deployed smoke.

`gui-deploy-verify.yml` performs a fail-fast Pages bootstrap check:
- if Pages `build_type == workflow`, the deploy lane may continue
- if the repo is still on legacy Pages publishing, the workflow stops with the canonical bootstrap message instead of repeatedly retrying the mode-switch API

## What to inspect first for common GUI tasks
[RID_WORKBENCH_V3_TASK_ROUTING]

### GUI bug
Read in this order:
1. `/main/TOC.md`
2. `/main/GPT_OPERATOR_MANUAL.md`
3. this file
4. `/main/INSTRUCTIONS_INDEX.md`
5. `/workbench-v3.html`
6. relevant `/ui-v3/*`
7. relevant `tools/js/gui-*` tooling or `gui-*` workflows

### Deploy/Pages problem
Read in this order:
1. `/main/INSTRUCTIONS_INDEX.md`
2. this file
3. `/.github/workflows/gui-deploy-verify.yml`
4. `/.github/workflows/gui-live-smoke.yml`
5. current Pages/workflow run state through the connector

### Package/load/import problem
Inspect:
- `/ui-v3/app.js`
- `/catalog/index.json`
- `/cases/**`
- `tools/js/gui-live-smoke.mjs` if the issue looks like a runtime regression

### Atlas/timeline problem
Inspect:
- `/ui-v3/app.js`
- `/ui-v3/atlas-renderer-core.js`
- `/ui-v3/atlas-renderer.js`

## Things future sessions should remember
[RID_WORKBENCH_V3_MEMORY_ANCHORS]
- Workbench v3 is already the canonical live GUI surface
- root `index.html` is a redirect, not the old live workbench
- local package import is real GUI behavior now
- reading generation remains GPT-side
- save/delete/promotion are not browser-native authoring flows
- atlas structure ownership lives in `atlas-renderer-core.js`
- atlas interaction wiring lives in `atlas-renderer.js`
- the deploy lane is now steady-state GitHub Actions Pages deploy plus deployed smoke
- the repo is past infrastructure rescue; current work should default to user-visible polish unless a blocker proves otherwise
- user guidance should come from repo files, not assumed chat memory

## Re-entry shortcut
[RID_WORKBENCH_V3_REENTRY_SHORTCUT]
If a new session starts and the task is GUI-related, the minimum useful recovery path is:
`/main/TOC.md` → `/main/GPT_OPERATOR_MANUAL.md` → `/main/SYSTEM_MAP.md` → this file → `/main/INSTRUCTIONS_INDEX.md`
