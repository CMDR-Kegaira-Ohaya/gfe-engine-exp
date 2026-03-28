# Product operating map

[PRODUCT_OPERATING_MAP_ROOT]

Purpose: keep the whole product readable as one coherent system while the build proceeds in small modules.

This file is not a runtime dependency.
It is a development-side whole-product map so new work does not drift into isolated feature additions.

---

## 1) Product purpose

The product is a **transformation viewer** for a studied case.

It exists to let a user:
- open a case as a whole transformed map
- inspect what happened from source -> structure -> narrative return
- maintain orientation while changing reading mode
- understand what is present, what is missing, and what is only provisional

The product is **not** mainly:
- a dashboard
- a repo cockpit
- a freeform editor
- a tutorial shell
- a second solver

---

## 2) Whole-product layer order

Use this fixed order when reasoning about the product:

1. **Case truth layer**
   - case folder
   - source
   - structure / encoding
   - narrative
   - manifest-defined current paths

2. **Viewing layer**
   - Structure lens
   - Process lens
   - Evidence lens

3. **Interaction layer**
   - inspect
   - pin
   - trace
   - later: filters

4. **Companion surfaces**
   - Context Panel
   - Documents Panel
   - later correspondence hints

5. **Mutation layer**
   - product-local save
   - controlled case save
   - later richer edit flows

Rule:
- each new feature must declare which layer it belongs to
- do not let a lower layer invade a higher one by convenience

---

## 3) Layer roles

### 3.1 Case truth layer

This is canonical and case-local.

It must remain:
- separate from GUI convenience state
- separate from lens behavior
- separate from interaction state
- separate from repo control logic

The GUI reads this layer.
It does not redefine it.

### 3.2 Viewing layer

Lenses are disciplined readings of the same case.
They do not create different cases.

Current lens intent:
- **Structure** = whole solved arrangement first
- **Process** = continuity through moments first
- **Evidence** = available artifacts and payload-bearing moments first, without pretending deeper correspondence is solved when it is not

Rules:
- a lens may change emphasis
- a lens may change summaries and mild visual priority
- a lens must not mutate case truth
- a lens must not destroy orientation

### 3.3 Interaction layer

Interaction changes focus, not truth.

Roles:
- **inspect** = immediate local focus
- **pin** = stable retained focus
- **trace** = explicit continuity-following mode
- **filters** = visibility reduction only

Rules:
- inspect is strongest local emphasis
- pin is steady secondary emphasis
- trace is distributed continuity emphasis
- filters must reduce clutter only, not alter meaning

### 3.4 Companion surfaces

These carry explanation without stealing the map.

Context Panel:
- explain current lens
- explain inspect / pin / trace state
- summarize current target
- hold more of the prose burden than the main view

Documents Panel:
- remain stable
- respond gently to current focus
- do not auto-jump
- do not become the primary screen

### 3.5 Mutation layer

This is downstream from viewing.

Rules:
- save/edit flows are guarded
- they must remain explicit
- they must not collapse the product into a repo-control cockpit
- viewing must remain primary even when edit flows exist

---

## 4) Stable screen contract

The stable screen contract should remain:
- left = case choice / overall entry
- center = specified view / whole map
- right = companion surfaces

Rules:
- avoid layout jumps between lenses
- avoid major reflow when trace starts
- avoid turning side panels into modal replacements for the map

---

## 5) Visual hierarchy contract

Use this hierarchy consistently:
- whole map first
- current lens second
- inspect target strongest local signal
- pinned target steady secondary signal
- traced continuity soft distributed signal
- documents/context supportive, not dominant

Animation/motion rule:
- soft glow
- soft pulse
- fades and highlights
- no strobe
- no aggressive auto-motion

---

## 6) What each lens is allowed to do

### Structure lens
Allowed:
- emphasize whole arrangement
- keep all moments legible
- show process trace only as a quiet overlay when active

Not allowed:
- collapse into process-only reading
- over-muted non-traced regions by default

### Process lens
Allowed:
- privilege temporal continuity
- elevate the active flow and anchor
- keep non-flow material visible but quieter

Not allowed:
- imply multi-participant relations are required for usefulness
- erase single-participant readability

### Evidence lens
Allowed:
- emphasize available artifacts
- elevate payload-bearing moments
- surface what is present vs absent
- stay explicit about provisional status

Not allowed:
- invent solved correspondence that does not yet exist
- pretend source -> structure -> narrative linkage is already complete when it is not

---

## 7) What filters are allowed to do later

Filters are not new interpretations.
They are clutter control only.

Allowed future filters:
- show traced flow only
- reduce untraced detail density
- show payload-bearing moments only
- hide secondary detail unless inspected or pinned

Not allowed:
- semantic rewriting
- changing case truth
- hiding critical uncertainty markers

---

## 8) Correspondence growth path

The product will eventually want stronger source -> structure -> narrative correspondence.

But until real correspondence logic exists, keep these distinct:
- actual solved/available links
- GPT-side helpful interpretation
- visual hints
- unknown / not-yet-derived relations

Rule:
- never let suggestive UI styling silently pretend a solved linkage exists when it does not

---

## 9) Near-term build order

After the first formal lens layer:

1. refine **Evidence lens**
2. add **filters** as clutter control only
3. strengthen **source -> structure -> narrative** correspondence hints carefully
4. only then add richer mutation/edit flows

---

## 10) Use rule for future work

Before adding any feature, answer:
- which layer is this in?
- what remains stable while it changes?
- does it reveal structure, or merely decorate it?
- does it preserve whole-before-parts orientation?
- does it stay honest about what is unknown or provisional?

If those answers are weak, do not build yet.

---

Last updated: 2026-03-29
