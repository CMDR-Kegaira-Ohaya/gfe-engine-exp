# Repo copy handoff checklist

Use this when preparing a per-recipient repo + GPT instance.

## 1. Prepare the repo copy

- create a new empty GitHub repo under the recipient account or organization
- copy this repo into that new repo
- confirm the expected core areas exist:
  - `engine/`
  - `solver/`
  - `cases/`
  - `users/DEV/`
  - `privacy.html`
- confirm the copied repo has the expected default branch

## 2. Confirm privacy surface

- make sure `privacy.html` is reachable from the published location for that repo
- if the recipient uses GitHub Pages, confirm the live privacy URL
- use that recipient-specific privacy URL in the GPT action metadata where required

## 3. Create recipient token

- create a token for the recipient repo copy
- grant only the permissions needed for the intended write/read workflow
- do not reuse another recipient token
- record the token only in the recipient GPT action/auth setup, not in repo files

## 4. Prepare the action schema

Use `openapi_gfe_repo_template.yaml` as the starting point.

Replace these placeholders:
- `OWNER_PLACEHOLDER`
- `REPO_PLACEHOLDER`
- any privacy URL references if present in surrounding GPT setup

Confirm the server URL points to the recipient repo copy before baking the action.

## 5. Bake the GPT copy

- make a separate GPT copy for the recipient
- attach the recipient-specific action schema
- attach the recipient-specific token/auth
- keep the GPT shared as `Can chat` only unless broader access is explicitly intended

## 6. Test before handoff

In GPT Preview:
- confirm reads work
- confirm a harmless write can work if writes are intended
- confirm the action is targeting the recipient repo, not the source repo
- confirm the privacy-policy URL is correct and live

## 7. Handoff rule

When handing off:
- give the recipient the GPT link for their own instance
- do not give them a shared central GPT instance
- do not give them another recipient's token
- remind them they are responsible for how they share their GPT link inside their own team/workspace

## 8. After handoff

- if a link leaks, rotate that recipient token if needed
- if the recipient repo moves or renames, update the action schema server URL
- if the privacy URL changes, update the GPT metadata accordingly
