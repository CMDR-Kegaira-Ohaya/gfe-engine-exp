# GUI Confirmed Findings (2026-03-26)

This note records confirmed findings from live GUI polish and smoke-fixture inspection so future sessions do not have to re-discover them from code each time.

## Confirmed GUI findings

- Persistent helper layers can improve wording but still worsen the experience if they remain expanded after a case loads.
- The dizziness problem came from stacked persistent regions above the real work area, especially when notice, onboarding, explainer, tabs, case surface, timeline, atlas, and side panel all competed at once.
- After load, the correct direction is *subtractive simplification*, not more helper chrome.
- The onboarding layer is useful before load, but after load it should collapse into a compact "what next" strip or disappear.
- Plain-language guidance works best as one current-tab sentence plus optional details, not as a permanent multi-card block.
- The center panel should become the dominant focal region after load.
- Timeline and atlas should remain available, but feel secondary until the user explicitly uses them.
- The current polish lane should prefer removing or compacting persistent UI before adding new explanatory surfaces.

## Confirmed smoke-fixture findings

- `tools/js/gui-live-smoke.mjs` waits for a real GUI boot state, not just a shell render.
- For smoke to pass, the live GUI must finish with:
  - a current case loaded
  - atlas rendered
  - timeline rendered
- Workbench v3 resolves canonical case assets from `catalog/index.json`.
- The GUI loads:
  - case text from `entry.paths.case`
  - encoding JSON from `entry.paths.encoding`
  - reading text from `entry.paths.reading`
- Reading availability in the GUI is driven by the catalog entry and a real readable text file path.
- The current canonical catalog contains only two cases:
  - `seed`
  - `medical_breakthroughs_controversial_methods`
- Neither current catalog entry exposes a saved reading path.
- `seed` is too empty to serve as a useful human-visible smoke/demo fixture.
- `medical_breakthroughs_controversial_methods` is richer, but currently has no saved reading wired into the catalog.
- The fastest safe smoke-fixture path is not inventing a new runtime shape. It is adding a dedicated canonical fixture that already matches the current solver/GUI expectations.

## Exact files to inspect first for the smoke-fixture track
1. `/catalog/index.json`
2. `/cases/<fixture>/manifest.json`
3. `/cases/<fixture>/source/case.md`
4. `/cases/<fixture>/revisions/<revision>/encoding.json`
5. the reading markdown file referenced by `entry.paths.reading`
6. `/tools/js/gui-live-smoke.mjs`
7. `/tools/js/gui-pages-live-smoke.mjs`

## Current recommended smoke-fixture direction

- Create a dedicated canonical smoke case instead of overloading `seed`.
- Keep it intentionally small, but fully renderable in:
  - Case
  - Case encoding
  - Case reading
  - Timeline
  - Atlas
- Include at least one current-model reading markdown artifact so the GUI demo quality is not anchored to older reading examples.
