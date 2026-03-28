# GUIGUX rebuild plan (current)

[GUIGUX_REBUILD_PLAN_ROOT]

Purpose: this is the current working plan for the next GUE/WUB rebuild.

Authority:
- if anything here conflicts with `10_SCOPE_LOCK_PIPELINE.md`, the scope lock wins
- `20_WORKING_BOARD.md` now serves as **memory/reference material**, not as the primary plan

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

---

## 5) Current modular target shape

New product/GUI rebuild should be based on small cooperating modules:

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

## CaseBundle minimum

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
- links layer (source → structure → narrative)

---

## 6) Repo split (locked)

`gfe-engine-exp` now serves as **core/archive**:
- `engine/`
- `solver/`
- `cases/`
- `users/DEV/`
- `privacy.html`

The next public product/GUI should be built in a**fresh repo**.

This board describes that next repo direction, not a new monolith inside the core repo.

---

## 7) Next actual build steps

1. Keep this repo clean as core/archive and DEV reference.

2. When the fresh product repo is created, start with:
  - root README
  - tiny entrypoints (`index.html` or equivalent)
  - modular UI folder
  - case loader
   - CaseBundle
   - store
   - specified-view render
   - context panel
   - documents panel

3. First working slice must do:
  - open one case
  - show the whole solved map
  - let the user click around
  - keep source and narrative visibly connected without hijacking the map

4. Only after that slice is stable:
  - add pin behavior
  - add trace behavior
   - add lenses
   - add filters

---

## 8) How to use this file

- use this as the current next-build plan
- use `20_WORKING_BOARD.md` to mine old ideas, not to decide structural truth
- any new GU/UX notes should extend this direction, not reset back into the old shell

---

Last updated: 2026-03-28
