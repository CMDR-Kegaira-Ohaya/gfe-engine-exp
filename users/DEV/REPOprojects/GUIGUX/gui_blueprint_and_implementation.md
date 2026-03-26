# GUI Blueprint and Implementation (Working Board)

**Purpose:** live working board for the canonical Workbench v3 GUI lane.
Use this file to keep current repo truth, current work order, and current operator direction visible in one place.

Use this file to:
- record what is actually live now
- keep the current direction explicit
- prevent drift back to stale migration assumptions
- keep next work readable for future sessions

Do not use this file as:
- engine canon
- solver doctrine
- permanent repo memory outside the current GUI lane

---

## Current progress checkpoint

Current repo truth:
- canonical live GUI entry is `/workbench-v3.html`
- root `/index.html` redirects to `./workbench-v3.html`
- canonical live GUI support surface is:
  - `/ui-v3/**`
  - `/solver/**`
  - `/catalog/**`
  - `/cases/**`
  - `/tools/js/gui-*`
  - `/.github/workflows/gui-*`
- Workbench v3 now supports:
  - canonical repo case loading from `/catalog/index.json`
  - local package import in the browser
  - case / case encoding / case reading tabs
  - persistent-left atlas
  - bottom timeline focus
  - GPT-side reading handoff flow
- reading generation remains GPT-side
- save / delete / promotion are not browser-native authoring flows
- atlas ownership is now split clearly:
  - `ui-v3/atlas-renderer-core.js` = structure / metadata / atlas shell owner
  - `ui-v3/atlas-renderer.js` = interaction / remap / marker / zone wiring layer
- the self-referential repo layer now includes:
  - `/main/TOC.md`
  - `/main/GPT_OPERATOR_MANUAL.md`
  - `/main/SYSTEM_MAP.md`
  - `/main/WORKBENCH_V3_OPERATOR_MAP.md`
  - `/main/INSTRUCTIONS_INDEX.md`
- GitHub Pages is now configured for **GitHub Actions** publishing
- the canonical deploy lane is now working in steady state through `gui-deploy-verify.yml`
- the Actions-based Pages deploy and deployed smoke completed green for commit `f7093fc21832d0419891f554ea56b529704bd81f`

This means the GUI lane is no longer blocked on Pages bootstrap.
The repo is now in the intended steady-state deploy model.

---

## Product posture

Workbench v3 is **reader-first and inspector-first**.

The GUI owns:
- browse
- open
- inspect
- navigate timeline
- navigate atlas
- show artifact/source/validation state
- import local case packages for local use
- provide the reading handoff surface

GPT-side owns:
- generate reading
- save
- delete
- promote
- repo mutation
- workflow dispatch / deeper operator actions

The browser UI should remain cleanly separated from repo-mutation authority.

---

## Locked direction

These are now treated as locked enough to work from:
- Workbench v3 is the only supported live GUI surface
- root `index.html` is a redirect convenience, not a second live workbench
- v2 is not treated as an active GUI target
- package/load/import behavior is part of the real GUI surface now, not placeholder territory
- reading handoff is part of the real GUI surface now, not hidden operator knowledge
- atlas remains the persistent left-side instrument
- timeline remains the bottom focus/navigation instrument
- the current deploy model is:
  - one-time manual Pages bootstrap already completed
  - steady-state Actions deploy through `gui-deploy-verify.yml`
  - deployed smoke after deploy is required
- future sessions should rebuild GUI context from `/main/*`, not from stale chat memory

---

## Live implementation reality

### Entrypoints
- `/workbench-v3.html`
- `/ui-v3/app.js`

### Main runtime ownership
- `/workbench-v3.html`
  - shell layout
  - main regions
  - top actions
  - tabs
  - mount points
- `/ui-v3/app.js`
  - app controller
  - catalog loading
  - case loading
  - local package import
  - reading handoff actions
  - tab state
  - timeline / atlas focus state
- `/ui-v3/atlas-renderer-core.js`
  - atlas structure / metadata / shell scaffolding
- `/ui-v3/atlas-renderer.js`
  - atlas interaction layer
- `/catalog/index.json`
  - canonical catalog for open-case browsing
- `/cases/**`
  - canonical stored case artifacts

### Important support CSS
- `/ui-v3/styles.css`
- `/ui-v3/reading-surfaces.css`
- `/ui-v3/open-panel.css`
- `/ui-v3/palette.css`
- `/ui-v3/layout-atlas-map.css`
- `/ui-v3/atlas-map-enhancer.css`

### Important workflows
- `gui-structure-check.yml`
- `gui-live-smoke.yml`
- `gui-deploy-verify.yml`
- `gui-force-redeploy.yml`

### Important GUI tools
- `gui-entry-audit.mjs`
- `gui-cut-check.mjs`
- `gui-live-smoke.mjs`
- `gui-pages-live-smoke.mjs`
- `gui-pages-artifact-verify.mjs`
- `gui-repo-diff.mjs`
- `gui-validate-chain.mjs`

Canonical operator command:
```bash
npm run gui:validate-chain -- --base-ref HEAD~1 --head-ref HEAD --copy-scan
```

---

## Immediate work order (current)

1. **Keep live deploy confidence high**
   - preserve the now-working Actions Pages lane
   - keep local smoke + deployed smoke green
   - treat `gui-deploy-verify.yml` as authoritative

2. **Continue user-visible Workbench v3 polish**
   - package/load/import surface
   - reading workflow affordances
   - clearer GPT-side handoff in the UI
   - wording consistency across empty states and quick actions

3. **Continue timeline / atlas UX polish**
   - user-visible clarity only
   - preserve the current architecture split
   - avoid reopening architecture migration unless a real blocker appears

4. **Use the self-referential layer as the re-entry guide**
   - future sessions should read `/main/TOC.md`
   - then `/main/GPT_OPERATOR_MANUAL.md`
   - then `/main/SYSTEM_MAP.md`
   - then `/main/WORKBENCH_V3_OPERATOR_MAP.md`
   - then `/main/INSTRUCTIONS_INDEX.md`

5. **Only then consider deeper atlas refinement**
   - no spiraling architecture work
   - no speculative rewrites without a real product need

---

## Current biggest risks

- drifting back into “multiple live surfaces” confusion
- mixing GPT-side repo mutation responsibilities into browser UX
- reopening architecture work when the current lane is user-visible polish
- letting wording drift between:
  - center empty states
  - side panel actions
  - reading handoff surfaces
  - deployed live copy
- forgetting that the deploy model is now stable and should be used, not re-debated

---

## Success condition for the current phase

A user should be able to:
- open a canonical repo case from the live catalog
- import a local case package without confusion
- understand where case / encoding / reading live in the interface
- use the timeline and atlas as the persistent navigation instruments
- understand that reading generation is GPT-side, with a clear handoff path
- see the same intended wording locally and on live Pages
- rely on the Actions deploy lane without manual “did it deploy?” checking
