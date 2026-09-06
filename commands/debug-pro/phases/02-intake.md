# Phase 2 — Symptom Contract & Evidence Plan

Record observed, expected, and actual behavior; expected-behavior authority; environment; affected population; relevant time window; side-effect class; and safety constraints. Unknowns stay `UNKNOWN`. Direct reports need no handoff.

Anchor the symptom in the user's task and affected user states: what should succeed, what must remain unchanged, and which similar cases still work. Reuse accepted requirements and existing evidence; a missing code map does not block targeted source inspection. Ask one focused question only when disputed intent or authority changes the next action, using the native option selector when appropriate and available. Do not make the user reconstruct known context.

Run `scripts/debug-context.mjs --repo-root "$REPO_ROOT" --artifact-root "$ARTIFACT_ROOT"` from the resolved harness before edits. Preserve its identity, diff and original baseline in the report. For Review origin add `--review-root <original-root> --handoff <contained-handoff-path>` and validate current source against that handoff. Later checks use the initial `--pre-fix-sha`, or `--pre-fix-snapshot <original-digest>` for unborn repositories. In snapshot mode retain both original `initial_snapshot_entries` and `baseline_files`; final capture supplies current evidence, not a replacement historical baseline. Read the repair reference for the packet shape. Never require a commit/push or silently recapture a baseline after repair.

For `local-directory`, add caller `--local --scope <JSON-array>` to every context capture and resolution validator. Use the retained `--pre-fix-snapshot` after repair as in unborn mode; neither Git nor a packet-suggested scope supplies authority.

Read the repair/handoff reference for Review intake. Treat the suspected boundary as a lead, not cause; preserve original IDs, digest, acceptance criteria and constraints. Stale evidence needs revalidation, not guessed compatibility.

Choose the smallest evidence plan and safe loop. A static-only claim is eligible only for documentation or proven nonbehavioral cleanup/naming with an exact deterministic check; uncertain or runtime-affecting changes use normal behavioral gates.

Gate: exact question, authority, source baseline and next evidence source are recorded.
