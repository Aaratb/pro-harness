# Phase 7: Engineering Requirements & Impact Map

> Load this file only when this phase is selected or resumed.

- **Skills**: `workspace-codemap-context`, `zoom-out`, `api-and-interface-design`, `architecture-decision-records`, `improve-codebase-architecture`, plus the detected data-store skill: `mongodb-performance`, `firestore-performance`, `postgres-patterns`, or `clickhouse-modeling`; add `observability-by-design` and conditional `ai-product-engineering` when their triggers apply
- **Codemap context is optional:** a missing codemap never blocks. Use bounded relevant source plus the approved plan; in greenfield work, map planned modules without inventing existing source. Codemap inputs below apply only when available and relevant.
- **Capabilities**: `diagram.render` is required for rendered ERD and dependency-graph evidence.
- **Why this phase exists**: the build map. It renders the **decisions made in Phase 6 (spec + ADRs + tasks)** — *not* the raw PRD — into a concrete engineering footprint *before* code is written: which exact files/modules/services/tables change, the production **data model** (entities + relationships), and the **dependency build order**. This is the full-stack bridge for a PM-who-also-codes: Plan decided *what and why*; the ERD says *exactly where and in what order*. It is deliberately placed **after** Plan so it reflects real architecture decisions rather than guessing against an undecided solution (which would be rework). It is still a **living document** — re-validated and corrected during Phase 8 (Build) as reality diverges. It does not re-open architecture; it operationalizes it.
- **Inputs**: `spec.md`, `tasks.md`, any `adr-NNN.md`, the Phase 2 Engineering Impact Lens, each touched repository's `.codemaps/CODEMAP.md`, optional owner-repository `.codemaps/workspace/MASTER.md`, and applicable `.codemaps/apps/<app>.md` files.
- **Parallel agents** (single batch):
  - `repository-explorer` — **blast-radius scan**: for each spec item or task, enumerate every affected file, module, endpoint, event, and configuration item, grounded in opened repository evidence.
  - `system-architect` — **dependency graph + build sequencing**: what must exist before what, module boundaries, cross-repo / cross-service edges, and the risky seams (reconciled against `tasks.md`), including cross-cutting contracts when multiple services or repositories are involved.
  - `database-engineer` — the actual **Entity-Relationship / data model**: entities, fields, relationships, new vs changed tables/collections, indexes, and migration / backfill implications for production data.
- **Mermaid rule**: render the ERD, dependency graph, and intended API/runtime sequence through `diagram.render`, then embed both Mermaid source and repository-local SVG references for each in `erd.md`. The sequence diagram must show caller, authorization, service, data/external dependencies, response/error, correlation and telemetry boundaries. For AI, also show context assembly, model/provider, retrieval, tools, validation, fallback, and evaluation/monitoring boundaries. Never claim a diagram is rendered when the capability failed.
- **Output**: `.agents/features/<slug>/erd.md` containing:
  1. **Living-document banner** — "Build map derived from the Phase 6 plan + codemap. Re-validated and corrected during Phase 8 (Build); expect revisions."
  2. **Affected-files / blast-radius table** — `file or module → spec item / task it serves → change type (new / modify / delete) → risk (H/M/L) → notes`.
  3. **Data model (ERD)** — Mermaid entity-relationship diagram + a table of entities / fields / relationships; new & changed schema, indexes, and migration / backfill notes for production data.
  4. **Dependency graph & build order** — Mermaid graph + an ordered list of build slices (what to land first, what unblocks what), reconciled with `tasks.md`.
  5. **Integration touchpoints** — APIs, events / queues, external providers, feature flags, and tenant scoping.
  6. **Intended request sequence** — the planned end-to-end success path and key failure path, with trace/correlation propagation and any AI boundary shown explicitly.
  7. **Module map & line budgets** — copy the **approved** `module-map.md` into `erd.md` as a table: `file/module → responsibility → budget → est. final lines → split plan`. Flag any row where est. lines > budget as **BLOCKED until re-split**.
  8. **Open technical questions & risks** — each with an owner.
- **Entry gate**: do not start Phase 7 until Phase 6 `module-map.md` is **user-approved** (`staff_discipline.module_map_approved: true`). Do not start Phase 8 until `erd.md` §7 has no unresolved budget violations.
- **Differentiation from Phase 6**: Plan = *decisions, ADRs, task breakdown, risk register, module map*. ERD = *the concrete file-level + data-model + build-order map that realizes those decisions*. Do not duplicate the plan's prose; reference it and make it spatial/visual.
- **Auto-skip**: pure-docs / no-code-or-data changes, or `erd.md` already exists. For backend-heavy / production-data features this phase is the whole point — do not skip it.
- **Feeds**: Phase 8 (Build slices follow the dependency order, the data model, and the approved module map directly).
