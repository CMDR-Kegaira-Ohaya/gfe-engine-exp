# GUIGUX rebuild plan (current)

[GUIGUX_REBUILD_PLAN_ROOT]

Purpose: this is the current working plan for the next GUI/workbench rebuild.

Authority:
- if anything here conflicts with `10_SCOPE_LOCK_PIPELINE.md`, the scope lock wins
- `20_WORKING_BOARD.md` now serves as **memory/reference material**, not as the primary plan
- `22_PRODUCT_OPERATING_MAP.md` now holds the **whole-product layer map** so feature work does not drift into isolated additions

---

## 1) Product core (locked)

- This product is for making GFE visible in a clear enough form that others can inspect it, test it, and decide what, if anything, should become of it.
- The first screen should show the studied case as a whole map, in the primary mode implied by solved structure.
- The first thing the user should be able to do is look around and see what the framework did to the case: source → structure → narrative return.

---

## 2) High-level UI doctrine (locked)

- the app is not mainly a reader, dashboard, or tutorial
- it is a **transformation viewer**
- whole before parts
- solved structure before commentary
- transformation before explanation
- orientation must survive every click
- documents stay stable and secondary: source and narrative are companion surfaces, not the main view

---

## 3) Behavior patterns to keep from the old board

Save these ideas from `20_WORKING_BOARD.md`:
- viewport-first thinking
- stable documents contract
- inspect vs pin distinction
- layers as clutter control, not as meaning control
- trace as explicit mode
- phased build discipline

Do not carry over blindly:
- old file paths
- old ui-v3 implementation assumptions
- old shell-specific polish goals
- any assumption that the previous GUI still exists or should be repaired in place

---

## 4) Build doctrine (locked)

- no more giant monolithic files
- no more all-purpose controllers
- thin shell, strong modules, explicit state
- each file owns one job only
- missing artifacts must fail honestly, not mysteriously
- DEV notes guide development but do not become runtime dependencies

---

## 5) Current modular target shape

The product rebuild inside `product/` should be based on small cooperating modules:

- boot shell
- app shell
- data/loader (**CaseBundle**)
- state store
- specified view (the whole solved map)
- context panel
- documents panel
- interactions (selection, pin, trace)
- lenses (structure, relations, process, evidence)
- filters (visibility reduction only)
- repo bridge (profile, guardrails, commands, verification)

### CaseBundle minimum

CaseBundle must contain:
- identity
- status
  - structural: `solved | provisional | absent`
  - artifacts: source / encoding / solve / narrative
- source
- structure
- solve
- narrative
- projection hints
- links layer (source ↔ structure ↔ narrative)

---

## 6) Repo-aware GUI bridge (locked)

The GUI will eventually perform saves, edits, and other repo actions.

To keep this useful but not tangled:
- repo knowledge stays in DEV docs as human-facing memory/doctrine
- runtime uses a distilled machine contract under `product/app/repo/`
- the GUI must **not** mine `users/DEV/` markdown directly at runtime
- when a DEV rule becomes runtime-relevant, promote it once into the repo bridge layer

### Bridge shape

Under `product/app/repo/` keep:
- `repo-profile.js`
- `guardrails.js`
- `verify.js`
- `connector.js` or equivalent connector boundary module
- `commands/`

### Bridge rules

- GUI intent → command → guardrail check → connector call → verification → UI update
- Base64 is transport-only at the connector boundary
- prefer `saveFile` for normal writes
- verify writes actually landed
- keep core and product write zones distinct

### Repo zones

Protected:
- `engine/`
- `solver/`
- `privacy.html`
- `/.github/workflows/` unless explicitly allowed

Controlled:
- `cases/`

Normal product-local:
- `product/`

---

## 7) Build location (locked)

This repo now supports a quarantined product area under `product/`.

That means:
- core remains protected in `engine/`, `solver/`, `cases/`, and `privacy.html`
- GUI/app runtime work lives in `product/`
- DEV notes stay in `users/DEV/`
- the repo remains the canonical template/source

---

## 8) Next actual build steps

1. Keep this repo clean as core/template plus quarantined product area.

2. First working slice must do:
   - open one case
   - show the whole solved map
   - let the user click around
   - keep source and narrative visibly connected without hijacking the map

3. Before deeper mutation features, add the repo-aware bridge layer:
   - repo profile
   - guardrails
   - verification
   - first commands for product-local save and controlled case save

4. Only after the current slice and repo bridge are stable:
   - add pin behavior
   - add trace behavior
   - add lenses
   - add filters
   - add richer repo-edit flows

5. After the first formal lens layer:
   - refine **Evidence lens**
   - add **filters** as clutter control only
   - strengthen **source ↔ structure ↔ narrative** correspondence hints carefully
   - only then add richer mutation/edit flows

---

## 9) How to use this file

- use this as the current next-build plan
- use `20_WORKING_BOARD.md` to mine old ideas, not to decide structural truth
- use `22_PRODUCT_OPERATING_MAP.md` to keep the whole product readable as one system
- any new GUI/UX notes should extend this direction, not reset back into the old shell

---

Last updated: 2026-03-29
