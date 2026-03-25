# JavaScript parser tools

Small repo-local JavaScript inspection tools for safer edits and structural debugging.

## Install

```bash
npm install
```

## Baseline commands

```bash
npm run js:check -- ui-v3/app.js
npm run js:ast -- ui-v3/app.js
npm run js:symbols -- ui-v3/app.js
npm run js:deps -- ui-v3/app.js
npm run js:find -- ui-v3/app.js renderAtlas
npm run js:summary-all
```

## GUI surgery commands

```bash
npm run gui:slice -- ui-v3/app.js renderAtlas
npm run gui:entry-audit -- workbench-v3.html
npm run gui:copy-scan -- workbench-v3.html ui-v3
npm run gui:cut-check -- workbench-v3.html
npm run gui:symbol-move -- enhanceAtlasMap ui-v3/atlas-map-enhancer.js ui-v3/atlas-renderer.js ui-v3
npm run gui:rewrite -- remove-import-symbol ui-v3/app.js ./atlas-map-enhancer.js enhanceAtlasMap
npm run gui:rewrite -- remove-call ui-v3/app.js enhanceAtlasMap
npm run gui:live-smoke -- workbench-v3.html
```

## What each baseline command does

- `check` runs `node --check` for syntax validation.
- `ast` parses the file with Acorn and prints full AST JSON.
- `symbols` prints imports, exports, top-level declarations, and top-level calls.
- `deps` prints import and re-export edges.
- `find` locates identifier matches in the parsed AST.

## What each GUI command does

- `gui:slice` prints one symbol slice: declaration, code body, direct callees, direct callers, imports, and exports.
- `gui:entry-audit` starts from a live HTML entrypoint and reports CSS, JS module entrypoints, module graph edges, and duplicate ownership warnings.
- `gui:copy-scan` clusters user-visible strings across HTML and JS so wording drift and duplicates are visible.
- `gui:cut-check` smoke-checks a GUI cut for missing imports, missing local stylesheets, and leftover enhancer ownership outside the renderer path.
- `gui:symbol-move` inspects a symbol across source, target, and nearby GUI files and emits a move checklist with suggested import paths.
- `gui:rewrite` performs narrow file rewrites for import retargeting, import-symbol removal, and standalone call removal.
- `gui:live-smoke` loads the live workbench HTML in a local DOM harness, imports the module entrypoint, stubs local file fetches, and reports runtime errors, missing DOM targets, and whether atlas/timeline actually render.

## Notes

- These tools assume ECMAScript modules and parse with `sourceType: "module"`.
- They are for structural inspection and migration aid, not canonical doctrine.
- They do not yet cover JSX or TypeScript.
- GUI tools are intentionally tuned to the current `workbench-v3.html` and `ui-v3/` live path.
