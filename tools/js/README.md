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

## Canonical Workbench v3 operator command

```bash
npm run gui:validate-chain -- --base-ref HEAD~1 --head-ref HEAD --copy-scan
```

This is the single authoritative validation verdict for the live GUI surface.

## Canonical Workbench v3 GUI commands

```bash
npm run gui:slice -- ui-v3/app.js renderAtlas
npm run gui:entry-audit -- workbench-v3.html
npm run gui:copy-scan -- workbench-v3.html ui-v3
npm run gui:cut-check -- workbench-v3.html
npm run gui:symbol-move -- renderAtlas ui-v3/atlas-renderer.js ui-v3/atlas-renderer-core.js ui-v3
npm run gui:rewrite -- remove-call ui-v3/app.js enhanceAtlasMap
npm run gui:live-smoke -- workbench-v3.html
npm run gui:repo-diff -- --base-ref HEAD~1 --head-ref HEAD
npm run gui:pages-artifact-verify -- --workflow gui-deploy-verify.yml --head-sha <sha>
npm run gui:pages-live-smoke -- --page-path workbench-v3.html
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
- `gui:entry-audit` starts from the canonical `workbench-v3.html` entrypoint and reports CSS, JS module entrypoints, module graph edges, and duplicate ownership warnings.
- `gui:copy-scan` clusters user-visible strings across `workbench-v3.html` and `ui-v3/**` so wording drift and duplicates are visible.
- `gui:cut-check` smoke-checks the Workbench v3 cut for missing imports, missing local stylesheets, and leftover renderer ownership duplication.
- `gui:symbol-move` inspects a symbol across source, target, and nearby GUI files and emits a move checklist with suggested import paths.
- `gui:rewrite` performs narrow file rewrites for import retargeting, import-symbol removal, and standalone call removal.
- `gui:live-smoke` loads the canonical Workbench v3 HTML in a local DOM harness, imports the module entrypoint, stubs local file fetches, and reports runtime errors, missing DOM targets, and whether atlas/timeline actually render.
- `gui:repo-diff` compares two refs and classifies what actually changed in the canonical Workbench v3 GUI path versus out-of-scope drift.
- `gui:pages-artifact-verify` checks Pages status, the latest matching workflow run or a specific run ID, and the currently exposed artifacts for that run.
- `gui:pages-live-smoke` polls the deployed Pages URL for the canonical Workbench v3 page, checks required markers, and verifies that linked stylesheet/module assets return successfully.
- `gui:force-redeploy` dispatches the repo-local forced redeploy workflow for the Workbench v3 live surface.
- `gui:validate-chain` runs the closed-loop Workbench v3 validator: entry audit, cut-check, live smoke, repo diff, optional copy scan, and optional Pages/artifact verification.

## Canonical Workbench v3 workflows

- `gui-structure-check.yml` runs entry audit, cut-check, and copy scan for the canonical Workbench v3 surface.
- `gui-live-smoke.yml` runs the local Workbench v3 smoke harness.
- `gui-deploy-verify.yml` is the authoritative push-time validator and GitHub Actions Pages deploy lane for the canonical Workbench v3 surface.
- `gui-force-redeploy.yml` intentionally invalidates the Workbench v3 deploy path.

## Notes

- The canonical live GUI entry is `workbench-v3.html`.
- Root `index.html` now redirects to `./workbench-v3.html`.
- `ui-v3/**`, `solver/**`, `catalog/**`, `cases/**`, `tools/js/gui-*`, and the `gui-*` workflows are the canonical live GUI support surface.
- The Pages deploy artifact is intentionally trimmed to `index.html`, `workbench-v3.html`, `privacy.html`, `ui-v3/**`, `solver/**`, `catalog/**`, and `cases/**`.
- The atlas map enhancer file has been removed.
- `ui-v3/atlas-renderer-core.js` now owns atlas structure, section/view metadata, and atlas map shell scaffolding.
- `ui-v3/atlas-renderer.js` is now the thinner interaction layer for detail remap, marker/zone generation, and atlas map wiring.
- These tools assume ECMAScript modules and parse with `sourceType: "module"`.
- They are for structural inspection and migration aid, not canonical doctrine.
- They do not yet cover JSX or TypeScript.
- Pages/artifact verification is limited by the currently exposed GitHub API surface and should be treated as deployment evidence, not perfect proof of final browser state.
