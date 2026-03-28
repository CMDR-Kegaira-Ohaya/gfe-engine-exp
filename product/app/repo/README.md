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
