# Phase 4 — Convergence

Reconcile independent testimony and current source into a bounded-complete model with explicit residual unknowns.

## Gate

Read the convergence method in `$HARNESS_ROOT/skills/workspace-learning-core/references/external-interrogation.md`. Recheck material claims and counterexamples against the stored source fingerprint. Use a separate `repository-explorer` verification lane from the authoring pass.

Run `node "$HARNESS_ROOT/scripts/workspace-learning-state.mjs" codeqa-convergence --workspace <workspace> --repo <repo>` before evaluating the broader gate. An unbound dispatch intent or any missing, stale, or rejected typed lifecycle result returns to Phase 3; do not reconstruct it from `EXTERNAL-INTERROGATION.md` or flat checkpoint details.

Route to `system-architect` only for materially ambiguous process/deployment topology or cross-boundary execution. Route to `data-model-architect` only for materially ambiguous persistent ownership, cardinality, or transition writers. Supply reconstruction-only contracts and the exact caller-supplied artifact root.

Convergence requires:

1. Every coverage domain is covered, evidenced not-applicable, or a bounded unknown.
2. Every material relationship has a claim tier and local evidence or is demoted.
3. Every material domain is decomposed into operations; authority, dispatch gates, fallback, transaction, idempotency, and recovery are not generalized across sibling paths without evidence.
4. Every material mutating/asynchronous flow has a reconciled state/side-effect timeline and failure matrix that distinguishes accepted, locally committed, enqueued, remotely acknowledged, delivered/reconciled, and user-visible completion where applicable.
5. Retry exhaustion, durable retention/DLQ or its bounded absence, detection, reconcilers, and automated/manual recovery ownership are explicit.
6. Implementation, inspected tests, configuration/deployment declarations, history, and live-runtime evidence remain separate; negative claims name their bounded search scope.
7. No contradiction can still change purpose, boundary, principal flow, data/state ownership, trust, or operations.
8. At least four core CodeQA rounds succeeded.
9. Two consecutive distinct successful rounds, each locally reconciled and using different open-cell or counterexample lenses, introduced no new material component, boundary, flow, invariant, contract, failure mode, or operational path, or introduced only already-represented items verified locally. Polls and log checks do not count.
10. Remaining questions name the missing evidence and the builder/operator able to resolve it.

If evidence is exhausted while a gap remains, record a bounded unknown. Never fabricate closure or say “everything understood.”

## Artifact

Write `CONVERGENCE.md` with scope, source identity, coverage matrix, operation-authority and failure-model summaries, evidence-class limits, bounded negative searches, confirmed model, demoted/contradicted claims, residual unknowns, builder questions, and why the novelty criterion passed.

## Exit

Persist the convergence result and Phase 4 checkpoint. A failed gate returns to Phase 3 with exact questions; it does not enter course generation.
