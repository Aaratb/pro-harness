---
name: customer-journey-map
description: "Map an evidence-backed customer journey across goals, touchpoints, decisions, friction, emotions, and recovery paths."
---

# Customer Journey Map

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `user-personas` only when this workflow reaches the step that needs it.

## Workflow

1. Define the user goal and journey boundaries.
2. Map actions, touchpoints, decisions, friction, failure recovery, and evidence at each stage.
3. Highlight opportunity areas without fabricating research or analytics.

## Output

Write or return a journey map with evidence and research gaps.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
