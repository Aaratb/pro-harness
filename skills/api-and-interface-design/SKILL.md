---
name: api-and-interface-design
description: "Design stable APIs, CLIs, events, schemas, and agent interfaces with clear contracts, errors, compatibility, and migration behavior."
---

# Api And Interface Design

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Identify consumers, trust boundaries, lifecycle, versioning, and compatibility constraints.
2. Specify names, inputs, outputs, errors, idempotency, pagination, retries, and authorization where applicable.
3. Compare alternatives and define contract tests and migration requirements.

## Output

Return the interface contract and decision rationale ready for the technical specification.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
