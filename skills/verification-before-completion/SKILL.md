---
name: verification-before-completion
description: "Require fresh direct evidence for every completion claim and prevent passing one check from standing in for another."
---

# Verification Before Completion

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Translate each claim into the exact command, artifact, or observation that could prove it.
2. Run fresh verification against the final revision and record commands, exit status, and relevant output.
3. Report failed, blocked, skipped, and inferred evidence separately; never call the task complete while required proof is absent.

## Output

Write a claim-to-evidence table beneath `artifact_root` and return the verified status.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
