# Phase 2 — Local Study

Build the first source-backed model before external interrogation so CodeQA is challenged by evidence rather than used as an oracle.

## Method

Load `codebase-onboarding` and `$HARNESS_ROOT/skills/workspace-learning-core/references/external-interrogation.md`. If a current codemap exists, use `workspace-codemap-context` only after checking its source identity and relevant freshness.

Use a bounded `repository-explorer` lane for repository topology and principal flows. Keep source read-only and do not execute repository scripts or tests. Inspect applicable instructions, public entries, wiring, configuration, schemas, migrations, events/jobs, deployment declarations, tests, runbooks, and relevant local Git history.

Decompose broad domains into material operations before describing ownership. For each operation identify its entry/callers, dispatch predicate, selected authority, pre-dispatch alternative, post-dispatch behavior, reads/writes, locks/transaction boundary, idempotency/deduplication, response semantics, and recovery owner. A class, experiment, fallback, outbox, or status name is a search lead rather than proof of its behavior.

For every material mutating or asynchronous flow, build a cited state/side-effect timeline and failure matrix. Determine the actual causal order among validation/authorization, gates/locks, local transactions and commits, remote effects, enqueue/after-commit work, retries/reconciliation, and the strongest proven completion; do not assume any one ordering. Cover failure before a remote effect, an uncertain remote effect, local failure after a remote effect, enqueue/publish failure, retry exhaustion, durable retention or DLQ, duplicate/loss risk, detection, and automated/manual recovery. Inspect outer clients and middleware because they may translate transport errors or non-2xx responses before the visible caller handles them.

Cover the complete matrix:

- existence, users, ownership, and separation boundary;
- packages, processes, entries, registration, generated/vendor boundaries;
- principal request/event/job flows and exits;
- data ownership, writers/readers, transitions, invariants, transactions;
- upstream/downstream contracts and reverse dependencies;
- sync/async timing, retries, ordering, idempotency, concurrency;
- validation, authorization, trust, failures, recovery, and operations;
- test strategy, observed evidence limits, history, conventions, and change seams.

Keep implementation source, inspected test source, configuration/deployment declarations, Git history, and live operational evidence separate. A mocked test proves only the mocked contract; a static route, flag, Dockerfile, cron entry, or tracked generated file does not prove live traffic, scheduling, deployment, source ownership, or freshness. Distinguish a filename/date or commit landing from runtime adoption. Before calling behavior dormant or absent, search callers, registrations, reverse references, dynamic wiring, configuration, relevant history, and counterexamples. Record the searched roots/patterns and exclusions, and use “not found in bounded search” for negative findings.

Write the narrative and coverage matrix to `LOCAL-STUDY.md`, the per-operation routing/authority evidence to `OPERATION-AUTHORITY.md`, and timelines/failure/recovery evidence to `INVARIANTS-AND-FAILURE.md`. Create a concise `README.md` navigation page; do not duplicate the explanation. Classify each material claim and each matrix cell. If an artifact is genuinely not applicable, record evidenced N/A rather than omitting it.

## Exit

Compute SHA-256 digests for `LOCAL-STUDY.md`, `OPERATION-AUTHORITY.md`, and `INVARIANTS-AND-FAILURE.md`, then complete Phase 2 with `checkpoint --workspace <workspace> --repo <repo> --phase 2 --status completed --detail local_study_digest=<64-hex> --detail operation_authority_digest=<64-hex> --detail invariants_failure_digest=<64-hex>`. These exact digest fields are mandatory after a version-2 migration and should be supplied for fresh runs too.

Persist coverage, source fingerprint, citations, operation/failure matrices, evidence-class limitations, bounded-search scope, surprises, contradictions, and unknowns. Phase 3 receives the concise matrix and unresolved questions, not raw source payloads.
