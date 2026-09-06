---
name: architecture-explanation-diagrams
description: "Deliver source-backed rendered architecture views that make existing behavior, proposed changes, contracts, and consequential paths clear."
---

# Architecture Explanation Diagrams

Build one evidence-linked component and relationship inventory and reuse it across views, contracts, and handoff slices. Deliver the smallest legible set that explains the current decision, not a diagram quota or a gallery of technologies. At Phase 2 show context/as-built boundaries; at Phase 7 show candidate shapes and decision-sensitive flow before selection; at Phase 9 show the consolidated design and material success/failure behavior; at Phase 12 reconcile these into the walkthrough. ADR-only receives the applicable early views without adding Phase 12.

Use the same component identifiers throughout. Label relationships with direction and the actual contract, action, or data transferred; distinguish module, process, deployment, and trust boundaries. A box labeled “service” is not an explanation of responsibility. Title each view with its scope and baseline revision or proposal/decision identifier: `As-built`, `Proposed target`, or `Changes — baseline to proposal`. For greenfield designs, separate real existing integration context from proposed execution without invented files or line numbers.

## Make the change visible

Mark both nodes and edges (relationships), directly or through an unambiguous local key, using a visible colour-independent legend:

- `EXISTING / unchanged`: present in the checked baseline and retained; link the current-source evidence without claiming runtime observation from a code read.
- `NEW / proposed`: introduced by this option or decision, not already built.
- `CHANGED / existing to proposed`: a retained identity changes responsibility, ownership, contract, data, direction, or timing; name its before/after difference.
- `PROPOSED REMOVAL`: present in the baseline but absent from the proposed target. Show it in the baseline/change view, not as an active target path or a completed deletion.

Two unchanged components can have a new or changed relationship; classify the edge independently. Retargeting may be an old removed edge and a new proposed edge. Label sequence interactions as well as participants. Preserve synchronous, asynchronous, conditional, retry, and failure semantics; do not reuse a dashed arrow to mean both “new” and “async.” Keep inference/evidence confidence separate from change status: an inferred current edge is not a new proposed edge. Optional colour or strokes reinforce text, never replace it. Prefer a readable before/after pair to a dense overlay.

## Explain the mechanism

Follow a meaningful operation through entry, authority, invariant ownership, durable effect, and visible result. Show where the highest-consequence failure makes the outcome uncertain, what the caller sees, who detects it, and how recovery avoids another harmful effect. Cover architecture flow, components, primary execution, and consequential failure by the walkthrough; one view may serve several purposes. Add state, data, asynchronous, deployment, or decision views only when material. Keep an applicability matrix and path ledger in the existing packet for success, alternatives, rejection, timeout, retry, duplication, reordering, async work, overload, partition, recovery, races, and unknowns; do not manufacture irrelevant paths for a local ADR.

Check cross-view consistency: sequence participants exist in the inventory; arrows respect declared contracts and authority; recovery agrees with data ownership and retries. Explain the strongest trade-off or uncertainty beside the relevant view, then its consequence and decision request. Walk through rejected alternatives, choice costs, reuse, consistency, the edge-case stopping rule, consequences, and residual risks without transcribing agent reports.

## Render and deliver

Read `../../docs/architecture-visuals.md` for the existing local companion commands and supported rendering boundary. Reuse the current phase's Markdown artifact and matching HTML companion; at Phase 12 produce `EXPLAIN.md` and `EXPLAIN.html`. Local source remains canonical and inspectable as collapsed detail, not the sole visual deliverable. The orchestrator renders locally under ordinary artifact authority; external rendering still requires its own manifest and consent. Do not install a provider or transfer source to work around an unsupported diagram without approval.

Show the rendered companion at the decision checkpoint and inspect it directly when a viewing surface is available. Check legibility, hierarchy, arrow direction, legend, node/edge status, and useful full-size navigation—not syntax alone. Rendering success is not source correctness, architecture certification, visual inspection, or user acceptance. If rendering fails, retain the source and useful architecture evidence and mark the visual deliverable incomplete; if inspection is unavailable, say unverified. Do not claim either happened. Use provisional views to explore unresolved choices before detailed comparison; revise affected views as user input changes the design. Invite alternatives and practical concerns at the existing checkpoint, not an extra gate or a test of the user's understanding.

Static lanes return content in the caller's report contract; only the orchestrator writes or renders beneath the caller-supplied `artifact_root`. Keep diagram checks and source/HTML digests in existing artifact evidence, with no separate schema, approval gate, or documentation workflow.
