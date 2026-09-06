---
name: release-deployment
description: "Prepare and execute an authorized staged release with readiness, staleness, rollout, observation, and named rollback gates."
---

# Release Deployment

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `production-readiness` only when this workflow reaches the step that needs it.
- Load `verification-before-completion` only when this workflow reaches the step that needs it.

## Workflow

1. Resolve the exact revision, environment, deploy mechanism, approvals, configuration, migration, and rollback path.
2. Check review staleness and readiness before staging or production action.
3. Execute only the authorized stage, capture live evidence, observe health, and stop on rollback criteria.

## Output

Write the deployment record beneath `artifact_root` with revision, commands or links, evidence, and rollback status.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
