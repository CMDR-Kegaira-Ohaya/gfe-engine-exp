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

- **Metadata** — read-only
- **Actions** — read / write
- **Actions variables** — read / write
- **Code** — read / write
- **Commit statuses** — read / write
- **Custom properties for repositories** — read / write
- **Deployments** — read / write
- **Issues** — read / write
- **Merge queues** — read / write
- **Pages** — read / write
- **Pull requests** — read / write
- **Repository hooks** — read / write
- **Security events** — read / write
- **Workflows** — read / write

## Practical implications

This is a broad token permission surface.
The GPT/operator should not assume a narrow read-only or file-only token by default.

This does **not** weaken governance.
Repo rules, edit rules, branch protection, workflow settings, and explicit human approval requirements still matter.

This token surface now materially supports assumptions about:
- Pages write-level control
- workflow run/cancel/rerun control
- actions-variable management
- repository-hook authority
- security-event write-level authority
- code-centric repo mutation beyond narrow file-only assumptions

But this does **not** mean that the current connector exposes all of those families.
The repository-hook and security-event token surfaces, for example, may exceed the current live 30-operation connector pack.

So “the token lacks this authority” is now a weaker default assumption across Pages, workflows, repository hooks, and security events.
But “the connector exposes a direct call path” still must be checked separately.

## How to use this file

Read this file:
- after `/main/TOC.md` when token authority width matters to the task
- before assuming the live token lacks workflow, branch, Pages, repository-hook, security-event, or repo-write capability
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
