---
name: architecture-capacity-and-tuning
description: "Quantify capacity ceilings, demand, headroom, tuning envelopes, cost steps, and 1x, 10x, and 100x breakpoints."
---

# Architecture Capacity and Tuning

Inventory hard and soft ceilings for compute, memory, files, connections, pools, workers, queues, partitions, storage, throughput, quotas, rate limits, and operational staffing.

For every material limit show current demand, growth driver, formula, units, evidence type, headroom, first break, user impact, safe tuning range, next structural step, cost, owner, and lead time. Model approved scale targets through every material dependency rather than repeating the headline target. Include 1x, 10x, and 100x when material to the requested scale or risk; do not invent a 100x obligation for a local decision.

## Find the first binding constraint

Reuse the performance workload: user demand → fan-out and retry amplification → resource consumption → dependency ceiling → user-visible degradation. Keep storage growth, request rate, concurrency, and operational workload distinct; ten times the stored data does not automatically imply ten times every resource. Include burst shape, tenant skew, background work, and the degraded path when they can change the first break.

Calculate shared demand across all consumers. Increasing a worker pool can exhaust a database or vendor allowance before improving throughput. For example, two services each configured to open 60 connections compete for a shared limit of 80, not separate 80-connection budgets; compare bounded aggregate demand with the capacity reserved for operations and other callers. Treat configured maxima, observed use, sustainable service rate, and contractual quota as different evidence.

Expose the assumption that controls headroom. Recalculate the first break under plausible changes in miss rate, service time, skew, or failure amplification; a linear projection is a hypothesis whose validity envelope must be stated. If arrival rate can exceed service rate, describe the bounded backlog, age, drain time, and admission or degradation response rather than calling the queue extra capacity.

Compare the smallest tuning change with its downstream cost and saturation signals. Name the point where tuning stops helping and a structural change becomes necessary, its lead time, and the measurable trigger to start that work. Keep modeled future ceilings separate from tested operating limits. Reuse the existing capacity ledger and measurement specifications; this analysis never authorizes load tests or infrastructure changes.

Prefer tuning with explicit saturation and rollback signals before adding new infrastructure. Identify step functions such as sharding, vendor tiers, partition rebuilds, or service splits early enough for their lead time.

Return the capacity ledger and verification plan beneath the caller-supplied `artifact_root`.
