---
name: architecture-query-performance
description: "Evaluate query latency, plan stability, locking, indexing, pagination, and connection pressure using datastore-aware evidence."
---

# Architecture Query Performance

Inventory material query shapes, callers, filters, joins or aggregations, ordering, cardinality, data growth, indexes, pagination, transactions, locks, timeouts, retries, and pools.

Separate static query structure from measured execution behavior. A plan, index-use, selectivity, or latency claim remains unverified without current representative evidence. Apply datastore-specific guidance only after the repository proves the engine and version.

Check plan stability, missing or redundant indexes, write amplification, offset growth, lock duration, long transactions, pool oversubscription, tenant skew, and failure behavior. Specify the smallest safe plan or measurement needed to confirm material hypotheses.

Return ranked findings and verification specifications beneath the caller-supplied `artifact_root`; never execute a query or migration.
