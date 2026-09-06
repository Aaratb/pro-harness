# Debug Pro routing

Load the current phase from `contract.json`, then only the needed skills and references. `--capability` selects a named route; it does not waive earlier proof. Unknown phase/capability names stop with valid choices.

| Capability | Phase | Primary guidance | Output |
|---|---:|---|---|
| `resume` | 1 | `debug-core` | freshness and next gate |
| `intake` | 2 | `debug-core` | exact symptom and trusted baseline |
| `observe` | 3 | evidence reference | relevant observations |
| `evidence` | 4 | evidence reference | admissible signature and recipe |
| `gaps` | 5 | `observability-by-design` | missing signals and restore action |
| `reproduce` | 6 | `systematic-debugging`, causal reference | exact feedback loop |
| `trace` | 7 | `systematic-debugging`, causal reference | origin trace and live rivals |
| `instrument` | 8 | `observability-by-design`, causal reference | authorized discriminating probe |
| `experiment` | 9 | causal reference | measured hypothesis decisions |
| `confirm` | 10 | `verification-before-completion`, causal reference | supported cause or blocker |
| `plan` | 11 | `implementation-planning`, repair reference | scoped eligible repair |
| `red` | 11 | `test-driven-development`, repair reference | matching pre-correction failure |
| `repair` | 12 | `library-first-engineering`, repair reference | minimal origin correction |
| `verify` | 12 | `verification-before-completion`, repair reference | GREEN and broader evidence |
| `report` | 13 | `debug-core`, repair reference when applicable | honest terminal report |
| `handoff` | 13 | repair reference | validated resolution recommendation |

References are under `skills/debug-core/references/`: `evidence.md`, `causal-experiments.md`, and `repair-and-handoff.md`. They are not an additional global preload.

## Optional agents

Reuse canonical agents only when a distinct task benefits from them and delegation is permitted. `repository-explorer` gathers source context; `system-diagnostics-analyst` advises from supplied evidence; neither is an implicit executor. Grant-checked test/build workers may handle reproduction or correction. Use the detected language reviewer or `code-reviewer` to independently inspect the bounded repair, not both by default. `security-reviewer` coordinates triggered security depth; do not create parallel overlapping security coordinators.

Prefer orchestrator execution of the smallest authorized check over spawning agents for ceremony. Every worker receives the same explicit `artifact_root`, assigned file, scope, and stop conditions. Missing capabilities produce an honest gap, never fictitious execution or broader permissions.

### Deliver methods, not just role names

Read the selected canonical definition and relevant current skills under `HARNESS_ROOT`; pass their content or explicitly require the delegate to read the supplied paths before work. Include the exact question, source revision, evidence references, caller authority, allowed paths and stop condition. When a named adapter is unavailable, use a fresh general agent with those methods under the same or stricter capability profile. Apply available host controls and distinguish host-enforced restrictions from instruction-only restrictions; a prompt is not a technical sandbox. Missing native per-agent filtering alone is not a new blanket gate, but missing isolation required by the approved task blocks that assignment.

Do not import another workflow's governance, state machine, certification or output requirements. For `system-diagnostics-analyst`, use its `architecture-diagnostics` method under Debug Core. Supply its required `lane_contract` as the compact Debug assignment (question, read-only scope, expected return, stop conditions) and `evidence_manifest` as the actual source/capture references with relevant fingerprints. These are task inputs recorded in the existing report, not new Architecture artifacts. Other reused methods likewise respect Debug's authority and output envelope; AI guidance does not initiate a feature plan or release workflow.

A static analyst must return content to the orchestrator for persistence, not write artifacts or execute its proposed probe. The orchestrator can run an authorized distinguishing experiment and return the actual result. A fresh challenger is a real invocation distinct from the diagnosis author; an independent repair reviewer is distinct from the implementer. Record actual runtime identity, canonical role, delivered skill paths/digests, source fingerprint, restrictions, objection and resulting disposition in `DEBUG_REPORT.md`. Do not add provenance fields to the closed resolution packet or invent a separate schema. If a required independent review is unavailable, report the missing proof rather than relabeling self-review.

Load `architecture-diagnostics` only for a material cross-boundary localization question in Phases 7/10. For Phase 12's required scoped repair review, supply the existing `pre-merge-review` method to one matching reviewer; this does not start the full Review Pro workflow. Load `ai-product-engineering` only for an affected AI surface in Phases 6/12, using its evaluation or safety references as relevant and retaining Debug's bounded repair contract. No automatic release, data access or provider call follows.

## Optional capabilities

For a scoped code review, select the matching existing `typescript-reviewer`, `python-reviewer`, `java-reviewer`, `kotlin-reviewer`, `go-reviewer`, `rust-reviewer`, `cpp-reviewer`, or `flutter-reviewer`; otherwise use `code-reviewer`. Select only the applicable reviewer, not the entire list. Trigger `security-reviewer` only for a material security boundary.

Use existing `observability.read` for bounded authorized telemetry; `browser.inspect`/`browser.capture` for safe client evidence; `scm.pull-request.read`/`ci.read` for relevant change context; and `firecrawl.search`/`firecrawl.scrape` for current public documentation after network authorization. Fall back to approved repository-native tools when appropriate, recording provenance. No new MCP provider is required.

Browser inspection stops after two consecutive unrecoverable failures. Live, production, replay, package, network, mutation, and data-repair actions retain their own authority boundaries regardless of route.
