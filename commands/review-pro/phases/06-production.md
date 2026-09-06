# Phase 6 — Security and Production Challenge

## Goal

Challenge attack surfaces, failure behavior, scalability, and operability with evidence rather than generic checklists.

## Load

- `security-review`
- `review-production-challenge`
- `production-readiness`
- `observability-by-design`
- triggered `security-reviewer`, `resilience-analyst`, `performance-architect`, `capacity-planner`, and `operability-reviewer`
- `architecture-security-review` for triggered authority/abuse paths; `architecture-system-performance` and `architecture-capacity-and-tuning` for changed latency, throughput, or resource ceilings
- `ai-product-engineering` for material model, prompt, retrieval, or tool behavior; use its security/evaluation references within Review's read-only authority

## Procedure

1. Route all security work through `security-reviewer`. Load only triggered API, identity/secrets, privacy/data-transfer, AI/tool, or infrastructure focus packets.
2. A security candidate needs an actor, precondition, step sequence, observable outcome, changed reachable path, and independently reopenable evidence.
3. For every changed critical or risk-bearing path, answer the four-part failure story: dependency unavailable, simultaneous execution, malicious or malformed input, and 10x volume.
4. Always perform static performance analysis. For throughput-sensitive changes, show arithmetic across applicable CPU, memory, database, cache, queue, worker, network, dependency limits, fan-out, payload, client, locks, and retry amplification.
5. Keep measured and modeled evidence distinct. Without representative measurement, throughput-sensitive work cannot receive the highest performance grade.
6. Assess deployment, rollback, degradation, recovery, telemetry, alerts, runbooks, and ownership without mutating infrastructure or live services.

Compose the applicable four-part stories through the same changed operation: trigger, boundary/control, observable customer or resource effect, detection, containment, and recovery. Challenge interactions between protections—for example, retries during a dependency outage can exhaust a shared pool. Reuse the same scenario and evidence across relevant rows instead of writing independent generic stories. Retain all required applicability statuses; scale depth follows the affected path, not a quota of hypothetical infrastructure.

For AI changes, inspect authorization outside the model, trust in retrieved/tool content, exact approved-action binding, uncertain outcomes, fallback, and versioned evaluation evidence. Separate deterministic permission/contract correctness from probabilistic quality; missing evaluation evidence is a cap, not a guessed score. No live exploit, provider request, architecture redesign, or repair is authorized by these methods.

## Gate

Pass when triggered security focuses, four-part stories, static performance, and operability evidence are complete or explicitly capped. Unsupported `N/A` is a failure.
