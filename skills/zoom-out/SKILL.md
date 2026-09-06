---
name: zoom-out
description: "Reassess a local change from the surrounding system, repository, dependency, and operational boundaries before committing to a design."
---

# Zoom Out

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `workspace-codemap-context` only when this workflow reaches the step that needs it.

## Workflow

1. Locate upstream producers, downstream consumers, shared contracts, runtime boundaries, and operational owners.
2. Identify second-order effects, hidden coupling, and alternatives at a more appropriate boundary.
3. Return to the local decision with system-level constraints made explicit.

## Output

Return the boundary map and any required plan changes.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
