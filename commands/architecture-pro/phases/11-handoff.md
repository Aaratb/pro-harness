# Phase 11 — Handoff Assembly

Assemble a versioned implementation or remediation packet from certified evidence. The handoff remains draft until the walkthrough and final review are approved.

Create dependency-ordered, reversible slices at reviewer boundaries. Every slice names owner, prerequisites, exact scope, risk, rollback, acceptance criteria, verification, and affected contract versions.

Each slice declares `consumes` and `produces`. Every consumed interface, type, endpoint, event, schema, or artifact must already exist or be produced by an earlier slice. A reviewer should be able to reject one slice while approving its neighbor; otherwise resize it.

Trace each material boundary → contract → implementation slice → verification in the existing handoff and design artifacts. Include the capability's user outcome and invariant, reusable source locations where known, compatibility window, and failure assertion so a builder need not invent the architecture. Prefer end-to-end slices that expose the riskiest assumption early; do not make a task list per technology layer by habit. Feature Pro inherits the approved decisions and source-linked evidence while retaining its own product, implementation, QA, and release gates.

Reject placeholders, unresolved choices, vague verification, and hidden migration steps. Validate the shared architecture handoff schema and bind every artifact digest. Register Phase 9's `design/design-doc.md`, every `contracts/<id>.json` and `.openapi.yaml`, and `data-model/schema-plan.md` in `artifact_digests`, and set `contract_ids` from the contract filenames. Adding an artifact changes the handoff digest, so recompute `state.handoff_digest` before sealing — nothing can be attached to a sealed packet. Feature Pro may treat only a current `DESIGN_CERTIFIED` packet as authority to skip architecture re-planning.
