---
name: clickhouse-modeling
description: "Design ClickHouse tables and queries around measured ingestion, retention, aggregation, ordering, partition, and mutation requirements."
---

# Clickhouse Modeling

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Identify event shape, query patterns, ingestion rate, retention, update semantics, and cardinality.
2. Select engines, ordering, partitioning, projections, materialized views, and codecs from those requirements.
3. Define migration, backfill, and query-plan verification.

## Output

Return the ClickHouse model and verification plan.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
