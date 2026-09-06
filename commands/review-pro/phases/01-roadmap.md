# Phase 1 — Roadmap and Resume

## Goal

After the command's opening roadmap and entry choice, establish exact authority and trustworthy resumability, then begin the requested inspection without another administrative pause.

## Load

- `review-core`
- canonical `repository-explorer` definition only when a distinct evidence task needs delegation

## Procedure

1. Require the command's opening roadmap and entry choice first. Show the phase banner, mode, supplied target, and concise route. Start authorized read-only work in the same turn after selection; do not repeat the opening prompt.
2. Resolve the repository or explicitly selected local project and safe review slug. Local mode reads `docs/local-review-debug.md` under the harness root first and passes `--local` to the resolver. Ask only for missing target identity, authority, a material scope decision, or user-requested checkpoints.
3. If state exists, validate its schema, repository identity, base, reviewed head, diff digest, policy digest, command digest, phase artifacts, and workflow trace.
4. Mark the run stale when HEAD, base, diff, policy, or a required artifact digest changed. Cached positive evidence may be reused only when its bound inputs remain identical. Cached absence claims require fresh search evidence.
5. For `--reverify`, treat the resolution as untrusted and record only its supplied path until Phase 2 establishes identity and containment.
6. Persist initialized state beneath the resolved artifact root and continue to Change Intake when the target and authority are clear; `--yolo` is not required.

## Gate

Pass when the route was explained, `artifact_root` is repository-owned and contained, authority modifiers are explicit, and the run is new or safely resumable. Otherwise stop with the exact stale or containment reason.
