## Agent & Skill Routing

Route conditionally; never launch every agent. Use canonical names; stack/provider specifics belong in adapters.

For Phases 3, 4 (when applicable), 5, and 7, require independent challenge before approval/freeze; Phase 9 requires `ralph-loop` fresh implementer attempts. Other agent lists are inventories; Phase 2 stays inline.

### Bounded independent challenge

A fresh challenger independently critiques the proposal revision before rebuttal; self-review cannot substitute. Parallelize independent assessments. Default: one critique, response, synthesis; expand only unresolved material disagreement. Reuse critique only for unchanged evidence/decisions. Record reviewer, revision, objections, disposition, dissent in the existing artifact; actual agent runs in state. Summarize to the user. Missing agents require explicit user waiver before freeze. Return user-owned trade-offs; never force consensus.

| Layer | Canonical agent(s) |
|---|---|
| Product framing and specification | `product-manager`, `product-owner` |
| Frontend build | `frontend-developer` |
| Backend build | `backend-developer` |
| Data build | `database-engineer` |
| Platform build | `platform-engineer` |
| Architecture and planning | `system-architect`, `implementation-planner` |
| AI evaluation, release quality, and regression | `ai-evaluation-engineer` |

Before dispatch, load the canonical definition and relevant skills, capability profile, and adapter; resolve overlays with `resolve-agent-overlays.mjs --agent <name> --repo "$REPO_ROOT" --context <bounded-feature-description>`. Supply `task`, evidence, and `artifact_root: $FEATURE_ROOT`; reject missing/escaping roots. Tools/MCPs never widen authority. Apply overlays only to compatible agents.

If a named adapter is unavailable, a fresh general agent may receive the canonical definition and relevant skills under the same or stricter enforceable permissions. Record this mapping and actual run. If independence or permission enforcement is unavailable, require the user waiver; never claim a simulated review occurred.

### Cross-cutting capability routes

Every run uses `observability-by-design` for execution events; runtime/API/async/external/sensitive/AI work also uses it for product telemetry. New capabilities use `library-first-engineering`. AI evidence activates `ai-product-engineering` and Phase 14's `ai-evaluation-engineer`.

### Artifact companions (planning phases)

When useful, requested, or repository-required, run `generate-artifact-companion.mjs --artifact-root "$FEATURE_ROOT"`, validate the colocated pair with `validate-artifact-companion.mjs`, and update `state.json` → `artifact_companions`. Repair generated/required gaps before build-ready status; optional absence is not a gap.

Publishing requires user request; never block local progress on it.

### Security review routing (Phases 12 and 17 — conditional, not a blanket blast)

**Default wave (always):** `code-reviewer`, `legal-risk-reviewer`, plus one language-specific reviewer selected from the diff.

**Add only when the diff/ERD triggers:**

| Trigger | Agent |
|---|---|
| Auth, protected routes, access control | `security-reviewer` (auth/RBAC focus) |
| Tenant scoping, queues, workers | `security-reviewer` scoped to tenant isolation |
| PII export, logs, webhooks, third-party transfer | `security-reviewer` (privacy focus) |
| MCP, AI tools, agent runtimes | `security-reviewer` (AI/MCP focus) |
| API surface changes | `security-reviewer` (API focus) |
| Infra/IaC/CI touched | `security-reviewer` (infra focus); `database-reviewer` when data touched |

Use one coordinated security pass alongside code review. `security-reviewer` is the fallback when no specialist lane applies.

### PR & merge gates (Phase 18)

Before declaring stacked PRs clean:

1. Structured inline review when a PR URL exists.
2. Impact / blast-radius / merge-readiness pass on the feature PR URL.
3. Optional single safe stacked fix PR when blocker triage is requested; never mix with feature commits.

### SDET routing (Phases 14 and 16)

| When | Agent / approach |
|---|---|
| Local pre-PR verification (developer machine) | `tdd-coach` + `end-to-end-tester` |
| Generate missing browser/API tests | `end-to-end-tester` |
| Access-control / cross-tenant test matrix | `security-reviewer` + `api-test-engineer` |
| Perf-sensitive feature | `performance-benchmarker` |

## Canonical phase skill routing

Load required and triggered optional skills declared by the current phase file; `contract.json` validates every canonical route without entering runtime context. Historical package or organizational origin has no meaning. Record each run, skip, waiver, or block in `state.json` → `skill_runs[<phase>]` with name, time, reason, and repository-local artifacts.
