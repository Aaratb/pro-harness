# Architecture Pro Routing

Resolve routes from `contract.json` and `config/architecture-pro.json`. Use canonical agent and skill names only. Every agent launch receives `task`, `artifact_root`, `lane_contract`, and `evidence_manifest`; apply the effective `static-analysis-read-only` profile even when the reusable agent has a broader default profile.

## Collaborative architecture

Show a provisional view at consequential uncertainty: recommendation, strongest objection, one shared decision, then revision. Mark proposals unapproved; invite user alternatives. Challenge conflicting preferences respectfully with consequences, not pressure or an agent vote.

For unresolved user-owned trades, load `grill-with-docs`. Use its permitted native question selector with free-text alternatives, or open discovery. Ask one outcome-focused question, not a stack quiz; recommend without outsourcing design. Reuse settled answers. A default, preselected answer or silence is not approval. Pending answers hold dependent commitments, not independent authorized analysis; async tool return is not an answer.

Show what the answer changed, its consequence and remaining uncertainty. Keep rationale, dissent and reopen conditions in existing decision packets and history, not transcripts. Reconcile affected views and contracts, refresh digests and recheck changed premises through legal returns; retain unchanged work. Clarification need not reopen a decision, but material changes cannot evade the reopening cap or approvals. User intent sets requirements; claims about current behavior need verification—agreement is not evidence.

No new gates, schemas or question quotas. Settled or delegated reversible details proceed with explicit defaults. `--yolo` cannot supply human approval or settle user-owned trades. `--fast` remains triage. ADR-only collaboration stays scoped to its decision; AUDIT addresses context, consequences and priorities, not unrequested redesign; MIXED retains certified audit evidence. Honor deeper discussion within authority and budgets; exhaustion calls for rescoping, not invented agreement or certification.

## Deliver methods before dispatch

Load the canonical definition and relevant skills for each selected lane, including skills assigned by the current phase or focus even when the agent's own list is empty. Supply their instructions, the effective profile, approved roots, bounded evidence, and the decision or claim to test to the actual agent. Do not rely on a role name or stale generated adapter to supply expertise. Load applicable references and evidence-detected compatible overlays only for that task; do not preload the catalog or all skills bound to a reusable role.

Record actual runtime identity, canonical role, delivered skill paths and digests, effective permissions, evidence revision, and report reference in existing `state.lane_runs`. Reuse loaded unchanged instructions without rereading them at every phase; changed sources require refreshed delivery. This metadata records delivery, not proof that a model exercised good judgment.

If a named adapter is unavailable, a fresh general agent may receive this same canonical contract under the same or stricter effective capability profile. Apply available host permission controls and record which restrictions are host-enforced versus instruction-only. Prompt instructions alone are not a technical sandbox; never claim otherwise. Missing native per-agent tool filtering is not by itself a new workflow gate, but it never authorizes execution, writes, or external access prohibited by the static contract. If the approved task requires host-enforced isolation that is unavailable, or the substitute cannot honor the contract or independence, record the lane blocked. Do not silently substitute self-review or downgrade a mandatory lane. The orchestrator alone persists reports beneath `artifact_root`; a skill's generic write language never grants a static lane write permission.

## Core ownership

| Responsibility | Canonical agent | Route |
|---|---|---|
| Design owner and option author | `system-architect` | Design phases; simplicity, scale, and evolvability lenses with fresh independent challenge |
| Boundary and decision conformance | `architecture-conformance-reviewer` | Every certifiable run |
| Minimal threat and transfer map | `security-reviewer` | Every certifiable run |
| Data model and evolution | `data-model-architect` | Material persisted or event data |
| End-to-end performance | `performance-architect` | Material latency, throughput, or cost target |
| Query and access-path performance | `query-performance-architect` | Datastore on a material path |
| Diagnostic quality | `system-diagnostics-analyst` | Multiple components, async work, or reliability targets |
| Operational readiness | `operability-reviewer` | Deployed or operated system |
| Failure and recovery behavior | `resilience-analyst` | Dependencies, concurrency, overload, or recovery |
| Capacity and scaling | `capacity-planner` | Capacity question or 10x/100x target |
| Implementation slicing | `implementation-planner` | Certified handoff assembly |
| License and policy risk triage | `legal-risk-reviewer` | A selected design introduces an external dependency or regulated obligation |

The design owner covers simplicity-first, scale-first, and evolvability-first lenses. Every design path requires a fresh independent challenger distinct from all option authors, given the question, constraints, scope, and canonical evidence without the author's preferred conclusion. The challenger independently tests all three lenses, exclusions, and assumptions before synthesis. This author/challenger pair suffices for focused decisions; dispatch separate no-cross-talk lens authors for materially different trade-offs, high-impact uncertainty, or unresolved disagreement. Preserve dissent and rebuttal. Missing independent challenge blocks selection; no design is self-certified. Phase 7 governs credible option counts and Phase 8 verifies the actual narrowed-set evidence and challenger report, not mere field presence.

Use critique → author response → synthesis by default; expand only decision-changing uncertainty, unresolved material disagreement, or requested depth. Give the challenger the actual candidate shapes and relevant contracts as well as the evidence, without persuasive scoring or the preferred winner. Each objection identifies a premise, counterexample, consequence, and possible design change or next proof. The author answers with evidence or revises the design. Tell the user the strongest objection, what changed in the recommendation, and any dissent; do not paste transcripts or force consensus. Reuse unchanged challenge evidence; changed decision-sensitive premises need fresh targeted challenge. Apply actual identity and digest checks below to all design option sets, not only narrowed ones.

## Evidence-triggered depth

Load only the current phase's selected dependencies. Route-list membership is eligibility, not mandatory launch; optional skills become mandatory on material triggers defined in the phase and ownership table. Materiality means the concern could change this decision, an affected invariant, or a claimed target within the approved scope—not merely that the repository contains a database or a deployment. Uncertain materiality stays unverified or blocked, not conveniently immaterial. Preserve conformance and minimal security for every certifiable run. Reuse unchanged verified outputs and loaded skills; do not redispatch solely because a lane name recurs. Freshness-sensitive verification, independent challenge, changed evidence, and certification retain their prescribed checks.

## Consolidated security routing

Run one `security-reviewer` owner with `architecture-security-review`. Always produce the minimal map, then add only evidence-triggered focus packets:

| Focus | Triggers |
|---|---|
| `api-and-authorization` | Authentication, authorization, public API, webhook |
| `secrets-and-machine-identity` | Secrets, service identity, infrastructure, delivery pipeline |
| `privacy-and-data-transfer` | Tenancy, personal or payment data, external transfer |
| `ai-and-tool-boundaries` | Models, prompts, retrieval, agents, memory, tools, or MCP |
| `infrastructure-and-delivery` | Infrastructure, runtime exposure, containers, or CI/CD |

One root cause produces one finding with linked focus impacts. Do not launch duplicate wrapper agents for each focus. If a mandatory focus lacks evidence, record it as blocked and cap the security outcome rather than marking it not applicable.

## Specialist overlays

Use existing evidence-gated overlays only after detection:

- PostgreSQL, MongoDB, or ClickHouse overlays for applicable data and performance agents.
- AI-product overlay for compatible design and security agents when AI behavior is material.
- Kubernetes overlay for compatible security and operational routes when Kubernetes evidence exists.

An overlay adds methodology only. It cannot widen authority, roots, external access, or the lane capability profile.

## Lane return contract

Every lane returns a schema-valid `architecture-pro/lane-report@1` packet containing lane, phase, status, scope, typed claims, evidence references, findings, fitness or measurement specifications, blockers, handoff notes, and separate outcome recommendations. The orchestrator validates and persists the packet; lane agents do not write files.

Resolve `option_scope.independent_review.lane_report_id` through the corresponding entry in existing `state.lane_runs` to the actual report artifact beneath `artifact_root`; verify its bytes against `state.artifact_digests`. Record the actual runtime dispatch identity and its evidence reference in that lane entry, then match `challenger_instance_id` against it and compare it with the option authors' recorded dispatch identities. These are orchestrator-owned lane-state metadata, not fields to add to the lane-report packet. Invented identifiers or an asserted fresh role do not establish independence; unavailable dispatch evidence blocks narrowed selection.

Phase 4 uses a fresh capability-equivalent instance with a distinct instance identifier. Give it the claim, scope, and canonical evidence only. Preserve `CONFIRMED`, `REFUTED`, `DISPUTED`, and `UNVERIFIED` outcomes and dissent.

## Capabilities and consent

- Bounded local rendering uses ordinary artifact authority: the orchestrator reuses the existing companion helper beneath `artifact_root`, with no network, installation, or target-code execution. Static lanes return diagram content; they do not gain write or execution permissions. Load `architecture-explanation-diagrams` at Phases 2, 7, 9, and 12 and reuse unchanged views.
- `diagram.render` remains optional external rendering and requires the existing manifest and consent path before transferring content. Its absence does not prevent local rendering. An unavailable or failed local render leaves the visual deliverable explicitly incomplete, not silently satisfied by source text; preserve usable architecture evidence and report inspection limits.
- Primary-document lookup resolves through the registered search and scrape capabilities and requires a bounded documentation manifest.
- Live probes resolve only from the operator-controlled registry and require a plan digest followed by explicit execution consent.

Missing optional capability lowers evidence confidence. It never weakens a hard gate or silently selects an unregistered provider.
