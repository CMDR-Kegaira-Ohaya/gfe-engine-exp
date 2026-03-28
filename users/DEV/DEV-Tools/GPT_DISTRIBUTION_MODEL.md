# GPT distribution model

Purpose: lock the current distribution model for GFE repo-coupled GPTs.

This is a DEV operating note, not engine canon.

## Core model

For each interested person or team:
- make a separate copy of the repo under their own GitHub account or organization
- make a separate GPT copy for them
- use a separate token for their repo copy
- bake that token into their GPT action
- point the GPT action schema at their repo copy, not at the source repo

## Why this model wins

- no shared write access to one central repo
- no shared token across unrelated users
- failures and experiments stay local to each recipient copy
- the source repo stays the template/reference source
- each recipient can test or share inside their own team without touching the source instance

## Hard rules

- never reuse one writable token across multiple recipients
- never point multiple recipient GPTs at the same writable repo unless that is explicitly intended
- do not share recipient GPTs with `Can view settings` or `Can edit` unless that is explicitly intended
- the source repo owner keeps template control; recipients operate their own copies
- recipients are responsible for how they share their GPT links inside their own environment

## Source-template rule

This repo serves as the template/source.
It may hold:
- the core materials
- DEV operating notes
- action templates
- handoff checklists

It should not become a multi-user shared runtime surface.

## Recipient-instance rule

Each recipient instance should have its own:
- repo URL
- privacy-policy URL
- token
- GPT copy
- action schema values where owner/repo URLs are specific to that instance

## What must be edited for each recipient

At minimum:
- GitHub owner
- GitHub repo name
- privacy-policy URL if it points to the recipient Pages site
- token/auth binding in the GPT action
- any branch/path assumptions if their copy differs

## Working preference

Prefer sealed per-recipient instances over one shared instance.

That reduces governance burden and makes mistakes easier to contain.
