---
name: plan-review-orchestrator
description: "Run the approved product, engineering, design, and interface plan reviews in order and synthesize one decision-ready plan."
---

# Plan Review Orchestrator

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `plan-product-review` only when this workflow reaches the step that needs it.
- Load `plan-engineering-review` only when this workflow reaches the step that needs it.
- Load `plan-design-review` only when this workflow reaches the step that needs it.
- Load `interface-experience-review` only when this workflow reaches the step that needs it.

## Workflow

1. Freeze the plan revision and evidence packet before review.
2. Run product, engineering, design, and applicable interface reviews against the same revision.
3. Auto-resolve only mechanical changes, surface user-owned decisions, then update the plan once and record the review ledger.

## Output

Write the synthesized plan review and updated plan beneath `artifact_root`.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
