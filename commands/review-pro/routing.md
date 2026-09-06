# Review Pro routing

Resolve the exact capability, then load only its phase, skills, canonical agent definitions, and MCP contracts. All lanes inherit the source-read-only command boundary and the same `artifact_root`.

## Deliver methods, not role labels

Before dispatch, load the canonical definition and relevant skills selected by this Review phase or focus, including method bindings absent from the agent's own list. Supply their current instructions, reviewed revision, bounded source/evidence, assigned question, effective capability profile, artifact root, and return contract. Reuse unchanged loaded instructions; a generated adapter or role name alone is not evidence that current methods were delivered.

Review Pro owns this invocation. Do not import another command's governance, state machine, certification, consent workflow, or output schema merely because a shared specialist binds that skill. For roles requiring `lane_contract` and `evidence_manifest`, supply the existing Review lane schema and authenticated Review evidence references as inputs, not Architecture artifacts. Select applicable discipline methods and detected compatible overlays; do not load every bound skill or the entire catalog.

If a named adapter is unavailable, a fresh general agent may receive the same canonical Review contract under the same or stricter effective profile. Use available host controls, distinguish host-enforced from instruction-only restrictions, and never describe a prompt as a sandbox. Missing native per-agent filtering alone is not a new gate; prohibited source writes, unauthorized execution, and external actions remain prohibited. Missing required isolation, capability, or independence stays blocked or evidence-capped, never silently substituted with self-review.

Record actual dispatch identity, canonical role, delivered skill paths/digests, evidence revision, effective restrictions, and returned evidence in the existing `CODE_REVIEW.md` review notes. Do not add fields to the closed state, lane-report, evidence, or finding schemas. Keep lane `agent` and `profile` canonical as policy requires; the actual runtime identity belongs in the notes, not a fabricated agent name. These records support inspection of what happened, not automatic proof of judgment or sandbox enforcement.

## Capability map

| `--capability` | Phase | Skills | Primary agents | Output |
|---|---:|---|---|---|
| `resume` | 1 | `review-core` | `repository-explorer` | freshness decision |
| `intake` | 2 | `review-evidence-integrity`, `review-pull-request` | `repository-explorer` | authenticated change manifest |
| `scope` | 3 | `score-change-risk` | `repository-explorer` | affected-surface and lane plan |
| `grounding` | 4 | `workspace-codemap-context`, `general-coding-standards` | `repository-explorer` | minimal context packet |
| `code` | 5 | `pre-merge-review`, `review-production-challenge` | `code-reviewer`, detected language reviewer | code findings |
| `architecture` | 5 | `pre-merge-review` | `architecture-conformance-reviewer` | conformance findings |
| `data` | 5 | `pre-merge-review`; triggered data-evolution/query methods below | `database-reviewer` | data findings |
| `legal` | 5 | `pre-merge-review` | `legal-risk-reviewer` | dependency and legal-risk triage |
| `security` | 6 | `security-review`, `review-production-challenge`; triggered authority/AI methods below | `security-reviewer` | consolidated security findings |
| `resilience` | 6 | `review-production-challenge` | `resilience-analyst` | failure-story evidence |
| `performance` | 6 | `score-change-risk`, `review-production-challenge`; triggered performance/capacity methods below | `performance-architect`, `capacity-planner` | static and measured performance ledger |
| `operability` | 6 | `production-readiness`, `observability-by-design` | `operability-reviewer` | operator-readiness findings |
| `tests` | 7 | `repository-health` | `code-reviewer` | existing-test evidence |
| `runtime` | 7 | `review-production-challenge`, `observability-by-design` | `repository-explorer` | bounded runtime evidence |
| `verify` | 8 | `review-evidence-integrity`, `verification-before-completion` | fresh `code-reviewer` or `repository-explorer` invocation | authenticated finding decisions |
| `readiness` | 9 | `check-merge-readiness`, `production-readiness` | `code-reviewer` | verdict and scorecard |
| `handoff` | 10 | `review-handoff` | `code-reviewer` | validated Debug Pro packets |
| `comment` | 10 | `review-handoff` | none | one validated idempotent comment |
| `reverify` | 2, 7-10 | `review-handoff`, `review-evidence-integrity` | fresh routed reviewers | validated origin-aware intake and independent resolution result |

Unknown names stop with the valid-name list. Missing prerequisites are reported; they are not reconstructed from conversation.

## Agent rules

- Perform routine intake, scope mapping, and context grounding inline using the canonical role's methods; the agent lists identify eligible responsibility, not mandatory fan-out. Delegate only distinct questions with useful parallel work. Preserve the core review lane and fresh independent verification of material candidates.
- Use only canonical agent names. Runtime aliases and historical names are invalid.
- Stack or datastore specialists require repository evidence before routing.
- `security-reviewer` is the only security coordinator. It receives focused API, identity/secrets, privacy/data-transfer, AI/tool, or infrastructure packets only when triggered.
- Do not use a write-capable build, test-authoring, refactor, or benchmark agent against the reviewed checkout. Static performance uses `performance-architect` and `capacity-planner`; authorized measurement uses existing commands or capabilities in an isolated environment.
- Independent verification uses a fresh invocation and a blinded packet containing the claim and evidence references, not the prior severity or conclusion.
- Each lane returns schema-valid evidence or an explicit blocker. A permitted artifact-writing lane may write only its assigned file beneath `artifact_root/lanes/`; static lanes return their report to the orchestrator for persistence. The artifact enclave never overrides a stricter agent profile.

## Reuse deeper methods on material changes

Phase 5 data review uses `architecture-data-model-evolution` for changed invariants or migrations and `architecture-query-performance` for changed material access paths. Phase 6 security uses `architecture-security-review` for authority-to-effect reasoning, while performance and capacity reuse `architecture-system-performance` and `architecture-capacity-and-tuning` for affected workloads and shared ceilings. Existing resilience and operability methods remain available through their selected roles. Reuse their reasoning, not their workflow machinery.

AI changes use `ai-product-engineering` for applicable evaluation and trust-boundary methods in Phases 6–7. This does not authorize implementation, dataset creation, provider calls, or release. Ordinary unit success is not AI-quality proof. Browser evidence stays within approved non-mutating inspect/capture capabilities; do not activate write-capable browser journeys merely to gain a richer testing checklist.

## Capability rules

- `scm.pull-request.read` may collect PR metadata, diff, checks, and comments. `scm.pull-request.write` is restricted to one validated comment and requires `--comment` plus explicit outward-action authorization.
- `browser.inspect` and `browser.capture` require an approved non-production target and must not mutate data.
- `observability.read` requires approved access, a bounded query, and redaction before persistence.
- `firecrawl.search` and `firecrawl.scrape` may confirm current public vendor documentation after network consent; repository behavior still requires local evidence.
- Mutation and load tools are unavailable unless their exact flags are present and the environment is isolated and approved.

No missing agent, skill, or provider widens authority. Mark the lane blocked or evidence-capped.
