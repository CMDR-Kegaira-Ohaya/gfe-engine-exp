# Solver coverage program — v15.7

[GUIGUX_SOLVER_COVERAGE_PROGRAM_V15_7]

Links back to:
- `[GUIGUX_LAYER_OWNERSHIP]`
- `[GUIGUX_PIPELINE_CONTRACT]`
- `[GUIGUX_SOLVER_AUTHORITY_LAW]`
- `[GUIGUX_GUI_PROJECTION_CONTRACT]`

---

## 1) Purpose

This note locks the solver-expansion program against the frozen engine canon at v15.7. It exists to prevent solver work from drifting into either a) patch-stacking on top of an old runtime or b) vague “make it smarter” scope creep.

Target: move every solver-coverage matrix entry to **Full** against the v15.7 engine only.

Formal contract note:
- `25_SOLVER_COVERAGE_CONTRACT_v15_7.md` now owns the formal meaning of coverage status, `Full`, Phase 0 proof base, and final validation target.
- This file remains the program / phasing note, not a competing acceptance contract.

---

## 2) Frozen target

Canon frozen:
- `engine/spec_v15_7.md`
- `engine/gfe_exp_engine_core_v15_7.md`

Definition: an entry counts as **Full** only when it:
- has its own executable logic, actually distinct from neighboring processes
- is not merely parsed, named, or heuristically imitated
- passes golden cases and invariant tests
- exposes usable solver-derived output for interpretation/GUI
- does not collapse engine process distinctions into generic weighted deltas

---

## 3) Decision: one runtime, not two live runtimes

Decision:
- do **not** keep two long-lived production/GUI-facing solvers alive at once
- do **not** build a new runtime merely as added layers on top of the old solver if that preserves the old solver as the real logic center
- shape the current solver into a single canonical runtime through a phased migration

Reason:
- two live runtimes mean two structural truth candidates, even if we pretend otherwise
- the scope-lock pipeline gives solver the structural authority slot; splitting that slot creates dragging ambiguity
- the current solver is already outdated relative to v15.7, so keeping it as a parallel live engine only prolongs the gap
- the GUI must not project conflicting solver truths

Permitted temporary helper (allowed, not live canon):
- the old solver may be used briefly as a comparison harness or matching regression oracle
- it must not be the GUI/runtime truth once the new phased runtime slot replaces it

---

## 4) Architecture decision: reshape, do not wrapper-stack

The solver should be reshaped into a process-grammar runtime, not merely extended as an axis-delta runtime with extra decoration.

That means:
- keep the valuable core local-axis math where it still fits
- move the solver center of gravity from "aggregate events -> update axes"  
  toward "encounter grammar -> process distinctions -> local state participation -> output"
- make relation, face, family, failure, order, and distributed Leg first-class solver processes

## 5) Target shape of the single runtime

Likely module families:
- `solver/relation.js` — triadic encounter: source / medium / receiving
- `solver/face.js` — inner landing / outer emission process
- `solver/family.js` — family-truth resolution in encounter
- `solver/failure.js` — overflow / substitution / plastic deformation / suppression / collapse grammars
- `solver/order.js` — formed-order recursion
- `solver/field.js` — field recursion
- `solver/leg_distributed.js` — distributed Leg/trace persistence
- `solver/axis-local.js` — local axis ARI math (reshaped from current state/envelope/prevalence core where appropriate)

The public solver api should remain clean:
- `solveCase`
- `solveParticipantStep`
- validation entrypoints
(number of internal modules may grow as needed)

---

## 6) Coverage goal status target

Every coverage-matrix entry must move through:

**parsed-only -> partial -> full**

Full target includes:
- executable logic
- distinct process behavior
- golden case tests
- invariant tests
- clean exposed outputs for GUI/interpretation

---

## 7) Phased implementation order

### Phase 0 — Contract and test base
- write the solver coverage contract against v15.7
- define golden cases for each major process family
- define invariant test sets
- done when "full" has an objective test meaning

### Phase 1 — Triadic relation solver
- make `source / medium / receiving` a first-class executable encounter
- move `alpha_medium` from parsed metadata to active solver participation
- done when family-truth and payload path handling change if the medium changes

### Phase 2 — Failure grammar separation
- make overflow, substitution, plastic deformation, suppression, and collapse distinct executable grammars
- stop treating them as almost-synonyms of mode counts or delta routing
- done when each process has distinct inputs + state effects + tests

### Phase 3 — Family-truth resolution
- resolve family-truth relationally in encounter, not merely from reduced local sigma inference
- done when prevalence, theta, and payload family-handling are proven against multi-participant golden cases

### Phase 4 — Face-aware solving
- make inner landing and outer emission executable process distinctions
- done when face not only travels with data but measurably changes solver output

### Phase 5 — Order recursion
- make formed-order recursion explicit
- done when the solver can execute order-sensitive processes without fake flattening into single-level timestep logic

### Phase 6 — Leg distributed behavior
- add trace persistence, distributed pattern behavior, and local vs distributed Leg logic
- done when Leg is no longer a merely local axis signature with a distributed name

### Phase 7 — Field recursion
- execute field recursion after relation, order, and Leg are stable
- done when field is not only doctrinal language but a solver-operative structural distinction

---

## 8) Modern validation corpus needed

Don't trust old cases as the primary proof set for this migration. We require modern canonical validation cases for:
- triadic encounter
- threshold
- family interference
- each failure grammar
- face distinction
- order recursion
- distributed Leg
- field recursion

These are not optional; without them, "Full" becomes a claim without proof.

---

## 9) Rules during the migration
- do not call two solvers live truths
- do not let GUI narrow or GPT interpretation substitute for solver execution
- do not mark a coverage entry "full" because it is parsed, named, or approximated
- do not add new canon during this program; the target is frozen v15.7
- keep public solver entrypoints as stable as practical while internals are reshaped

---

## 10) Simple decision line

We will not run two live solver truths. We will reshape the current solver into a single v 15.7 canon-faithful runtime, proving full coverage process-by-process with modern golden cases and invariant tests.

Last updated: 2026-03-30
