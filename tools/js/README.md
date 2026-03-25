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
npm run gui:repo-diff -- --base-ref HEAD~1 --head-ref HEAD
npm run gui:pages-artifact-verify -- --workflow gui-deploy-verify.yml --head-sha <sha>
npm run gui:force-redeploy -- --workflow gui-force-redeploy.yml --ref main
npm run gui:validate-chain -- --base-ref HEAD~1 --head-ref HEAD --copy-scan
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
- `gui:repo-diff` compares two refs and classifies what actually changed in the live GUI path versus out-of-scope drift.
- `gui:pages-artifact-verify` checks Pages status, the latest matching workflow run or a specific run ID, and the currently exposed artifacts for that run.
- `gui:force-redeploy` dispatches the repo-local forced redeploy workflow.
- `gui:validate-chain` runs the closed loop validator: entry audit, cut-check, live smoke, repo diff, optional copy scan, and optional Pages/artifact verification.

## Related workflows

- `gui-structure-check.yml` runs entry audit, cut-check, and copy scan on GUI path changes.
- `gui-live-smoke.yml` runs the local GUI smoke harness on GUI path changes.
- `gui-deploy-verify.yml` runs the full validation chain and uploads the chain report.
- `gui-force-redeploy.yml` creates a marker commit to intentionally invalidate the live deploy path.

## Notes

- These tools assume ECMAScript modules and parse with `sourceType: "module"`.
- They are for structural inspection and migration aid, not canonical doctrine.
- They do not yet cover JSX or TypeScript.
- GUI tools are intentionally tuned to the current `workbench-v3.html` and `ui-v3/` live path.
- Pages/artifact verification is limited by the currently exposed GitHub API surface and should be treated as deployment evidence, not perfect proof of final browser state.
