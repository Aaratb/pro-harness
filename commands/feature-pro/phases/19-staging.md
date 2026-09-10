# Phase 19: Staging

> Load this file only when this phase is selected or resumed.

- **Skills**: `release-deployment`, `production-readiness`; add `observability-by-design` and conditional `ai-product-engineering` for staging telemetry, evaluation, and rollback rehearsal
- **Capabilities**: resolve `deployment.inspect`, `deployment.execute`, `ci.read`, and `scm.pull-request.read`. Execute only the authorized staging target.
- **Parallel agents**:
  - `release-engineer` — orchestrate the approved staging deploy and capture the live URL
  - `ci-automation-engineer` — CI pipeline wiring, build retries, and log retrieval when the deploy job misbehaves
  - `ci-monitor` — keep an eye on CI checks blocking the staging deploy
- Trigger the staging deploy. For micro-frontend apps, use the **two-step versioned flow**: deploy the remote app, then deploy the host shell with the same version so it points at the versioned `remoteEntry.js`.
- **Output**: `.agents/features/<slug>/release/staging.md` containing the staging URL, build links, smoke-test result, and rollback path.

## Additional phase requirements

- **Compute review staleness:** `git rev-list --count <sha-reviewed>..<current-head>`. **0** → current; **1–3** → stale, name the unreviewed commits; **4+** → the review is INVALID for merge, re-review before proceeding.
- Diff the PR body against the actual commits. A description that claims work not present, or omits a whole surface, is a named readiness warning.
- Separate **BLOCKER** from **WARNING** — never emit one undifferentiated readiness list.
- **Post-deploy watch: alert on deltas, not absolutes.** Capture a pre-deploy baseline (console, load time, key requests) and compare; an error that existed before the deploy is not this deploy's signal.
- **Debounce: only alert after 2+ consecutive failing checks.** Single-sample alerts on a fresh deploy are mostly transients.
- For any staged rollout or traffic/security rule: advance **log-only → preview → production**, with an explicit gate between stages. **Never publish the production stage on the author's behalf** — prepare it, then ask.
