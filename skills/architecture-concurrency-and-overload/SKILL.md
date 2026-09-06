---
name: architecture-concurrency-and-overload
description: "Design and audit concurrency, ordering, idempotency, admission control, backpressure, retry budgets, and overload behavior."
---

# Architecture Concurrency and Overload

For every material synchronous or asynchronous boundary, define ownership, concurrency limit, queueing point, timeout, cancellation, retry budget, idempotency key, ordering, deduplication, and late-success behavior.

Trace lifecycle overlaps and race windows. State the invariant, competing actors, unsafe interleaving, prevention or detection control, recovery, and verification method. For queues, compare arrival and service rates, bounded depth, age, poison-message handling, replay, and downstream pressure.

Overload behavior must be intentional: admit, shed, degrade, buffer, or reject with a user-visible and observable outcome. Retries must fit an end-to-end budget and must not amplify an unhealthy dependency.

Return the concurrency and overload contract beneath the caller-supplied `artifact_root`.
