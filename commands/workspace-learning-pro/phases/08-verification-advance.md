# Phase 8 — Verification & Advance

Prove durable handoff and zero target-source status delta before advancing the workspace queue.

## Verification

1. Run the state helper's `verify` against the Phase 1 `baseline` snapshot. Porcelain status must match byte-for-byte. If only workflow artifact paths appear, repair only the exact local excludes and recheck. If tracked source/configuration changed, stop and report; never discard it.
2. Verify `README.md` links to `LOCAL-STUDY.md`, `OPERATION-AUTHORITY.md`, `INVARIANTS-AND-FAILURE.md`, `EXTERNAL-INTERROGATION.md`, `CONVERGENCE.md`, the current local Explainer course, publisher URL, codemap README/VIEW, and current source fingerprint.
3. Recheck workflow/artifact contract version `2` with no outstanding Phase 2 restudy or unbound dispatch intent, the learning-artifact digests, typed CodeQA lifecycle/convergence result, persisted Explainer completion result, publisher pulled validation, Workspace Codemap rendering/integrity result, convergence gate, and all eight phase checkpoints.
4. Confirm no secret-shaped values, private payloads, raw transcripts, or hidden reasoning were persisted.

If an artifact is degraded, distinguish a usable partial handoff from completion. Missing hosted course, missing canonical codemap rendering/integrity, or a source-status delta blocks completion.

## Advance

Mark the repository complete only after every gate passes. Select the next available pending repository and enter Phase 1 without an extra approval pause. A blocked repository stays current unless the user explicitly skips it; record skips as exceptions, never completion.

When no pending repository remains, report per-repository purpose, source fingerprint, local index/course/codemap paths, publisher URL, CodeQA transport/task/round count and ref parity, coverage, residual unknowns, status verification, and unavailable/blocked/skipped exceptions.
