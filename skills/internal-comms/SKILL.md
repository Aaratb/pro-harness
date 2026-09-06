---
name: internal-comms
description: "Draft concise stakeholder communication from verified delivery artifacts without sending messages or inventing status."
---

# Internal Comms

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Identify the audience, purpose, requested channel, and decisions or actions needed.
2. Use verified scope, tests, risks, links, dates, and owners from repository-local artifacts.
3. Draft only; send externally only after explicit confirmation.

## Output

Write the communication draft beneath `artifact_root` and return ready-to-paste text.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
