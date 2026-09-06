---
name: test-driven-development
description: "Drive behavior changes through observed failing proof, minimal implementation, green verification, and behavior-preserving refactoring."
---

# Test Driven Development

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Define one observable behavior and write the smallest meaningful failing test or equivalent proof.
2. Run it and confirm the failure is caused by the missing behavior, then implement the minimum change.
3. Rerun to green, refactor without weakening assertions, and retain exact evidence.

## Output

Return RED, GREEN, and REFACTOR evidence with changed test and source paths.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
