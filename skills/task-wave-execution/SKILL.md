---
name: task-wave-execution
description: "Execute independent implementation tasks in bounded parallel waves with explicit ownership, written handoffs, and integration gates."
---

# Task Wave Execution

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `implementation-planning` only when this workflow reaches the step that needs it.
- Load `verification-before-completion` only when this workflow reaches the step that needs it.

## Workflow

1. Select only dependency-ready tasks with disjoint write scopes and assign one owner per file or module.
2. Give each worker a written task brief, required evidence, stop conditions, and artifact path.
3. Integrate one wave, review actual diffs and reports, verify shared contracts, then release the next wave.

## Output

Maintain the task ledger and wave reports beneath `artifact_root`.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
