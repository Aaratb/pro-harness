# Phase 9 — Readiness Synthesis

## Goal

Convert authenticated evidence into a transparent scorecard, honest production risks, and one defensible verdict.

## Load

- `check-merge-readiness`
- `production-readiness`
- `score-change-risk`
- `review-production-challenge`

## Procedure

1. Freeze the reviewed repository, base, head, diff digest, findings context digest, evidence caps, and completed lanes.
2. Generate exactly five ranked Production Risk slots. Populated slots bind authenticated finding IDs and statuses; unused slots use `NO_ADDITIONAL_EVIDENCE_BACKED_RISK`, null finding ID, zero confidence, and honest N/A fields.
3. Synthesize existing authenticated reuse, naming, edge-case, failure-story, performance and 10x, security, observability, hygiene, testing, runtime, README, deployment, rollback, and recovery results. Do not recollect unchanged evidence just to render the synthesis. In fast mode keep the bounded verdict inputs in `CODE_REVIEW.md` rather than generating separate scorecard, PM, and readiness reports.
4. Verify the README against source and configuration for applicable purpose, users, workflows, stack, architecture, dependencies, setup, tests, build, deploy, observability, scale limits, failure recovery, security/privacy/tenancy, migrations, rollback, ownership, and runbooks. Do not repair it.
5. Apply evidence caps and produce exactly one verdict: `SAFE_TO_MERGE`, `SAFE_WITH_CONDITIONS`, `BLOCKED`, or `REVIEW_INCOMPLETE`.
6. `--fast`, `working-tree`, `initial-working-tree` and `local-directory` cannot emit `SAFE_TO_MERGE`. Local review may complete without remote/PR/CI evidence, with `SAFE_WITH_CONDITIONS` at best and unperformed release checks stated explicitly. Missing required CI for a release verdict, unresolved CRITICAL/HIGH, stale source, or incomplete required lane cannot be averaged away.

Lead with the release decision and the most consequential supporting evidence. Rank risks by demonstrated exposure and impact, reversibility, and evidence confidence—not by number of reviewers or matrix rows. Explain which user outcome or operational promise is affected, the trigger, and what would change the verdict. Separate confirmed defects, evidence gaps, accepted conditions, and non-blocking preferences; uncertainty is not a confirmed defect or a pass.

Each condition has an owner, required proof or acceptance, and a point before merge/release when it must be resolved. Retain governing hard blockers; do not trade them away through a score. Show significant refutations and remaining blind spots concisely. Existing functionality that remains sound is useful evidence of scope coverage, not a demand for praise or another report.

## Gate

Pass when every verdict input is traceable to authenticated evidence, the five risk slots validate, and limitations are explicit.
