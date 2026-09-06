---
name: session-checkpoint
description: "Save a compact repository-local checkpoint of current state, decisions, evidence, blockers, and exact next actions for reliable continuation."
---

# Session Checkpoint

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Read current state and existing artifacts rather than reconstructing progress from conversation alone.
2. Capture completed work, decisions, changed paths, verification, blockers, remaining tasks, and next command.
3. Use a deterministic filename inside `artifact_root` and never write session state to a home-directory store.

## Output

Write the checkpoint beneath `artifact_root` and return its path.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
