# Phase 20: Deployment

> Load this file only when this phase is selected or resumed.

- **Skills**: `release-deployment`, `production-readiness`, plus `observability-by-design` and conditional `ai-product-engineering` for release monitoring
- **Capabilities**: resolve `deployment.inspect`, `deployment.execute`, `deployment.rollback`, and `observability.read`. Production execution requires explicit user authorization for the exact target and stage.
- **Parallel agents**:
  - `release-engineer` — orchestration and rollback plan
  - `platform-engineer` — repository-native deploy mechanics and infrastructure changes triggered by the release
  - `ci-automation-engineer` — CI pipeline execution and rollback automation
  - `site-reliability-engineer` — read-only post-deploy health watch across dashboards, alerts, errors, and latency
- **Output**: `.agents/features/<slug>/release/deployment.md` containing the production deploy log, release notes, monitoring dashboard link, and rollback plan.

## Additional phase requirements

- **Compute review staleness:** `git rev-list --count <sha-reviewed>..<current-head>`. **0** → current; **1–3** → stale, name the unreviewed commits; **4+** → the review is INVALID for merge, re-review before proceeding.
- Diff the PR body against the actual commits. A description that claims work not present, or omits a whole surface, is a named readiness warning.
- Separate **BLOCKER** from **WARNING** — never emit one undifferentiated readiness list.
- **Post-deploy watch: alert on deltas, not absolutes.** Capture a pre-deploy baseline (console, load time, key requests) and compare; an error that existed before the deploy is not this deploy's signal.
- Verify feature-specific product logs, metrics, distributed traces/correlation, privacy redaction, dashboards, and alerts against the approved contract. For AI, also watch quality proxies, safety/fallback rates, model/provider/version drift, latency, and cost budgets; execute the approved rollback when a critical threshold fails.
- **Debounce: only alert after 2+ consecutive failing checks.** Single-sample alerts on a fresh deploy are mostly transients.
- For any staged rollout or traffic/security rule: advance **log-only → preview → production**, with an explicit gate between stages. **Never publish the production stage on the author's behalf** — prepare it, then ask.
