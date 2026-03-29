# product/app/repo

This is the runtime repo bridge for the product area.

Purpose:
- hold machine-usable repo rules for GUI/runtime work
- keep repo-aware commands in one place
- prevent the GUI from mining DEV markdown directly at runtime

Model:
- repo knowledge in DEV docs = human-facing memory and doctrine
- repo bridge in `product/app/repo/` = distilled runtime contract
- GUI surfaces call commands, not raw repo operations scattered across the app

Flow:
- GUI intent → command → guardrail check → connector call → verification → UI update

Write-path defaults:
- use Base64 for transport only at the connector boundary
- keep reasoning and draft comparison in plain UTF-8 text
- prefer `saveFile` for routine writes
- verify writes with read-back, not only with the save response
- allow one bounded stale-SHA recovery retry when the repo moved between SHA read and write
- classify common write failures so the UI can report permission/path/stale-state/payload problems more clearly

 Hard-delete defaults:
- do not rely on `deleteFile` as ha core runtime path
- use the proven low-level git flow instead:
  - `commit.tree` → `getCommit` or `getTree`
  - `createTree` with the target path set to `sha: null`
  - `createCommit`
  - `updateRef`
- after updateRef, confirm the path is gone with `getPath`

 Helpers now added:
- `product/app/repo/low-level-delete.js` exports `deletePathWithLowLevelGit`
- `product/app/repo/commands/delete-product-file.js` exports `deleteProductFile`
- `product/app/repo/commands/delete-case-source.js` exports `deleteCaseSource`
- connectors that provide `getRef` or `getBranchRef`, with `getCommit`, `createTree`, `createCommit`, and `updateRef`, are now marked as `supportsLowLevelDelete`
