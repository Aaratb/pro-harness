---
name: code-simplification
description: "Simplify code structure and remove unnecessary complexity while preserving behavior and repository conventions."
---

# Code Simplification

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `test-driven-development` only when this workflow reaches the step that needs it.

## Workflow

1. Identify complexity supported by concrete duplication, branching, coupling, or comprehension evidence.
2. Establish behavioral proof and make the smallest simplifying transformation.
3. Rerun focused verification and report structural improvement without claiming subjective elegance as proof.

## Output

Return the simplified paths, before-and-after evidence, and verification result.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
