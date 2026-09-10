# Phase 12: Review + Legal

> Load this file only when this phase is selected or resumed.

- **Skills**: `pre-merge-review`, `general-coding-standards`, `security-review`, `multi-model-debate-room`, `stochastic-multi-agent-consensus`; add `library-first-engineering`, `observability-by-design`, and conditional `ai-product-engineering` to the applicable review scope
- **Ordering**: run `pre-merge-review` first. Apply only its authorized mechanical corrections, freeze the resulting revision, then run the canonical reviewer wave against that exact post-review diff. Do not run both reviews independently against different revisions and merge their findings as if comparable.
- **Parallel agents — core reviewer wave** (single batch; add conditional security agents from **Agent & Skill Routing** only when ERD/diff triggers — do not launch all security auditors by default):
  - `code-reviewer` — generic cross-language
  - `legal-risk-reviewer` — license/IP/PII/regulatory risk triage
  - **Plus** language-specific reviewer detected from diff: pick from `typescript-reviewer`, `python-reviewer`, `go-reviewer`, `rust-reviewer`, `java-reviewer`, `kotlin-reviewer`, `cpp-reviewer`, `flutter-reviewer`
  - `database-reviewer` — only if SQL/schema changes detected
  - **Conditional security lane** (pick applicable): `security-reviewer`, scoped to the triggered focus (access-control / api / privacy / ai-mcp / infra) — run a single coordinated pass when ≥2 lanes apply
- **Staff-discipline audit (mandatory synthesis checks before verdict):**
  - **Module map compliance**: a touched file carrying a responsibility the approved map did not give it → HIGH (block until the map is updated or the file is split).
  - **Reuse gate**: new composable/component without logged reuse decision → MEDIUM.
  - **Polish checklist**: missing `aria-label` on icon-only buttons, hex colors outside tokens, config hacks without "CI builds identically" note, errors logged via `console.log` → MEDIUM each.
  - **Compression**: Phase 11 skipped/waived on a code feature → note in `reviews/code-review.md`; flag if diff still looks bloated vs `compression.md` expectations.
  - **Library-first**: custom implementation with an unexamined repository, standard-library, or installed-dependency alternative → MEDIUM; unapproved dependency → HIGH.
  - **Product observability**: runtime boundary without approved logs/metrics/traces/correlation/privacy/failure signals, or sensitive payloads in telemetry → HIGH.
  - **Harness trace integrity**: invalid, missing, or silently rewritten `run-events.jsonl` → workflow finding; never confuse it with product telemetry.
  - **Conditional AI**: missing versioned contracts, deterministic controls, eval plan, safety/authorization boundary, fallback, or cost/latency limits → HIGH and route to `ai-evaluation-engineer` in Phase 14.
- **Escalation (deliberation) during synthesis:**
  - If reviewers return **conflicting severities on the same finding** (e.g. security says CRITICAL, performance says LOW; or legal flags PII that reliability considers non-blocking), load `multi-model-debate-room` scoped to that single finding: 3–5 rounds with the disagreeing reviewers' personas. Record the resolved verdict in `reviews/code-review.md`.
  - If the reviewer wave produces several borderline-severity findings and the user wants a triage ranking, load `stochastic-multi-agent-consensus` to rank them by merge-blocker likelihood.
- **Output**: `.agents/features/<slug>/reviews/code-review.md` with severity-sorted findings, evidence, and verdict.
