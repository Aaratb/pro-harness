# Evidence and finding contract

## Evidence tiers

- `source`: exact reviewed source or configuration location.
- `test`: existing test command and result bound to the reviewed revision.
- `runtime`: bounded observation from an approved environment.
- `log` or `trace`: redacted telemetry with time window, environment, and correlation identity.
- `ci`: authenticated check identity, revision, and conclusion.
- `modeled`: explicit assumptions and arithmetic; never described as measurement.
- `human-provided`: provenance recorded, independently corroborated before confirmation.

Every evidence record binds repository, comparison, base, reviewed head, and diff. New initial-snapshot records require `comparison: initial-working-tree`, null base/head and the captured `diff_digest`; nullable commits alone are not an identity. Non-null legacy records may derive an omitted comparison only from authenticated intake. Store records as `evidence/<evidence-id>.json`. A file-backed record also carries the contained artifact path and SHA-256 file digest; non-file observations use null artifact fields and the canonical digest of their structured record.

## Finding gates

A finding records: stable ID; category; severity candidate; verification status; confidence; repository/base/head/diff identity; changed and affected paths; expected and actual behavior; trigger; failure mechanism; reachability; evidence IDs; product and technical impact; suspected boundary; remediation direction; and validation target.

Allowed verification statuses are `CONFIRMED`, `REPRODUCED`, `LIKELY`, `UNVERIFIED`, and `REFUTED`. Only confirmed or reproduced correction-eligible findings may produce Debug Pro handoffs. CRITICAL and HIGH also require confidence of at least 80.

Independent verification tests the claim against its strongest counterevidence, not merely the prior author's citations. A source-backed mechanism may be `CONFIRMED` after a fresh review; `REPRODUCED` needs an actual authorized observation of the failure. Keep expected behavior, observed or source-supported behavior, and hypothetical consequences distinct. A digest authenticates bytes, not truth or independence.

Preserve actual reviewer identity, delivered methods, evidence revision, contrary evidence, and disposition in existing `CODE_REVIEW.md` notes. Use the existing evidence fields for collected proof and existing finding fields for the resulting decision. The verifier returns evidence and a disposition to the orchestrator; do not add schema fields, create an unregistered lane, or overwrite the candidate history to conceal refutation. The workflow-event stream remains privacy-safe execution metadata, not a place for source bodies or private reviewer reasoning.

## Absence and freshness

Absence claims require a complete bounded search with searched roots and exclusions. A new revision invalidates source, test, runtime, CI, and absence evidence unless independently proven unchanged.
