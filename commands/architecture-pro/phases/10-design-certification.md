# Phase 10 — Design Certification

Validate the selected design against every hard constraint, measurable target, contract, security route, quality lane, fitness specification, complexity budget, ownership requirement, rollout, rollback, and accepted residual risk.

Recompute state, harness provenance, source fingerprint, evidence, and artifact digests. Confirm that every material quantitative claim is correctly typed and that unverified evidence has not been presented as measured fact.

`DESIGN_CERTIFIED` requires explicit architecture sign-off, no unresolved mandatory blocker, complete material lane disposition, and a design that can be handed to implementation without inventing boundaries or choices. Otherwise record `BLOCKED` with exact unmet controls. ADR-only uses the reduced profile and proves unrelated outputs immaterial rather than silently omitting them.

For ADR-only, sufficiency is the approved scoped decision, affected boundaries/contracts and invariants, viable alternatives and fresh challenge, consequences, applicable fitness specifications, rollback or revisit conditions, and evidence-backed lane dispositions. It is not a complete implementation plan for the surrounding system and emits no Feature Pro handoff by default. Existing decision approvals, source/evidence integrity, static authority, and applicable certification proof still apply.

For ADR-only, retain the rendered views from Phases 2, 7, and 9 with the decision; do not add Phase 12. In every design mode, distinguish structural certification from visual delivery and inspection. Report any visual deliverable as incomplete when rendering failed, and any unperformed inspection as unverified; neither source-only diagrams nor passing packet checks establish visually reviewed quality. Preserve the architecture evidence and existing certification controls without adding a visual schema or approval gate.
