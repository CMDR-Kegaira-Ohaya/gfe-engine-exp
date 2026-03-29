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
