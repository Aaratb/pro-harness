---
name: behavior-preserving-code-simplification
description: "Compress an implementation through characterization-first transformations that mechanically preserve externally observable behavior."
---

# Behavior Preserving Code Simplification

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `test-driven-development` only when this workflow reaches the step that needs it.
- Load `code-simplification` only when this workflow reaches the step that needs it.

## Workflow

1. Capture current behavior for every refactored seam before editing.
2. Remove duplication, indirection, dead branches, and excess surface in small reversible steps.
3. Rerun the same proof after each material transformation and stop on behavioral uncertainty.

## Output

Write the compression ledger beneath `artifact_root` with line changes and verification evidence.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
