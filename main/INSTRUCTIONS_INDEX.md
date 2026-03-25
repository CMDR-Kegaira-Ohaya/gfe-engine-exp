# Instructions Index
[RID_SELFREF_INSTRUCTIONS_INDEX]

This file is the operational instructions surface for repo-useful tools, procedures, and operator conventions.
It is not canonical engine doctrine. It supplements `/main/TOC.md` and `/main/GPT_OPERATOR_MANUAL.md`.

## Use from boot
[RID_INSTRUCTIONS_USE_FROM_BOOT]
- Start at `/main/TOC.md`
- Then read `/main/GPT_OPERATOR_MANUAL.md`
- Then use this file for tooling, procedures, and operational helpers
- Use `/PROCEDURE_INDEX.md` for troubleshooting and repo-write recovery

## Cross-links
[RID_INSTRUCTIONS_CROSS_LINKS]
- Bootstrap: `/main/TOC.md`
- Operator manual: `/main/GPT_OPERATOR_MANUAL.md`
- Edit governance: `/main/EDIT_RULES.md`
- Troubleshooting and repo recovery: `/PROCEDURE_INDEX.md`
- JavaScript tools usage: `/tools/js/README.md`
- GPT connector/API action surface: `/main/GPT_CAPABILITY_SURFACE.md`
- Live token permission surface: `/main/TOKEN_PERMISSION_SURFACE.md`

## Self-referential layer boundary
The repo-wide self-referential layer is `/main/*`.
Add repo-wide tooling references here or in the other `/main/*` control docs.
Do not create parallel repo control layers in side lanes.

## Operational tools
[RID_INSTRUCTIONS_OPERATIONAL_TOOLS]

### JavaScript parser tooling
Use this when the task concerns imports, exports, syntax validity, dependency edges, or JS structure.

Install:
```bash
npm install
```

Commands:
```bash
npm run js:check -- ui-v3/app.js
npm run js:symbols -- ui-v3/app.js
npm run js:deps -- ui-v3/app.js
npm run js:find -- ui-v3/app.js render
npm run js:summary-all
```

What it gives:
- syntax check via Node `--check`
- full AST parsing via Acorn
- import/export summaries
- dependency edges
- identifier lookup
- batch summaries across `/ui/`, `/ui-v3/`, and `/solver/`

Boundaries:
- this is for structural inspection, not for doctrine
- it does not replace canonical engine files
- it does not yet cover JSX or TypeScript

### Workbench v3 GUI validation tooling
[RID_INSTRUCTIONS_GUI_V3_VALIDATION]
Use this when the task concerns the canonical live GUI surface, local GUI smoke validation, deployed Pages smoke validation, or workflow-backed GUI verification.

Canonical live surface:
- `/workbench-v3.html`
- `/ui-v3/**`
- `/tools/js/gui-*`
- `/.github/workflows/gui-*`

Canonical operator command:
```bash
npm run gui:validate-chain -- --base-ref HEAD~1 --head-ref HEAD --copy-scan
```

Operational notes:
- `tools/js/gui-live-smoke.mjs` is the canonical local smoke harness for Workbench v3.
- The Workbench v3 smoke harness is hardened for Node 24-era globals with descriptor-aware global binding and restoration.
- Node 24 is the canonical runtime assumption for the `gui-*` workflow lane.
- `ui-v3/atlas-renderer-core.js` is now the stable owner of atlas structure, section/view metadata, and atlas map shell scaffolding.
- `ui-v3/atlas-renderer.js` is now the thinner interaction layer for detail remap, marker/zone generation, and atlas map wiring.
- Use `gui:pages-live-smoke` and `gui:pages-artifact-verify` for deployed-output evidence beyond the local harness.

Boundaries:
- the local smoke harness is operational evidence, not final proof of deployed browser state
- deployed Pages smoke is still the required check for the live Pages surface
- this tooling does not outrank engine doctrine or solver doctrine

### GPT repo-control connector and token surfaces
[RID_INSTRUCTIONS_REPO_CONTROL_SURFACES]
Use this when the task concerns what the GPT can actually do to the repository through the custom connector and the current token configuration.

Read `/main/GPT_CAPABILITY_SURFACE.md` for:
- connector / API action surface
- guidance on when to prefer general path-based repo operations over narrower legacy helpers

Read `/main/TOKEN_PERMISSION_SURFACE.md` for:
- live token permission surface
- practical authority width of the current token

Use these before assuming:
- the GPT is limited to flat `/cases/*.json` helpers
- the GPT is read-only
- workflow dispatch or arbitrary-path writes are unavailable

Boundaries:
- exposed connector/action surface does not guarantee success
- token permissions do not override branch protection or repo rules
- browser-app features should not be inferred automatically from GPT/operator repo-control capability

## When to use these instructions
- when a tool or procedure should be known from boot
- when a repo capability is operational, repeatable, and not canonical doctrine
- when usage should be cross-linked with procedures or tooling

```text
If a new repo-useful tool is added, list it here and add a cross-link from `/main/TOC.md`.
```
