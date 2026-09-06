---
name: delivery-retrospective
description: "Run an evidence-based delivery retrospective across outcomes, decisions, lead time, rework, review, incidents, and follow-up ownership."
---

# Delivery Retrospective

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Collect the feature timeline, commits, reviews, incidents, artifacts, and outcome evidence.
2. Identify what accelerated or delayed value, where rework originated, and which controls helped or failed.
3. Create a small number of owner-tagged experiments rather than generic lessons.

## Output

Write the retrospective beneath `artifact_root` with evidence and follow-up owners.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
