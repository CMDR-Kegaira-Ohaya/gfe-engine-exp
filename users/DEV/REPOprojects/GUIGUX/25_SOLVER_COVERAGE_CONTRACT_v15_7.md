# GUIGUX solver coverage contract — v15.7

[GUIGUX_SOLVER_COVERAGE_CONTRACT_V15_7]

Links back to:
- `[GUIGUX_SCOPE_LOCK_ROOT]`
- `[GUIGUX_PIPELINE_CONTRACT]`
- `[GUIGUX_SOLVER_AUTHORITY_LAW]`
- `[GUIGUX_SOLVER_COVERAGE_PROGRAM_V15_7]`

---

## 1) Purpose

This file formalizes the solver coverage contract against the frozen v15.7 engine canon and defines the Phase 0 proof base.

It exists to stop solver-modernization work from splitting into parallel end states:
- a program note that says where we are going
- ad hoc implementation judgments that silently redefine what “Full” means

This file is therefore the execution contract under `24_SOLVER_COVERAGE_PROGRAM_v15_7.md`, not a second plan beside it.

---

## 2) Authority and convergence rule

Authority order:
1. `10_SCOPE_LOCK_PIPELINE.md`
2. `24_SOLVER_COVERAGE_PROGRAM_v15_7.md`
3. this file

Meaning:
- the scope lock still owns system posture
- the solver coverage program still owns the phased modernization direction
- this file owns the formal test meaning of coverage status, especially `parsed-only -> partial -> full`

Convergence rule:
- do not create sibling notes that redefine `Full`, fixture classes, invariant sets, or final validation target
- update this file when the contract sharpens
- update `24_SOLVER_COVERAGE_PROGRAM_v15_7.md` only when the phase program itself changes
- use working-board notes only for status/memory, not for redefining the contract

---

## 3) Frozen target

Canon frozen at v15.7:
- `engine/spec_v15_7.md`
- `engine/gfe_exp_engine_core_v15_7.md`

The current solver may be reshaped into a single canonical runtime, but no new canon is added during this program.

The old solver may be used briefly as a comparison harness or regression oracle.
It must not remain a second live truth.

---

## 4) Coverage matrix rows

Use these rows as the current contract surface for v15.7 coverage:

1. `AXIS_LOCAL_CORE`
2. `RELATION_TRIAD`
3. `THRESHOLD_PREVALENCE`
4. `FAMILY_TRUTH`
5. `FAILURE_OVERFLOW`
6. `FAILURE_SUBSTITUTION`
7. `FAILURE_PLASTIC_DEFORMATION`
8. `FAILURE_SUPPRESSION`
9. `FAILURE_COLLAPSE`
10. `FACE_DISTINCTION`
11. `ORDER_RECURSION`
12. `LEG_DISTRIBUTED`
13. `FIELD_RECURSION`

If the implementation later splits a row internally, coverage reporting must still roll back up to these contract rows unless this file is revised explicitly.

---

## 5) Coverage states

Every contract row must be in exactly one state:

### `parsed-only`
The distinction is named, parsed, schema-carried, or heuristically approximated, but does not yet have its own proven executable behavior.

### `partial`
Some executable handling exists, but at least one of the required proofs for `full` is still missing.

### `full`
The distinction has canon-linked executable logic, behaviorally distinct process handling, row-level proof fixtures, row-level invariant tests, and usable solver-derived outputs.

No row may be called `full` merely because:
- fields exist
- labels are recognized
- outputs look plausible
- smoke tests pass
- an older runtime is still quietly doing the real structural work

---

## 6) Acceptance criteria for `Full`

A row counts as `full` only when all of the following are true.

### A. Canon anchor
The row is mapped back to explicit v15.7 distinctions it is realizing.

### B. Executable independence
The row has its own executable logic.
It is not merely metadata, passthrough, or generic delta-routing.

### C. Behavioral contrast proof
At least one paired test shows that changing the row’s governing distinction changes solver behavior in the expected row-specific way while nearby factors are held fixed.

### D. Invariant pass
The row passes:
- cross-phase invariants
- row-local invariants
- neighbor-separation invariants

### E. Public-path proof
The behavior is proven through the canonical solver runtime path, not only inside a private helper.

### F. Exposed output contract
The solver exposes row-relevant outputs in usable form for later interpretation and GUI projection.

### G. Non-collapse proof
The row proves it has not been flattened into a neighboring distinction or generic weighted behavior.

### H. Old-runtime independence
The row does not depend on the old solver remaining the live structural authority.

### I. Evidence bundle present
The row has, at minimum:
- one golden fixture
- one contrast fixture
- one invariant suite
- one output assertion set

If any one of these is missing, the row is not `full`.

---

## 7) Cross-phase invariants

These invariants apply across the whole solver-modernization program.

1. **Solver truth invariant**  
   Structural truth comes from solver execution, not GPT prose.

2. **One-runtime invariant**  
   There is only one live canonical runtime.

3. **Structure/process separation**  
   Structural axes do not share the same slot as process distinctions.

4. **Relation-triad separation**  
   `source`, `medium`, and `receiving` remain distinct participations in encounter logic.

5. **Payload-process separation**  
   `acute / accumulated` and `retained / emitted` remain distinct process distinctions.

6. **Order separation**  
   Depth order remains distinct from scan/read order.

7. **Face separation**  
   Inner landing and outer emission remain distinct process positions.

8. **Threshold mirror invariant**  
   Threshold behavior remains mirrored under prevailing aligned vs prevailing maladaptive conditions; destructive contraction is not reduced to ordinary rerouting.

9. **Family-truth invariant**  
   alignment / misalignment / destruction remain whole-family truths, not mere scalar labels.

10. **Failure-grammar invariant**  
    overflow / substitution / plastic deformation / suppression / collapse remain behaviorally distinct.

11. **Leg persistence invariant**  
    distributed Leg is not reduced to a renamed local signature.

12. **Determinism invariant**  
    the same validated input through the same canonical runtime yields the same structural result.

---

## 8) Phase 0 proof base

Phase 0 is complete only when the proof base below exists in defined form.
This does not require a polished final corpus yet.
It does require stable fixture names, expected assertions, and explicit falsification conditions.

### 8.1 Fixture classes

Every covered row must eventually have fixtures from these classes:
- `golden`
- `contrast`
- `anti-collapse`
- `integration`

### 8.2 Minimum named Phase 0 fixtures

#### `FX-CORE-01`
ARI local-state sanity across maintained axes.
Purpose: prove local axis math is coherent under retained/emitted handling.

#### `FX-REL-01`
Medium sensitivity.
Purpose: changing `medium` while holding source and receiving fixed changes relation outcome.

#### `FX-REL-02`
Medium not optional.
Purpose: prove binary shorthand does not erase medium participation.

#### `FX-THR-01`
Mirrored threshold.
Purpose: prove threshold behavior changes correctly under aligned-prevalent vs maladaptive-prevalent conditions.

#### `FX-FAM-01`
Family interference.
Purpose: prove aligned and misaligned payloads interfere relationally, not as a single scalar average.

#### `FX-FAIL-01`
Overflow vs substitution split.
Purpose: prove overflow and substitution are distinct executable grammars.

#### `FX-FAIL-02`
Plastic deformation.
Purpose: prove accumulated retained loading can alter maintained form rather than only transient intensity.

#### `FX-FAIL-03`
Suppression vs collapse split.
Purpose: prove suppression is not just a softer label for collapse.

#### `FX-FACE-01`
Inner vs outer distinction.
Purpose: prove first landing and outward emission produce distinct solver consequences.

#### `FX-ORD-01`
Depth over scan.
Purpose: prove structural order governs when scan order is held apart.

#### `FX-LEG-01`
Local vs distributed Leg.
Purpose: prove distributed readable trace persistence is more than renamed local Leg.

#### `FX-FIELD-01`
Field recursion.
Purpose: prove field/regime-space changes local admissibility and resolution, not just commentary.

### 8.3 Row-local invariant suites

Each contract row must define:
- row-shape invariants
- neighbor-separation invariants
- output invariants
- regression invariants

Minimum required expectations by row:

- `AXIS_LOCAL_CORE`  
  ARI coherence; maintained-axis semantics stay distinct.

- `RELATION_TRIAD`  
  medium sensitivity; source / medium / receiving non-collapse.

- `THRESHOLD_PREVALENCE`  
  mirror behavior; compensation not confused with success.

- `FAMILY_TRUTH`  
  aligned / misaligned / destructive remain distinct family truths.

- `FAILURE_*` rows  
  each grammar has distinct trigger pattern, distinct state effect, and distinct exposed output.

- `FACE_DISTINCTION`  
  first landing at inner face; outer emission remains distinct.

- `ORDER_RECURSION`  
  depth-order dependence not reducible to read order.

- `LEG_DISTRIBUTED`  
  distributed persistence not reducible to local signature.

- `FIELD_RECURSION`  
  field changes live regime-space admissibility and handling.

---

## 9) Phase-local pass rule

A modernization phase passes locally only when:
- target rows have named fixtures
- those fixtures run through canonical solver entrypoints
- row-local invariants pass
- neighbor-separation tests pass
- output assertions pass
- no anti-collapse test is still failing

A phase does not pass merely because:
- new fields were added
- code paths exist
- the GUI can display something
- smoke tests happen to succeed

---

## 10) Final validation target

Program-end validation is reached only when all of the following are true:

1. every contract row is `full`
2. the modern validation corpus exists for:
   - triadic encounter
   - threshold
   - family interference
   - each failure grammar
   - face distinction
   - order recursion
   - distributed Leg
   - field recursion
3. all cross-phase invariants pass on the canonical runtime
4. all row-local invariant suites pass
5. public solver entrypoints remain the authoritative path
6. GUI and interpretation consume canonical solver-derived structure only
7. the old solver is no longer live truth

---

## 11) Update rule

When new solver-coverage work is added:
- extend this contract rather than spawning parallel acceptance notes
- keep phase direction in `24_SOLVER_COVERAGE_PROGRAM_v15_7.md`
- keep memory/status notes out of authority over `full`

This is how the work converges sanely:
- one scope lock
- one program note
- one coverage contract
- one live runtime

---

## 12) Simple decision line

A solver coverage row is `full` only when v15.7-distinct executable logic is proven by fixtures, invariants, public-path execution, and exposed outputs without collapse into generic behavior and without dependence on a second live runtime.

Last updated: 2026-03-30
