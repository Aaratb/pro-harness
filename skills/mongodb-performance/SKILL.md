---
name: mongodb-performance
description: "Review or design MongoDB access patterns, indexes, document models, aggregation, and operational behavior using repository evidence."
---

# Mongodb Performance

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Identify query shapes, cardinality, selectivity, document growth, write patterns, and consistency requirements.
2. Evaluate indexes, projections, aggregation, pagination, tenancy, and migration impact.
3. Require explain-plan or measured evidence for performance claims when available.

## Output

Return MongoDB findings or a data-model decision with verification targets.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
