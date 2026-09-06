---
name: incremental-delivery
description: "Decompose changes into small independently reviewable and reversible delivery slices with safe dependency ordering."
---

# Incremental Delivery

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Map contracts and dependencies before slicing.
2. Prefer thin vertical outcomes that can be verified and rolled back independently.
3. Define save points, flags or compatibility bridges, and safe parallel ownership.

## Output

Return an ordered slice plan with acceptance and rollback evidence for each slice.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
