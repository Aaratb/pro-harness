---
name: improve-codebase-architecture
description: "Identify and plan evidence-backed architecture improvements without expanding a feature into an unbounded rewrite."
---

# Improve Codebase Architecture

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `zoom-out` only when this workflow reaches the step that needs it.

## Workflow

1. Identify the concrete architecture pain and its measured or observed impact.
2. Compare the boring baseline, incremental repair, and larger redesign.
3. Recommend the smallest improvement that fixes the active constraint with migration and rollback.

## Output

Return an architecture improvement decision and bounded execution slices.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
