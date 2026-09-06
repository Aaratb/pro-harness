# Phase 5 — Review Lanes

## Goal

Review correctness and maintainability across the complete affected surface without duplicating findings or imposing an unrelated stack.

## Load

- `pre-merge-review`
- `general-coding-standards`
- `review-evidence-integrity`
- `review-production-challenge` and its existing readiness matrices
- `architecture-data-model-evolution` for changed data invariants/migrations; `architecture-query-performance` for changed material query/access paths
- routed canonical agents from the policy

## Procedure

1. Always run the core code lane. Trigger architecture conformance, data, legal/dependency, language, accessibility, or interface lanes only from Phase 3 evidence.
2. Review correctness, type and contract safety, error handling, tenancy, concurrency and idempotency, state completeness, compatibility, client behavior, and documentation impact where applicable.
3. For each materially changed symbol, record reuse as `REUSED_EXISTING`, `EXTRACTED_SHARED`, `NEW_JUSTIFIED`, `DUPLICATION_FOUND`, or `NOT_APPLICABLE`, citing adjacent implementations inspected.
4. Record naming determinations for domain language, hidden side effects, Boolean polarity, async behavior, units, public/event names, abbreviations, generic names, adjacent consistency, and stale rename references.
5. Complete the edge-case matrix and hygiene ledger defined by `review-production-challenge`. Every row is evidence-backed `PASS`, `FAIL`, `N/A`, or `UNVERIFIED`.
6. Persist one schema-valid lane report per assigned file through an authorized writer; static agents return their report to the orchestrator. Synthesize duplicate symptoms by failure mechanism; do not concatenate agent prose.

Use `pre-merge-review` to follow input → authority and branches → state/side effect → user outcome. Compare material user states before and after, including retained permissions, entitlements, empty/error states, retries, and recovery. Deleted branches or orphaned locale keys are clues to investigate, not automatic defects. Distinguish a reachable regression from pre-existing context and from a preferred redesign.

Keep reuse, naming, hygiene, and edge-case coverage in the existing ledgers. Shared evidence may support multiple rows; do not generate a separate narrative per symbol or a finding per row. For a candidate, state expected versus actual behavior, trigger, affected users, changed-path link, and the evidence that could refute it. A clean review is valid when scoped evidence supports it; never manufacture findings to demonstrate depth.

## Gate

Pass when all triggered lanes completed or are honestly blocked, material symbols have reuse and naming determinations, and every candidate finding cites the exact reviewed revision and source location.
