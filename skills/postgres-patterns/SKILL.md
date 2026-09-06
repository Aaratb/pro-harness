---
name: postgres-patterns
description: "Review or design PostgreSQL schemas, queries, indexes, constraints, migrations, tenancy, and transaction behavior."
---

# Postgres Patterns

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Identify access paths, cardinality, consistency, concurrency, and lifecycle requirements.
2. Evaluate schema normalization, constraints, indexes, locking, query plans, tenancy, and migration sequencing.
3. Require explain or measured evidence for performance claims when available.

## Output

Return PostgreSQL findings or design decisions with migration and verification targets.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
