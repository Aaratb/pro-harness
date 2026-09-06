---
name: security-review
description: "Review a change through the applicable access-control, API, privacy, AI-tool, infrastructure, secret, and tenant-isolation lenses."
---

# Security Review

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Map actors, assets, trust boundaries, entry points, sensitive data, external calls, and privilege transitions.
2. Select only the security lenses triggered by the change and trace exploitable paths with evidence.
3. Report severity, preconditions, impact, remediation direction, and validation boundaries without live exploitation.

## Output

Write the coordinated security findings beneath `artifact_root`.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
