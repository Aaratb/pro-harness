# Phase 8: Implementation Specs

> Load this file only when this phase is selected or resumed.

- **Skills**: `api-and-interface-design`, `specification-writing`, `incremental-delivery`, `right-sized-engineering`, `plan-review-orchestrator`; add the detected data-store skill for migration detail, `observability-by-design` for runtime boundaries, and `ai-product-engineering` only when the AI overlay activates
- **Capabilities**: `diagram.render` is required for the rendered request-sequence evidence.
- **Why this phase exists**: the last step before code. Phase 7 fixed the shape; this phase fixes the detail an implementer would otherwise invent — every field and its constraints, every API and its auth and error contract, the migration, and the order the work lands in. It adds detail to Phase 7's shape; it does **not** re-decide entity ownership or integrity rules.
- **Inputs**: `spec.md`, `erd.md`, `module-map.md`, any `adr-NNN.md`, the handoff's `contracts/<id>.json` when present, and the touched repositories' codemaps.
- **Parallel agents**:
  - `implementation-planner` — task breakdown, build order, risk register.
  - `database-engineer` — fields, types, constraints, indexes, migration and backfill against the approved entity model.
  - `repository-explorer` — file-level confirmation of the blast radius at the detail now known.

**What to write:**

1. **Field definitions** — per entity: field, type, nullability, default, uniqueness, and the invariant it carries. Where a certified `schema-plan.md` came through the handoff, derive from it: add fields, indexes and backfill detail rather than re-deciding ownership.
2. **Constraints and indexes** — the integrity that lives in the datastore versus the integrity that lives in application code, and why each sits where it does. Every index carries the access path that justifies it.
3. **API definitions** — per changed or consumed interface: the contract, its source of truth, authentication and authorization, base URL source, request and response shapes, the success case, and the key failure cases with their status and error bodies. Idempotency and retry semantics where the operation is not naturally safe.
4. **Migration and backfill** — sequenced expand, migrate, verify, then contract; the rollback path and the compatibility window it preserves; locking, hot-table and backfill-duration risks named with their mitigation.
5. **Request sequence** — the planned end-to-end success path and the key failure path, rendered through `diagram.render`, showing caller, authorization, service, data and external dependencies, response and error, correlation and telemetry boundaries. For AI, also show context assembly, model and provider, retrieval, tools, validation, fallback, and evaluation and monitoring boundaries. Never claim a diagram is rendered when the capability failed.
6. **Task breakdown** — `tasks.md`, in dependency order, reconciled against the Phase 7 dependency graph and the approved module map. Build slices must not violate the map without updating it first.

- **Verification contract**: enumerate every changed or consumed API, its source of truth, authentication and authorization, base URL source, safe sample-data owner, success and key failure cases, expected product telemetry, and the Phase 10 runnable probe. Mark values as `discovered`, `needs-user-input`, or `not-applicable`; never ask for discoverable repository facts.
- **Conditional AI plan**: when active, version the model, system prompt, context assembly, retrieval, tools, structured output, safety and fallback contracts; define deterministic tests, the evaluation dataset, slices and scorers, the baseline, thresholds, cost and latency budgets, monitoring, and rollback before implementation.
- **Interface-ergonomics pass** for any API, CLI, SDK or agent-facing surface: describe what a 10/10 would look like for this product, say where the spec sits, name the gap, and set a time-to-hello-world target as a number. Raise each friction point as its own checkpoint item — batching them into one "UX concerns" bullet reliably gets it waved through.
- **Right-sizing judgement (mandatory, one line):** what detail this problem actually needs, and what you deliberately left out. Versioned APIs, extension points, config surfaces and migration machinery for a single known caller are over-engineering; no error contract, no idempotency, or no backfill plan for a change that clearly needs one is under-engineering.
- Review the draft with `plan-review-orchestrator` before the freeze; reuse the unchanged Phase 7 critique rather than repeating it.
- **Freeze the contract at the 8 to 9 boundary.** Record every consumed contract id and its digest in `verification_contract`. Phase 9 presumes a frozen API contract; this is where it is frozen. A contract that changes after the freeze reopens Phase 8 rather than being edited in place.
- **Exit gate to Phase 9**: the verification contract is frozen; every task's interfaces close; every module-map concern is addressed or explicitly accepted with a one-line reason.
- **Auto-skip**: only a trivial single-file change with no new API surface, no schema change and no migration — announce it and record the reason. Otherwise mandatory: this is the last gate before code, and it holds the contract freeze.
- **Output**: `.agents/features/<slug>/impl-spec.md` and `tasks.md`, plus validated HTML companions when useful.

## Additional phase requirements

- **Every task declares its interfaces.** Per task record `Consumes:` (types, contracts, endpoints or events it needs, each either already existing or produced by a named earlier task) and `Produces:` (what it makes available). A task whose `Consumes` names nothing that `Produces` it is an ordering defect — catch it here, not mid-build.
- **No placeholders.** `TODO`, `similar to the above`, `handle errors appropriately`, an unresolved library choice, or a step with no expected output are spec failures, not implementer discretion.
- Apply the Phase 6 decision classification — Mechanical, Taste, User Challenge — rather than restating it. A User Challenge item is never auto-resolved.
- **"No issues found" requires what was examined.** "Skipped" is never valid.
- **Detail, not redecision.** If writing a field forces a different entity owner, that is a Phase 7 open question with an owner, not an edit made here.
