# Token Permission Surface

This file records the current **effective token permission surface** available to the GPT/operator in this repository context.
It is operational, not canonical engine doctrine.

This file covers:
- which GitHub permission families are currently enabled on the live token
- the practical authority width implied by that permission set

This file does **not** define:
- the GPT Builder connector/API action surface
- repo governance doctrine
- branch protection or repository policy behavior

Do not collapse those layers.
A token permission may exist while the connector does not expose a matching action.
A token permission may also exist while repository policy still blocks the action.

## Capability layers

Distinguish three layers:

1. **Connector action surface**
   - which operations the custom GPT connector exposes
2. **Token permission surface**
   - which of those operations the currently configured token is authorized to perform
3. **Repo policy surface**
   - which operations still depend on branch protection, workflow settings, merge policy, or other repository rules

This file covers **layer 2 only**.
Read `/main/GPT_CAPABILITY_SURFACE.md` for layer 1.
Read `/main/EDIT_RULES.md` and related repo-operating docs for layer 3.

## Current enabled token permissions

As currently configured, the token has at least:

- **Actions** — read / write
- **Commit statuses** — read / write
- **Contents** — read / write
- **Custom properties** — read / write
- **Deployments** — read / write
- **Issues** — read / write
- **Merge queues** — read / write
- **Metadata** — read-only
- **Pages** — read / write
- **Pull requests** — read / write
- **Variables** — read / write
- **Webhooks** — read / write
- **Workflows** — read / write

## Practical implications

This is a broad token permission surface.
The GPT/operator should not assume a narrow read-only or file-only token by default.

This does **not** weaken governance.
Repo rules, edit rules, branch protection, workflow settings, and explicit human approval requirements still matter.

Webhook read/write authority matters especially for live-connected GUI work.
It removes "token lacks webhook authority" as a valid blocker assumption.
But it still does not prove that webhook-based GUI integration is already implemented; that remains an architecture and implementation question.

## How to use this file

Read this file:
- after `/main/TOC.md` when token authority width matters to the task
- before assuming the live token lacks workflow, branch, Pages, webhook, or repo-write capability
- before designing around outdated narrow-token assumptions

Cross-check with:
- `/main/GPT_CAPABILITY_SURFACE.md` for the connector/API action surface
- `/main/EDIT_RULES.md` for governance and edit boundaries
- `/main/SYSTEM_MAP.md` for structural role mapping

## Update rule

Update this file when:
- the live token permission set changes materially
- the configured deployment changes to a token with a different authority profile
- operator assumptions about token width would otherwise drift out of date
