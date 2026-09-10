# Phase 9 — Deep Design

Turn the approved option into an implementation-grade design. Every material specialist lane participates or records a justified immaterial or blocked disposition. Load deeper methods only when the evidence triggers below apply. Record why other methods are immaterial using scoped evidence, not absence of time or tooling; missing evidence for a potentially material lane stays unverified or blocked. A focused local ADR does not require an invented distributed system, recovery topology, or 100x target.

Load `plan-engineering-review` and reuse the selected scenarios and component identifiers. Walk the primary success path and highest-consequence failure through the actual proposed boundaries. For each material invariant, name the authoritative state, every writer, enforcement location, and recovery owner. Resolve cross-lane contradictions—for example, a retry policy that exceeds the latency budget, deletion that misses restored data, or a consistency choice that breaks the product promise. Parallel specialist reports are inputs to one coherent design, not separate designs to concatenate.

Co-design unresolved boundaries in dependency order on the evolving rendered view, before consolidation: ownership, interface/data behavior, failure/recovery and deployment/evolution where material. Load `grill-with-docs` for user-owned trades; recommend behavior and invite another scenario. Show user input → changed boundary or contract → consequence. No per-layer approval quota: settled or delegated reversible details proceed. A trade against the selected option returns to the decision path, never buried in implementation detail.

| Deeper method | Material trigger |
|---|---|
| `architecture-distributed-consistency` | Replication, cross-boundary writes, event delivery, or distributed state invariants |
| `architecture-concurrency-and-overload` | Shared mutable state, async work, concurrent requests, queueing, or overload |
| `architecture-data-recovery` | Durable data, backups, restore, stateful dependencies, or recovery objectives |
| `architecture-capacity-and-tuning` | Capacity, cost, saturation, tuning, or explicit 10x/100x targets |
| `architecture-data-model-evolution` | Persisted or event schemas, migration, or retention changes |
| `architecture-system-performance` | Material latency, throughput, or resource targets |
| `architecture-query-performance` | Datastore access on a material path |
| `architecture-diagnostics` | Multiple components, async work, or reliability targets |
| `production-readiness`, `observability-by-design` | Deployed behavior, rollout, telemetry, or operational ownership |
| `ai-product-engineering` | Material model, prompt, retrieval, or tool behavior |

Apply these triggers to the affected operation and its dependencies. For example, a read-only preview decision may reuse existing persistence without changing recovery behavior; cite that boundary instead of auditing the entire datastore. If preview can mutate authoritative state or the decision depends on a recovery promise, recovery becomes material. This scoping does not remove the mandatory security/conformance baseline or justify ignoring an unknown write path.

Load `architecture-explanation-diagrams` and produce rendered applicable boundaries and ownership, component and deployment views, and interface and data contracts in the existing design Markdown packet and local HTML companion. Reuse stable identifiers and show the approved proposal's node and relationship changes against the as-built baseline. A before/after pair is preferable to an unreadable overlay. For each material boundary define authentication, authorization, tenancy, validation, errors, timeouts, retries, idempotency, ordering, deduplication, compatibility, deprecation, and migration rules as relevant; explicitly justify any immaterial control.

For triggered lanes include query and access paths, end-to-end latency budgets, capacity and tuning at the approved scale targets, diagnostic ambiguity, dependency-ordered backup and restore, concurrency invariants, operation-level consistency choices, overload and backpressure, degradation, operability paper drill, failure analysis, and observability. Always preserve the minimal threat and data-transfer map, ownership, applicable rollout and rollback, and measurable fitness specifications. Material 1x, 10x, and 100x questions retain their full analysis; do not require all three scales for an unrelated local decision.

Public API or event boundaries require a complete contract with producer and consumer coverage, ownership, service objectives, and validation.

Write these beneath `artifact_root` and register each in the Phase 11 handoff:

- `design/design-doc.md` — the consolidated design. Terminal here: Feature Pro consumes it and never rewrites it.
- `contracts/<contract-id>.json` for every exposed boundary, conforming to `~/.agents/schemas/architecture-pro/contract.schema.json`, plus `contracts/<contract-id>.openapi.yaml` as the publishable form for an HTTP boundary. The JSON record is the source of truth; the OpenAPI is generated from it. Populate `contract_ids` from these filenames so identifiers and bodies agree.
- `data-model/schema-plan.md` — entities, ownership, integrity rules, compatibility and migration strategy. **Plan only: no DDL and no migration files.** `database-engineer` writes those in Feature Pro against this plan; `data-model-architect` cannot write to the repository, which keeps the split honest.

Load `api-and-interface-design` for the contract pair and `architecture-data-model-evolution` for the schema plan. AI systems additionally require versioned model, prompt, context, retrieval, tool, schema, safety, evaluation, cost, latency, fallback, monitoring, and drift behavior.

Keep proposal and evidence distinct: a specified future test is not observed or measured behavior. A new design needs explicit fitness specifications and feasibility evidence; an audit claim about current behavior needs actual evidence. Neither a diagram nor a green schema check proves a performance, recovery, security, or AI-quality target. Record who will run each missing proof and when it must pass; do not waive certification's required measurements. Show the consolidated architecture and decision-changing specialist objections before certification, reusing earlier views rather than creating duplicate artifacts.

If evidence, constraints or targets invalidate the option, return legally to Phase 8. With no legal return (ADR-only), hold dependent certification and request a fresh scoped run; never jump state. Preserve decisions, evidence, dissent and reopen reasons in history. Allow at most two recorded decision reopenings.
