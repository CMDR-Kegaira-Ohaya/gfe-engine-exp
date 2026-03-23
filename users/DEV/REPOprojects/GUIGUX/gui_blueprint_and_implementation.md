# GUI Blueprint and Implementation (Temporary)

**Purpose:** This is a temporary working board for the v3 reader UI until the GUI is implemented.
Use it to keep live repo truth, locked decisions, current gaps, and the next implementation slice in one place while work is active.

## How to use this board

Keep this file:
- implementation-aware
- compact
- current
- focused on active frontend work
- temporary

Update it when:
- live repo behavior changes
- a naming decision is locked
- a planned slice changes
- a gap is resolved or replaced by a new one

When the GUI is implemented or this board stops being useful:
- archive it, trim it, or remove it
- do not treat it as long-term repo memory by default

Do not use this board as:
- engine doctrine
- backend doctrine
- builder doctrine
- long-term repo memory
- a long narrative design essay

---

## Repo reality snapshot

Current repo truth:
- canonical case browsing comes from `/catalog/index.json`
- canonical case artifacts live under `/cases/<slug>/...`
- case source loads from `source/case.md`
- case encoding loads from `revisions/<case_revision_id>/encoding.json`
- saved reading is optional and may be absent
- legacy flat case pointers are gone
- `ui-v2/` and `workbench-v2.html` are gone
- active v3 files are:
  - `/workbench-v3.html`
  - `/ui-v3/app.js`
  - `/ui-v3/styles.css`
- there is no `/ui-v3/render.js` in the current repo state

So v3 is the active frontend target, not a parallel experiment beside preserved v2.

---

## Product posture

v3 is **reader-first**.

The GUI should help a user:
- browse
- open
- read
- inspect
- navigate timeline
- navigate atlas
- understand what exists and what is missing

GPT-side operation remains the home for:
- generate
- save
- delete
- promote
- package
- repo-backed mutation
- workflow dispatch

---

## Locked artifact language

Use this user-facing family consistently:
- **Case**
- **Case encoding**
- **Case reading**
- **Case package**

Use these loading phrases:
- **Open case**
  - Load from repo
  - Import files
- **Open case package**
  - Load from repo
  - Import files

Avoid vague labels like:
- workspace
- source
- load case
when the action is more specific.

---

## Live implementation baseline

What is live now:
- header actions area includes:
  - `Actions`
  - `Clear`
  - `Delete`
- `Actions` opens a compact drop-down panel with:
  - `Open case`
  - `Open case package`
  - `Generate reading`
  - brief `Inspect` note text
- left side panel currently switches between:
  - canonical case catalog
  - package placeholder surface
  - reading-generation placeholder surface
- center tabs are live and currently labeled:
  - `Case`
  - `Case encoding`
  - `Case reading`
- `Case encoding` already uses:
  - summary first
  - raw data behind disclosure
- `Case reading` already shows a proper empty state when no saved reading exists
- bottom row currently contains:
  - `Timeline`
  - placeholder `Relation Atlas`
- package load/import placeholder copy is already present and honest

This means the frontend is already past pure concept stage. There is a real baseline to refactor forward.

---

## Target screen model

### Screen name
**Case reader screen**

### Layout target
- quiet header
- slim `Actions` command button
- compact drop-down actions panel under that button
- persistent left **Relation Atlas**
- center **Case / Encoding / Reading** reading area
- bottom **Timeline** with one expanded step

### Reading hierarchy
- timeline = primary navigation spine
- atlas = primary interpretive instrument
- center panel = primary reading surface
- actions panel = secondary command surface
- GPT actions = handoff cues, not GUI-owned mutation controls

---

## Relation Atlas target

The left system is the **Relation Atlas**, local to the selected timestep.

Focus switch:
- **Participant focus**
- **Encounter focus**

Lens switch:
- **Structure (V)** — where this sits
- **Relations (H)** — who meets whom here
- **Expression (R)** — what is held vs shown

Interaction rules:
- clicking an actor in the timeline sets **Participant focus**
- clicking an action in the timeline sets **Encounter focus**
- changing focus does not change the selected step
- changing lens does not change the selected focus

---

## Center content target

Use tabs.

Live labels now:
- **Case**
- **Case encoding**
- **Case reading**

Possible later simplification:
- **Case**
- **Encoding**
- **Reading**

Rules:
- one visible at a time
- tab state should persist while moving between steps unless deliberately reset
- raw JSON should never be the first thing shown
- if no reading exists, show a clear empty state with a GPT-side cue such as `Use GPT to generate reading`
- do not let brief terminology drift away from live labels unless a relabeling pass is explicitly being done

---

## Timeline target

The timeline is the primary navigation spine.

Each expanded step should contain:
- short summary
- **Actors**
- **Actions**

Rules:
- no tabs inside each step in the first version
- selecting a step updates atlas context and center content context
- step content should stay concise

---

## Actions panel target

Grouped command model:
- **Open**
- **Read**
- **Inspect**
- **Export**
- **GPT actions**

Rules:
- compact classic command surface, not a ribbon
- plain-language labels
- GPT actions are cues and handoffs, not direct repo-mutation controls

Current implementation note:
- the `Actions` shell already exists
- current panel content is still minimal and transitional
- this layer should now be refined, not reinvented

---

## Plain-language policy

Preferred labels:
- `Summary`
- `Interactions`
- `State`
- `Checks`
- `Raw data`
- `Open case`
- `Open case package`
- `Load from repo`
- `Import files`
- `Selected moment`
- `Affected participants`
- `State changes`

Do not lead with:
- assembled
- derived
- dashboard chunks
- solver debug
- workspace sources

---

## GUI / GPT split

### GUI owns
- browse
- open
- read
- inspect
- navigate timeline
- navigate atlas
- show artifact status
- show provenance/source-zone state
- show what exists and what is missing

### GPT side owns
- generate reading
- save reading
- save package
- delete artifact
- delete case folder
- promote between work-lane and canonical state
- repo mutation
- workflow dispatch

---

## Current gaps

Gap from current implementation to target:
- current `Actions` shell exists, but its grouped command model is still minimal
- current left side panel is still doing catalog/package/reading placeholder duty instead of serving as the final **Relation Atlas** area
- current atlas is still a placeholder summary block in the bottom row
- current timeline is still a compact selector list, not the fuller step-card model
- current reading surface does not yet carry annotation or atlas-sync behavior
- dimensional visual grammar is not yet implemented
- tab-label shortening is still a future choice, not live implementation

---

## Component map

Planned component responsibilities:
- **ReaderShell** — overall layout and high-level state
- **ReaderHeader** — title, case identity, artifact badges
- **StatusBadges** — case / encoding / reading / validation status only
- **ActionsTab** — single actions trigger
- **ActionsPanel** — grouped command surface
- **CatalogOpenSurface** — open-case browsing/import surface
- **PackageOpenSurface** — package load/import placeholder surface
- **RelationAtlas** — selected-step interpretive instrument
- **AtlasFocusSwitch** — participant vs encounter focus
- **AtlasLensSwitch** — V / H / R lens switching
- **AtlasDetail** — family/process/alignment detail rendering
- **CenterTabs** — case / encoding / reading switching
- **CaseView** — markdown case rendering
- **EncodingView** — summary-first encoding inspector
- **ReadingView** — reading surface + empty state + later annotations
- **Timeline** — primary navigation spine
- **TimelineStepCard** — step shell
- **ExpandedStep** — summary + actors + actions
- **ActorsList** — clickable participants
- **ActionsList** — clickable actions
- **EmptyState** — missing reading / missing focus / missing data states

---

## Active implementation slice

Current slice:
1. preserve the working catalog/case flow
2. preserve and refine the existing `Actions` button + drop-down shell
3. upgrade timeline from selector list to one-expanded-step cards
4. move Relation Atlas toward the left-side persistent role
5. keep package behavior placeholder-only until backend package flow becomes real
6. split `/ui-v3/app.js` only when the boundaries are real enough to justify it

---

## Open decisions

Decisions not yet locked:
- whether tabs stay `Case / Case encoding / Case reading` or are shortened later
- how much of the catalog/open surface remains persistently visible once the atlas moves left
- when dimensional visual grammar enters the implementation, and at what minimum viable level

---

## Success condition for current direction

A first-time user should be able to:
- open a case from the canonical catalog without explanation
- understand where they are on screen
- move through timesteps naturally
- click actor/action and see the atlas respond
- switch between Case / Encoding / Reading without confusion
- understand when a reading is missing
- understand that generation/save/delete/package actions belong to GPT-side operation

---

## End condition

When the GUI implementation is far enough along that this board no longer helps day-to-day work:
- reduce it to a short closure note,
- move any still-useful lasting guidance into the proper repo docs,
- or remove it entirely.

This board is for active implementation coordination, not permanent project memory.

---

## Next active frontend step

Turn this board into:
1. a compact screen map synced to the live `Actions` shell
2. a component inventory used directly against the live files
3. a concrete next slice for `/workbench-v3.html`, `/ui-v3/app.js`, and `/ui-v3/styles.css`
4. a deliberate tab-label decision only when the UI layer is ready for it

