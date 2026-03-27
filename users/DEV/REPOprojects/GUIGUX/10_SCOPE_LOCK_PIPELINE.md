# GUIGUX scope lock: engine/solver/GPT/GUI pipeline

[GUIGUX_SCOPE_LOCK_ROOT]

Status: **LOCKED** (DEV scope & vision). If any other GUIGUX note conflicts with this file, this file wins.

Last updated: 2026-03-27

---

## 1) The system model (layer ownership)

[GUIGUX_LAYER_OWNERSHIP]

This project uses a strict separation of layers:

- **Engine** (`/engine/*`)  
  Canonical model doctrine. Defines structural truth (formed existence model). Not UI. Not prose.

- **Solver** (`/solver/*`)  
  Executable mathematization of the engine. This is where a case becomes **solved structure+*.  
  Solver determines structural state.

- **GPT stack** (builder modules: control surface + router + lanes)  
  Control + calibration + interpretation.  
  GPT may:
  - prepare and calibrate inputs
  - route intent across lanes
  - interpret solver outputs
  - produce briefs/readings as overlays  
  GPT must **not** substitute for solver truth.

- **GUI** (`/workbench-v3.html , `/ui-v3/**`)  
  Projection layer. Shows solved structure as primary and overlays (briefs/readings) as secondary.  
  Supports navigation/refocus which can trigger re-entry into the pipeline.

---

## 2) The pipeline contract

[GUIGUX_PIPELINE_CONTRACT]

Real case work follows:

**prepare → solve → interpret → project**

- **prepare** (GPT stack)  
  Shape/calibrate inputs without fabricating structure.

- **solve** (solver)  
  Compute engine-structured state. This is the truth layer for structure.

- **interpret** (GPT stack)  
  Produce readings/briefs as overlays, with strict epistemic typing.

- **project** (GUI)  
  Display solved structure as primary; overlays as optional layers; preserve orientation.

---

## 3) The law

[GUIGUX_SOLVER_AUTHORITY_LAW]

**The solver determines structure; GPT never substitutes for it.**

Consequences:
- GPT must not fabricate solved structure.
- If solver-derived structure is unavailable, GPT must mark the case as pre-solver / hypothetical / partial / unknown.
- GUI must not treat free narrative as truth.

---

## 4) Epistemic discipline (scientist-grade)

[GUIGUX_EPISTEMIC_DISCIPLINE]

Every claim in case execution must be typed as one of:
- **solver-derived structure**
- **sourced observation**
- **structural inference**
- **provisional interpretation**
- **unknown / unspecified**

Source discipline:
- GPT may gather/compile/organize/use sources.
- GPT may **never** fabricate sources, evidence, citations, or provenance.

---

## 5) GUI projection contract

[GUIGUX_GUI_PROJECTION_CONTRACT]

The GUI must support a human-first **Case Map (Case Space)** experience:

Case Map ((Case Space)) primary:
- projects solver/engine structure as a navigable map/space
- shows nodes and links (participants, steps, encounters, payload relations, etc.)
- preserves orientation (where you are, what is connected, what is selected)

Stable documents panel (global):
 - a single stable panel containing global documents:
  - Full Case (source)
  - Full Result (synthesized reading/brief)
- these documents do **not** follow map clicks (no auto-jump / no scroll hijack)
- fixed width; internal scroll; never resizes the Case Map

Focus Inspector (click-following):
 - map clicks change **focus** and open/update a Focus Inspector (drawer/popup)
- the Focus Inspector must provide:
  A) specifics of the selected node/link
  B) its internal/external connections
- connection surfacing must support:
  - visual neighborhood (highlight neighbors; dim others; show direction/type)
  - nested connection lists (grouped by relation type; expandable; clickable)

Optional affordance (allowed):
- “Find in Full Case” / “Find in Full Result” (highlight/search) without forcing a scroll jump.

Such detail surfaces as encoding/timeline/atlas may exist behind an “Inspect” affordance, but must not compete with the Case Map as the default focal region.

Rules:
- navigation happens in the Case Map
- focus changes happen via selection + Focus Inspector, not by rewriting global documents
- interpretation lives in the Full Result document; it is an overlay, not a replacement for structure
- technical detail appears only on demand

---

## 6) Non-goals (current lane)

[GUIGUX_NON_GOALS]

- No engine canon churn
- No solver doctrine churn
- No speculative re-architecture without a real blocker
- No GUI becoming a repo-control cockpit
- No mixing of truth (solver structure) and overlay (readings/briefs)

---

## 7) How to use this file

[GUIGUX_HOW_TO_USE]

- Use this as the reference when:
  - writing new GUI notes
  - updating the working board
  - deciding whether a UI change is in scope
  - checking whether a proposed change violates solver authority

- When adding new notes, link back to:
  - `[GUIGUX_LAYER_OWNERSHIP]`
  - `[GUIGUX_PIPELINE_CONTRACT]`
  - `[GUIGUX_SOLVER_AUTHORITY_LAW]`
  - `[GUIGUX_GUI_PROJECTION_CONTRACT]`
