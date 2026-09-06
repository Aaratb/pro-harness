# Phase 20: Handoff & Reviewer Pack

> Load this file only when this phase is selected or resumed.

- **Skills**: `internal-comms`, `documentation-maintenance`, `review-pull-request` when a PR exists, `workspace-codemap-context`; optionally `changelog-generator`, `delivery-retrospective`, `session-checkpoint`, and `observability-by-design`
- **Capabilities**: `messaging.send` is optional and confirmation-gated; drafting the handoff never requires it.
- **Why this phase exists**: once work is built, shipped, or paused, a reviewer or stakeholder needs **one** copy-paste-ready message that says what changed and how confident we are, plus links to every useful artifact. Assemble that package from **whatever exists in the current state**; do not require all prior phases.
- **Runs from the current state (key property)**: read `state.json` to learn which phases are `done`. Collect only artifacts that actually exist; mark any template field with no backing artifact as `N/A — <phase> not run` rather than fabricating it. So Phase 20 is valid even mid-pipeline (e.g. right after Build, before deploy) — it simply reflects how far the work has come, and labels the rest honestly.
- **Not a gate**: optional, final, user-skippable. It can run at any time without completing all earlier phases. Re-run via `refine` to regenerate from the latest state.
- When `delivery-retrospective` runs, prioritize logical delivery slices, lead time, rework, and outcome evidence. Raw line count is supporting context, not the primary productivity measure.
- **Inputs (collect whatever is present — never invent)**:
  - Docs: `requirements.md`, `prd.md`, `competitive-research.md`, `design/`, `spec.md`, `tasks.md`, `module-map.md`, `erd.md`, any `adr-*.md`, `reviews/code-review.md`, `reviews/platform-review.md`, `compression.md`, `runtime/local-evidence.md`, plus their `.html` companions.
  - Evidence: screenshots under `.agents/features/<slug>/runtime/`, API test and sequence evidence, product observability and conditional AI evaluation evidence, test artifacts and coverage delta under `tests/`, the validated `run-events.jsonl`, and the Phase 15 report under `verification/`.
  - Live links: PR URL(s), a separate test PR when one exists, staging URL, production deploy evidence, monitoring dashboard, and explicitly approved external links recorded in state.
  - Status signals: `git diff --stat <base>...HEAD` for the change footprint; `ci.read` and `scm.pull-request.read` for test and merge-readiness evidence when a PR exists.
- **Agents** (single parallel batch, lightweight):
  - `technical-writer` — draft the handoff message in the 9-field template below.
  - `documentation-updater` — assemble the reviewer pack manifest (every doc + link, grouped, each with a one-line "why a reviewer needs it").
- **Handoff message — the 9-field template (fill each from artifacts; if absent, say so):**
  1. **What changed** — the feature/enhancement in 1–3 sentences (from PRD TL;DR + the `git diff --stat` footprint).
  2. **What was tested** — which types of validation were completed (unit / integration / E2E / manual / visual), from Phase 13 + Phase 15.
  3. **Test command results** — did automated tests pass? Cite the Phase 15 green report and `ci.read` evidence; list failures honestly.
  4. **Browser & manual checks** — what was verified in the browser through the Phase 9 local smoke and Phase 13 browser-QA evidence.
  5. **Screenshots** — attach or describe key screenshots (paths under `runtime/`); write "none captured" if absent.
  6. **Known limitations** — what is not yet complete or not yet tested (open questions, deferred `reviews/code-review.md` findings, skipped phases).
  7. **Remaining risks** — what could still go wrong (ERD risks, reviewer findings, guardrail/counter-metrics at risk, any recorded failing seam).
  8. **Reviewer notes** — anything reviewers should pay special attention to (riskiest seams, conditional approvals, areas with thin coverage).
  9. **Ready status** — **Yes** / **No** / **Yes with conditions** (+ the conditions), grounded in Phase 11 review, Phase 14 documentation, and Phase 15 setup-audit evidence when available.
- **Draft, don't auto-send**: write the provider-neutral message to `slack-handoff.md` to preserve the existing artifact contract, and render it in chat ready to paste. Sending is outward-facing and may use `messaging.send` only after explicit confirmation and exact destination resolution. Record the outcome in `handoff.message_posted`.
- **Reviewer pack**: a single `reviewer-pack.md` index with every collected document and link grouped by Product, Plan and Design, Code and Review, Test and QA, and Runtime and Release.
- Before finalizing, validate `run-events.jsonl`; report degraded or missing workflow-trace evidence explicitly rather than implying a complete harness run.
- **Output**:
  - `.agents/features/<slug>/handoff/slack-handoff.md` (the compatibility filename for the provider-neutral 9-field draft)
  - `.agents/features/<slug>/handoff/reviewer-pack.md` (the document + link manifest)
  - `state.json` gains a `handoff` block (see State Persistence)
  - phase summary prints the ready-to-paste message **first**, then the reviewer pack index

## Additional phase requirements

- The handoff states what was **verified with what evidence**, separately from what was implemented. A reviewer needs to know which claims are TESTED and which are INFERRED.
- Record decisions whose rationale is not recoverable from the diff — especially rejected alternatives and their costs.
