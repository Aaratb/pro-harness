---
name: production-readiness
description: "Assess production readiness across correctness, security, data, reliability, performance, observability, rollout, and rollback with human gates."
---

# Production Readiness

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `verification-before-completion` only when this workflow reaches the step that needs it.
- Load `score-change-risk` only when this workflow reaches the step that needs it.

## Workflow

1. Identify the production surface, owners, SLOs, data impact, dependencies, rollout stages, and rollback conditions.
2. Evaluate code, tests, security, capacity, observability, alerts, migrations, support, and failure recovery.
3. Record blockers and require explicit human approval for production mutation.

## Output

Write the production-readiness checklist and sign-off state beneath `artifact_root`.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
