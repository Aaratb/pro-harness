# Explainer Pro routing

Read this file once when invocation scope is clear. Route by exact capability name, then load only the selected phase skill and the references it names.

## Capability map

| `--capability` | Phase | Required skill | Persisted prerequisites | Primary output |
|---|---:|---|---|---|
| `repo-map` | 2 | `explainer-orientation` | intake dependency substrate | repository atlas |
| `reading-plan` | 2 | `explainer-orientation` | repo map and dependency order | guided reading plan |
| `architecture` | 3 | `explainer-architecture` | repository atlas | architecture brief and diagrams |
| `feature-map` | 4 | `explainer-feature-tracing` | repository atlas and architecture brief | feature outcome atlas |
| `trace-feature` | 4 | `explainer-feature-tracing` | selected feature and entry point | customer-to-code trace |
| `business-logic` | 4 | `explainer-feature-tracing` | feature trace | rule ownership map |
| `explain-file` | 4 | `explainer-feature-tracing` | target file and surrounding trace | file walkthrough |
| `explain-function` | 4 | `explainer-feature-tracing` | target symbol and surrounding trace | code-execution walkthrough |
| `sequence` | 4 | `explainer-feature-tracing` | gated trace hops and exits | bounded path sequences |
| `dependency-graph` | 5 | `explainer-system-views` | intake dependency substrate | dependency and reverse-dependency view |
| `data-model` | 5 | `explainer-system-views` | scoped schemas and writers | entity, relationship, and state views |
| `sync-async` | 5 | `explainer-system-views` | selected trace | blocking and deferred execution view |
| `libraries` | 6 | `explainer-reference` | manifests, call sites, tests | library guide |
| `conventions` | 6 | `explainer-reference` | repeated source and test evidence | conventions guide |
| `glossary` | 6 | `explainer-reference` | living registry from prior phases | final glossary |
| `quiz` | 7 | `explainer-comprehension` | final gated claim pool | comprehension gate |
| `codemap` | 8 | `workspace-codemap-context` | current claims and coverage record | partial codemap evidence bundle |
| `change` | 4 | `change-explanation` | safe change intake and surrounding context | focused change explanation |

Unknown capability names stop with the valid-name list. A standalone capability requires persisted prerequisites. Within one phase batch, a dependency may instead be an explicitly named, independently gated staged section in that batch. Never reconstruct missing prerequisites from chat; report the missing artifact and safe phase to run.

## Agent routing

- Use `repository-explorer` for source mapping, dependency evidence, history inspection, test evidence, and fresh re-grounding. Authoring and verification must use separate invocations and separate lane files.
- Use `system-architect` only when the architecture label remains ambiguous after repository exploration. Scope it to reconstruction and explanation; do not request recommendations or grading.
- Use `data-model-architect` only when the target has a material persistent model and the ordinary repository pass cannot resolve relationships or transition writers. Supply a reconstruction-only lane contract and prohibit migration or design advice.
- The learning-path, teaching, research, and practice responsibilities belong to the workflow and skills. Do not create four agent personas for them.

### Deliver current methods under Explainer authority

Read the selected canonical definition and relevant current Explainer skills/references under `HARNESS_ROOT`. Supply their content or explicit paths the delegate must read before work, plus the learner's question, audience, running example, source fingerprint, claim scope and exact `artifact_root`. A registered role name alone is not method delivery. If a named adapter is unavailable, use a fresh general agent with those methods under the same or stricter capability profile. Apply available host controls and distinguish host-enforced restrictions from instruction-only restrictions. Missing native per-agent filtering alone is not a blanket gate; missing isolation required by the approved scope blocks that assignment.

Do not import another workflow's governance, planning, audit, certification or output requirements. `system-architect` reconstructs and explains using `explainer-architecture`, not an engineering-plan review. For `data-model-architect`, supply `lane_contract` as the bounded reconstruction question, read-only constraints, expected lane return and stop condition; supply `evidence_manifest` as the current fingerprint and relevant schema/writer/claim references. Use `explainer-system-views` methods; do not initiate Architecture governance, migration design or a consistency audit. These are inputs to the existing lane, not new artifact families.

Author and verifier are actual separate invocations, not two role labels in one response. Record actual runtime identity, canonical role, delivered method paths/digests, source fingerprint, checked claim IDs, counterexamples and disposition in the existing lane's `narrative_notes`. Do not add fields to closed claim, section or state schemas or manufacture verification timestamps. Missing independent source verification remains a gap; self-critique cannot set the independent flag.

A static specialist must return content to the coordinator, which persists the assigned lane file. Other agents may write only their assigned staging files when their profile and runtime permit; the artifact enclave does not override a stricter profile. No delegate publishes, runs the target, grades the repository or proposes fixes. Reuse unchanged verified evidence under the existing grounding contract rather than adding a second reviewer merely to increase agent count.

## Capability routing

- `diagram.render` accepts only sanitized diagram source and an output beneath `artifact_root`. If absent, preserve labeled diagram source and mark rendering degraded.
- `browser.inspect` and `browser.capture` validate the generated local course, never the target application. Browser availability does not authorize target execution.
- `scm.pull-request.read` is used only for an explicitly selected pull request or remote ref. Local Git evidence uses the safe Node intake helper. Network access requires consent.
- `firecrawl.search` and `firecrawl.scrape` may confirm current vendor behavior after consent. Repository usage still requires local call-site evidence. If documentation is unavailable, keep the behavior `INFERRED`.

## Phase and capability execution

For each meaningful phase delivery or explicitly requested capability checkpoint:

1. Check the source fingerprint, requested scope, and prerequisite closure once for the bounded batch. Load unchanged sections and typed claims from the current immutable generation rather than reauthoring them.
2. Use one authoring lane beneath `work/lanes/` for related work, retaining typed section ownership and claims. A dependent section starts only after its upstream evidence is gated; order dependent work, never parallelize it.
3. Use a separate fresh verification invocation for new, changed, and materially dependent claims. The verifier rereads source, checks counterexamples, and returns its own lane file; one invocation may verify several independent sections. Preserve unchanged verification only under the grounding contract's fingerprint, claim, and dependency checks.
4. Demote or quarantine failed claims. Replacing an upstream capability invalidates every transitive dependent unless that dependent is freshly grounded and included in the same batch.
5. Call `explainer-course.mjs publish --batch work/<checkpoint>.json` once. The bounded JSON array contains `{ "section": "work/<name>.json", "claims": "work/<name>-claims.json" }` pairs; all paths remain beneath `artifact_root`. Supply `--repo-root`, `--artifact-root`, and optional `--registry` as usual. The existing `--section` plus `--claims` interface remains valid for one capability.
6. Record redacted events at real boundaries and run the phase-transition hook once after publication. It already validates run state and the course; no duplicate manual validators. The completion hook replaces, rather than duplicates, the transition hook at terminal delivery.

Only the coordinator publishes; artifact-authorized agents return staged files, while static specialists return content for coordinator persistence. Independent units may run concurrently only when the contract declares no dependency between them. Concurrency is an optimization, not a requirement. Do not add an approval pause merely to publish an already authorized phase.

## Read-only and handoff boundaries

Explainer Pro describes existing behavior. It does not execute the target, assess quality, prescribe fixes, or write codemaps. A contradiction discovered during ordinary explanation is recorded as a severity-free suspected logic risk and handed to the appropriate review workflow. Implementation and runtime diagnosis remain separate workflows.
