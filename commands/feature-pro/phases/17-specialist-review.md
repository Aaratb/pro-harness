# Phase 17: Platform Specialists

> Load this file only when this phase is selected or resumed.

- **Skills**: `pre-merge-review`, `security-review`, `multi-model-debate-room`, `stochastic-multi-agent-consensus`; add `observability-by-design` and conditional `ai-product-engineering` when triggered
- **Parallel agents — scoped by diff** (reviewers only — no code-writer/engineer agents in this phase):
  - Frontend layer touched -> `i18n-reviewer`, `code-reviewer`, `accessibility-reviewer`, and `security-reviewer` when UI handles auth or sensitive data
  - Backend layer touched -> `code-reviewer` plus conditional `security-reviewer` scoped to access control, APIs, and tenant isolation
  - Data layer touched -> `database-reviewer`
  - Infra/CI touched -> `ci-automation-engineer` in read-only review mode plus `security-reviewer` when IaC or CI changed
  - Tests touched -> `unit-test-engineer`, `api-test-engineer`, or `visual-tester` in verification-only mode according to the changed tests
  - AI product active -> `ai-evaluation-engineer` in verification-only mode for dataset/scorer integrity, critical-slice thresholds, safety, fallback, cost, latency, drift monitoring, and rollback readiness
  - Product observability changed -> include its evidence in the appropriate reliability/security review rather than inventing a stack-specific role
- **Escalation (deliberation):**
  - On squad-vs-squad disagreement (e.g. frontend says ship, data engineer says block on migration), load `multi-model-debate-room` with the disagreeing squad personas to produce a single verdict in `reviews/platform-review.md`.
  - Use `stochastic-multi-agent-consensus` to rank cross-squad follow-up tickets by priority when the review wave produces many.
- **Output**: `.agents/features/<slug>/reviews/platform-review.md` with the consolidated specialist verdict.
