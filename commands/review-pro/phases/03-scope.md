# Phase 3 — Scope and Risk Routing

## Goal

Determine the affected product and system surface, then select only evidence-triggered review lanes.

## Load

- `score-change-risk`
- `review-core`
- `repository-explorer` methods inline; dispatch only for a distinct delegated question

## Procedure

1. Classify the change as frontend, backend, data or migration, infrastructure or CI, test automation, dependency or supply chain, documentation, AI product, or mixed.
2. Extract materially changed symbols, including deleted guards, contracts, configuration, and validation. Qualify generic names with their containing module.
3. Map bounded upstream callers, downstream consumers, public contracts, data boundaries, tenant boundaries, side effects, deployment surfaces, and rollback implications.
4. Record consumer discovery as searched, found, stale, timed out, inaccessible, or proof required. `--repos` is the complete allowed set for additional repositories.
5. Trigger canonical lanes from `config/review-pro.json`. Specialists require detected stack, datastore, interface, or operational evidence; they are never selected from preference alone.
6. Docs-only scope may mark runtime checks `N/A` only with a path-based reason. It still requires links, examples, secrets, hygiene, and README checks.
7. Establish the initial risk tier and verification depth without turning hypotheses into findings.

Establish the product promise from approved requirements and verified existing behavior, not PR persuasion alone. Compare before and after for the affected journey, roles, entitlements, saved state, and error/recovery states. Identify intentional changes separately from compatibility obligations. Missing requirements call for source-grounded assumptions or a focused intent question, not a new product-planning exercise.

Prioritize paths where changed behavior can affect users, data, authority, or operations. A datastore or deployment elsewhere in the repository is not by itself a trigger for a full-system review. Keep relevant adjacent consumers in scope; mark inaccessible consumers unknown rather than treating a bounded search as universal coverage.

## Gate

Pass when every lane is justified or explicitly not applicable, changed symbols have bounded consumer coverage, and missing scope evidence is visible.
