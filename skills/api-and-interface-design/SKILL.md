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

## Contract artifacts

An exposed boundary is one another team can call, subscribe to, or depend on the shape of.
Internal seams inside one deployable are not exposed and need no artifact.

Write two files per exposed boundary beneath the caller-supplied `artifact_root`:

- `contracts/<contract-id>.json` — the record, conforming to
  `~/.agents/schemas/architecture-pro/contract.schema.json`. Every field is required:
  `id`, `boundary`, `owner`, `consumers`, `inputs`, `outputs`, `errors`, `timeouts`,
  `retries`, `idempotency`, `compatibility`, `observability`. A field that does not apply is
  stated and justified, never omitted — the schema rejects both extra and missing keys.
- `contracts/<contract-id>.openapi.yaml` — the publishable form for an HTTP boundary,
  generated from the record. Consumers read this; the record is what the handoff carries and
  what a reviewer checks against.

`compatibility` carries the deprecation path, not just a version. State what a consumer may
rely on, what may change without notice, and how long the previous shape survives. A contract
with no stated compatibility window is not a contract — it is a snapshot.

`consumers` must name real, verified callers or state explicitly that none exist yet. An
invented consumer produces a contract designed for nobody.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
