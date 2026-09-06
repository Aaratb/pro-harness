# Phase 10 — Reports Handoffs and Optional Comment

## Goal

Publish the complete review packet, emit only eligible Debug Pro handoffs, and perform at most the explicitly authorized external action.

## Load

- `review-handoff`
- `review-evidence-integrity`
- source-control MCP contract only when `--comment` is present

## Procedure

1. Finalize the mode's report envelope from `config/review-pro.json`: fast writes `CODE_REVIEW.md`, `findings.json`, and `production-risks.json`; deep/reverify additionally write `SCORECARD.md`, `PRODUCTION_READINESS.md`, and `PM_REVIEW.md`. All modes retain applicable evidence ledgers, lane reports, eligible handoffs, and state beneath `artifact_root`. Fast's human report includes scope, product impact, evidence caps, bounded verdict, and next actions; it cannot claim deep readiness.
2. Emit one `review-pro/debug-handoff@2` packet only for a `CONFIRMED` or `REPRODUCED` correction-eligible finding. Bind identity, revision, evidence digests, failure story, acceptance criteria, and structured Debug Pro route.
3. Keep packets local until the completion hook below validates all of them. Only then display `/debug-pro --from-review <absolute-handoff-path>`. Recommend the route without automatically dispatching a repair. If the companion is unavailable in the active runtime, preserve the packet and report that limitation.
4. For `--reverify`, rerun `validate-review-resolution.mjs` using the origin-aware intake procedure in `review-handoff/references/debug-boundary.md`. Direct-origin packets need no handoff; Review-origin packets must retain their validated original handoff and unchanged acceptance criteria. Independently rerun the reproduction, acceptance criteria, failure stories, observability checks, and affected lanes. Record results only in the active review root. Return `RESOLVED`, `PARTIALLY_RESOLVED`, `STILL_PRESENT`, or `REVERIFICATION_BLOCKED`; a producer’s `RESOLVED` claim is never sufficient.
5. Invoke `scripts/run-workflow-hook.mjs --workflow review-pro --event before-run-completion --repo-root <repo> --artifact-root <root>` once on the finalized packet before any display or outward publication. It runs command, complete-run, handoff, source-freshness, and workflow-trace checks. Do not separately rerun these covered validators or the final transition hook on unchanged inputs. Resolution validation in step 4 remains required because the hook does not cover it. A changed packet, revision, or relevant evidence invalidates the result; revalidate that boundary.
6. After that gate passes, with `--comment`, render only a concise public summary from validated artifacts. Find the stable Review Pro marker and update one existing comment or create one. Never expose internal lanes, run IDs, confidence machinery, secrets, or formal approve/request-changes events. Preserve any `recovered-with-gaps` qualification in the local report and final handoff; do not claim a clean historical audit.

Keep one concise user-facing conclusion with links to the existing evidence. `PM_REVIEW.md` evaluates the changed product outcome, retained user states, compatibility promises, and known gaps; it is not a new PRD or a redesign request. In fast mode the same perspective belongs in `CODE_REVIEW.md`. Specialist depth stays available in the existing packet without repeating every lane transcript.

Write handoff acceptance criteria as observable behavior and preserved invariants, not a prescribed patch or implementation recipe. Separate the suspected boundary from established root cause; do not launder a proposed fix into an approved repair. Re-verification must inspect whether the repair weakened assertions or changed the original expected outcome, not merely whether the submitted green result is authentic.

## Gate

Complete only when artifacts and digests validate, source remains unchanged outside `artifact_root`, external actions match authorization, and the exact next owner/action is reported.
