# Feature Pro quality-parity audit — partial, blocked

Date: 2026-09-06. This is a maintainer audit, not a production instruction change or release certification.

## Conclusion so far

**Parity is not established.** Both runtimes produced correct, useful answers on the small Outcome case. Customer's small case produced the right central conclusion in both, but the Claude candidate over-expanded the work and introduced unsupported interview-context details. The Codex Roadmap case preserved the human's decision, but its ceremony and claimed independent review need separate scrutiny. Architecture has a confirmed source-level visual-delivery gap, matching the user's new feedback.

The full approved 36-run evaluation is incomplete. Eleven distinct small-case/runtime pairs were started, with thirteen installed-profile attempts retained. Two additional discovery-calibration runs are separate. Five trials reached the end of their predefined follow-up sequence; that does **not** certify full workflow completion. No substantial case has started. Feature's reference workflows have not completed, so a diagnostic pass on another command is not proof of parity with Feature.

Claude's configured model exhausted its usage allocation during the small round. Several live sessions returned HTTP 429 / `rate_limit`, identifying the Fable limit and `org_level_disabled` overage. The reported reset is 2026-09-09 14:00 UTC (19:30 Asia/Kolkata); this is a recorded provider estimate, not a promise. No model switch, credit redemption, overage activation, home configuration change or production correction was made. New batch dispatch was stopped. The last active Codex Review turn reached the declared 15-minute limit during Phase 7; all trial runners have now exited and their results are retained.

## Nine-command × two-runtime scorecard

Statuses apply to the **available evidence**, not all future uses. `Gap` means an observed diagnostic deficiency; `blocked` means infrastructure prevented the required test; `inconclusive` means the required coverage/reference is missing. No cell yet qualifies as overall `supported in tested cases` across both planned sizes.

| Command | Claude | Codex | Evidence and limit |
|---|---|---|---|
| Feature Pro | Blocked | Inconclusive | Claude reference attempts were interrupted by quota; one also encountered evaluator permission limitations. Codex's corrected-profile attempt reached the requirements approval boundary, not a built outcome. Both exposed the routing-verifier mismatch. |
| Architecture Pro | Blocked | Blocked | Claude stopped on quota. Codex's scoped artifact-write approval was rejected; it did not proceed to design. Source inspection confirms source-only visuals are allowed. |
| Review Pro | Blocked | Inconclusive | Claude was not started before quota stop. Codex authenticated an ordinary local working-tree change, identified the seeded tenant-authorization candidate, and reached Phase 7 before the 15-minute turn limit. Final verification and the substantial unborn-repository trial are not established. |
| Debug Pro | Blocked | Inconclusive | Native cases not started; fixtures and structural depth tests are available. |
| Explainer Pro | Blocked | Inconclusive | Native cases, rendered artifact inspection and learner exercise not performed. Current publisher has a real rendered-diagram delivery path; the user's positive feedback is not substituted for a graded synthetic trial. |
| Outcome Pro | Inconclusive | Inconclusive | Small-case diagnostic passes: Claude 8/10, Codex 9/10. Both distinguish built from shipped. Substantial comparative case, native question controls and complete Feature reference remain untested. |
| Customer Backward Pro | Gap | Inconclusive | Small-case diagnostic: Claude 7/10, Codex 10/10; core conclusion correct in both. Claude's source-context fidelity and concise handoff missed criteria. Substantial correction/challenge case unrun. |
| Roadmap Pro | Blocked | Gap | Claude stopped before useful task execution on quota. Codex scored 6/10: it retained the human selection and protected notes, but the small-case independent grade identifies disproportionate workflow and unsupported independent-review completion. No literal critical failure was established. |
| Workspace Codemap Pro | Blocked | Inconclusive | Native generation/refresh unrun. Source confirms `VIEW.html` deliberately presents escaped Mermaid while SVGs remain separate; user-facing visual presentation is a source-level gap to evaluate, not an observed browser failure. |

Scores use the supplied five-criterion 0–2 diagnostic rubric: at least 8/10, no zero, no critical failure. Criteria include interaction and outcome concerns; grades discuss experience separately. Scores are not statistical estimates, provider rankings or proof of equal model capability. Do not average blocked/unrun cells into a quality score.

## Prioritized findings and correction recommendations

### P1 — Architecture's visual delivery does not match its architectural intent

Architecture requests views during context/options/deep design, yet the dedicated diagram method and optional rendering capability are routed to Phase 12; ADR-only ends at Phase 10. The method explicitly accepts Mermaid source and allows existing/proposed distinctions in prose. Current validators do not establish a readable rendered view.

**Recommendation, not implemented:** deliver the relevant rendered view at the existing decision points. Reuse existing local rendering and SVG safety support; do not copy Explainer's course engine or add a new provider. Label **components and relationships** as existing/unchanged, new/proposed, changed, or proposed removal. Separate as-built evidence from design intent and uncertain inference. Use stable identifiers, an explicit non-colour-only legend, and a compact before/after view where clearer than an overlay. Rendered meaning, arrow semantics and legibility need direct inspection, not just valid Mermaid/SVG. See [the source-anchored visual addendum](architecture-visual-findings.md).

This new user expectation is recorded as an addendum, not silently inserted into frozen rubrics after trials began. It does not require every task to produce every UML diagram.

### P1 — Feature routing verifier rejects the supported installed layout

The verifier defaults to historical `~/.agents`, ignores the documented `HARNESS_ROOT`, and requires runtime entries to resolve to the canonical command's exact file. Current supported entries are thin wrappers, so even an explicit correct `AGENTS_HOME` fails. Three read-only reproductions and frozen source anchors confirm this. The actor's occasional prefix-expansion error and the evaluator's initial artifact permission denial are separate contributors.

**Recommendation, not implemented:** align root selection with the advertised binding and test wrapper-to-canonical routing for Claude, Codex and coexisting installations. Do not repair it by repointing the historical harness or adding installation repair to ordinary feature work. See [source findings](source-findings.md).

### P1 — Correct central conclusions can still conceal fidelity/assurance gaps

Customer's Claude small-case candidate correctly rejected validated demand but filled in unsupported question wording/context and treated absent exposure information as certainty. The final requested team note remained overlong. Roadmap's Codex candidate preserved human authority but claimed completed independent challenge without sufficient observable invocation/worker-result evidence in the native export.

**Recommendation, not implemented:** retain source uncertainty literally, compress the user-facing synthesis without removing the evidence distinctions, and tie any independent-review completion claim to an observable separate invocation and returned evidence. Missing events do not prove intentional fabrication or that the runtime never executed a worker; they do prevent this audit from certifying that claim. Do not add worker quotas.

### P2 — Small-task ceremony and opening/phase presentation vary in execution

Outcome's Claude candidate omitted the Phase 1 entry banner while later phases were named; Codex's candidate added repeated nonmaterial caveats to a settled delivery count. Claude Feature showed the opening map but then treated the task description as permission to continue, despite the contract's explicit distinction between describing a task and choosing entry. The source's one-option Architecture route still asks for criteria weights totaling 100, even after recognizing that competitive scoring cannot establish superiority with one viable option.

**Recommendation, not implemented:** keep depth in consequential reasoning and useful challenge; remove repeated receipts and non-decision-changing questions. Test the actual opening wait, explicit selection, status and continuation rather than only matching required instruction phrases. Make one-option reasoning about forcing constraints and consequences; do not require a cosmetic weighted competition.

The small Codex Review turn also consumed its 900-second evaluation window before final verification. That is an observed completion/time-to-value gap in this profile, not a clean speed benchmark: artifact approval, role-instantiation fallback, tracing repair, model latency and actual review work all contributed. Retain the transcript before deciding which steps to simplify; do not discard genuine authorization review or independent verification merely to force a short duration.

### P2 — Codemap's companion does not display its rendered diagrams

`commands/workspace-codemap-pro.md:75–77` requires separate safe rendered SVGs, while line 97 explicitly states that `VIEW.html` escapes Mermaid and does not embed diagrams or clickable local links.

**Recommendation, not implemented:** make the intended reading surface show the existing safe SVGs with useful local navigation. Reuse the rendering/companion pieces; do not introduce a second publishing engine. Direct browser inspection is still required before claiming quality.

### P2 — Narrow source inconsistencies and untested controls

- Customer routing line 40 still warns against inventing an unavailable Roadmap command despite Roadmap now being in this installation. Refresh the handoff wording without authorizing automatic dispatch or product-priority decisions.
- Outcome's entry context requires one focused material question but has no explicit native selector behavior. Headless transcripts do not establish whether the desired native option control appears; this remains an interaction test, not a demonstrated UI bug.
- Review's local working-tree intake worked in the observed Codex run. The substantial unborn-repository snapshot, stale-evidence rejection and Debug compatibility still need the planned native case. Do not generalize local intake success to those unrun paths.

## Evidence, method and limitations

- **Frozen inputs:** 1,009 canonical/dependency/adapter files, with captured bytes and SHA-256 manifest. Live source was rechecked during trials and after focused validation; no production hash changed at the recorded checks. Evaluation files are excluded from that freeze by design.
- **Runtimes:** installed Claude Code 2.1.260, `fable[1m]` / exposed `claude-fable-5-1`, medium; Codex CLI 0.153.2, `gpt-5.6-sol`, medium. Exact invocations, resumed session IDs, fixture hashes, outputs and provider-reported usage are retained. Settings were session-scoped; unrelated plugins/MCPs/hooks/memories were disabled, not uninstalled.
- **Calibration limitations:** empty Claude setting sources hid command discovery; ignoring Codex user config exposed historical discovery. Those calibration runs are retained separately. Initial `approval_policy=never` prevented Codex artifact writes; later trials used scoped on-request auto-review. Claude's initial permission profile also produced denials before explicit sandboxed Bash allowance. These profile differences invalidate a strict timing comparison; they are not silently normalized away.
- **No blanket safety bypass:** Codex allowed Feature's scoped artifact creation after review but denied Architecture's. That inconsistency remains a runtime/evaluator boundary limitation. It was not treated as an application defect or bypassed with an unrestricted sandbox.
- **Evidence separation:** native tool requests, successful results, method-file reads, claimed method use and completed independent challenge are distinct. Stream exports may omit events; absence alone cannot prove nonexecution. Actor explanations and workflow ledgers are not independent proof. The grading extractor initially omitted one format's successful tool results; a same-candidate supplement and separate grading addendum preserve that correction without replacing original grades.
- **Independent grading:** graders did not execute cases, author the relevant fixtures or receive the actor's hidden reasoning. Runtime labels were withheld initially; tool signatures/paths can still reveal runtime, so this was not perfectly blinded. Expected answers/rubrics were outside actor repositories and explicitly denied to actors; no observed access is claimed, and no absolute context-isolation guarantee is made.
- **Timing/tokens:** recorded per turn in [execution.md](execution.md) and [run-summary.json](run-summary.json). Includes model service, file access, tool/approval waits and concurrent trials. Provider token accounting differs; Claude list-cost estimates are not actual billed spend. There is no controlled performance benchmark here.
- **Bounded trials:** 15-minute per-turn limit, at most three fresh attempts per case/runtime, predefined replies only. Including discovery calibration, each Feature small-case/runtime pair has already used three fresh sessions; do not launch another fresh retry without an amended plan. Existing-session continuation is distinct. A returned turn or exhausted reply sequence is not a workflow pass. Unreached late corrections are unperformed. All attempts and failures remain available.
- **Static verification:** [102 focused tests passed](focused-tests.txt), and [catalog/command validation passed](validation.txt). These do not prove model outcomes, visual taste, semantic diagram correctness, interactive controls or human comprehension. [Engineering fixture verification](fixture-verification.md) independently checked 36 JS syntax cases, 59 imports, 17 existing tests, six build implementations and eleven oracle probe groups; this is seed ground truth, not actor success.
- **Unperformed:** all eighteen substantial runs; remaining small cases; native option-control observation; focused-entry/status coverage beyond actually supplied replies; rendered visual screenshots; connected cross-command handoffs; product/production/release/PR/CI stages. These are not passed or implicitly waived. No live product research, customer contact, deployments or external system mutation occurred.

## Resume boundary

Do not change production instructions while completing this frozen cohort. Restore access to the same Claude model/settings, or obtain an explicit amended comparison design before changing models. First settle an authorized, consistent repository-local artifact policy without global configuration edits; preserve rejected attempts. Finish the small round, then substantial cases, then allowed fresh retries where justified. Complete independent grading, inspect actual visual artifacts and native question controls, and only then replace this partial scorecard with a completed one.

See [representative observed outputs](representative-outputs.md), the retained independent `grades/`, and [evidence retention details](EVIDENCE.md). The audit adds maintainer fixtures, reports and evidence only. It recommends targeted corrections; it does not implement them.
