---
name: architecture-system-performance
description: "Decompose end-to-end performance targets into measurable budgets, arithmetic-backed hypotheses, and bounded verification specifications."
---

# Architecture System Performance

Start from an explicit user-facing latency, throughput, saturation, or cost target. Allocate per-hop budgets with units, reserve headroom, and label every input as confirmed or modeled.

Analyze fan-out, serialization, cache hit and miss distributions, pools, queues, worker concurrency, allocation pressure, retries, and downstream ceilings with visible arithmetic. Percentile budgets do not compose by summing percentiles; use end-to-end measurement and treat per-hop values as allocations.

## Explain one workload end to end

Trace a representative user operation through its actual synchronous critical path and deferred work. State request rate, payload or data shape, concurrency, skew, and dependency calls; identify which completion the user experiences. Follow amplification into shared resources rather than budgeting each service as though it had an independent database, queue, or provider allowance. Reuse this workload and evidence with capacity analysis.

For example, a modeled 100 requests/s with 20% cache misses and three queries per miss generates 60 logical queries/s on that miss path; 1.2 attempts per query raises it to 72 attempts/s. These are assumptions, not observations. Test whether misses, retries, or hot tenants correlate under load; a healthy average can hide the same dependency failing across every branch. Count background work and other callers competing for that dependency.

For a stable workload, mean in-flight work is arrival rate × mean residence time with consistent units. Do not substitute a tail latency into that relation or assume stability when arrivals exceed service capacity. Separate time doing work from queueing, serialized dependencies from parallel fan-out, and the slowest required branch from the sum of branch times. Bound the effect of retries and cancellation after the user has already timed out.

Identify the assumption most likely to reverse the recommendation, then compare a targeted change with the simpler baseline: less work, existing reuse, reduced fan-out, or changed scheduling before new infrastructure. State the expected user-visible gain and the observation that would falsify it. An isolated microbenchmark cannot prove the end-to-end target.

Rank hypotheses by expected contribution, confidence, and cheapest falsifying measurement. Measurement specifications define load shape, data scale, warm and cold behavior, sample floor, percentile, pass threshold, failure path, and coordinated-omission protection.

Return budgets, hypotheses, and measurement specifications beneath the caller-supplied `artifact_root`; do not execute benchmarks or live probes.
