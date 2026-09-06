# Outcome Pro reconciliation

Outcome Pro keeps the four-phase intent → evidence → assessment → recommendation workflow. The public command is a compact entry; deeper guidance loads only for the current phase and selected analytical question. This document records semantic preservation and deliberate consolidation, not a migration runtime or compatibility engine.

## Preserved behavior

| Concern | Canonical location |
|---|---|
| Decision-first intake, smallest useful assessment, explicit unknowns | `commands/outcome-pro.md`; Phase 1 |
| Single-phase selectors, prerequisite rechecks, partial human output, no automatic later phases | Main command and contract |
| Business/product intent versus proxies; delivery/exposure/adoption/benefit | Phase 1 and analytical methods |
| Descriptive, comparative and accepted-design experimental paths without fabricated baselines | Phases 1 and 3 |
| Scoped authorized aggregate collection; no credential-implies-authority shortcut | Main command; Phase 2 |
| Missing access, missing or broken telemetry, prospective measurement and no indefinite polling | Phase 2 |
| Source-to-claim, original targets/policies, null missingness, comparable populations/windows and maturity | Evidence skill and analytical methods |
| Separate source-byte arithmetic and structural/target validation | Calculation proof; deterministic helpers |
| Fresh evidence/analysis/challenge contexts, no worker collection or writes, clean challenger packet | Routing, canonical analyst and three focus skills |
| Consequential choices, conflicts, harm, model/causal assumptions trigger independent challenge | Phase 3 and challenge skill |
| Unavailable independence disclosed; disagreements resolved by evidence, not votes | Routing and Phase 3 |
| Comparative verdicts, causal limits and honest completed insufficient evidence | Phase 3; report schema/validator |
| Alternatives, opportunity costs, uncertainty, falsifier and reassessment condition | Phase 4 and analysis skill |
| Suspected defects go to Review first; no fabricated Debug identity or handoff | Main command; Phase 4 |
| Prospective outcome revisions preserve original assessment and require approval | Phase 4; measurement design |
| Proportionate decision brief and explicit proof coverage, no automatic implementation/release | Phase 4 |

## Consolidation and reuse

- One canonical runtime-neutral `outcome-analyst` replaces three overlapping definitions. `analysis_focus` selects evidence, analysis or challenge. Role consolidation does **not** merge contexts: independent challenge still requires a separate clean fresh execution.
- Four flat skills: the public discovery entry plus the three focus skills. No nested packages, platform discovery files in canonical skills, or extra public wrappers.
- Existing `ab-test-analysis` remains the conditional experiment skill, subordinate to accepted design and Outcome authority limits.
- Existing `ai-product-engineering` supplies conditional assessment methods for AI-product outcomes: task success versus offline scores, comparable versions/cohorts, human intervention, safety and end-to-end cost/latency. It grants no implementation, evaluation-execution or release authority.
- Metric dashboard, prospective customer-value measure, cohort and future-roadmap guidance share `measurement-design.md`. Interview synthesis and segmentation share `customer-evidence.md`. Provider-aware aggregate query design is one on-demand reference. No duplicated public domain skill family.
- Method depth preserves economic reconciliation, marketing attribution, engineering/operations limits, qualitative evidence, ordered funnels, cohort maturity, weighting and causal uncertainty. Unnecessary minimum cohort/segment counts and fixed statistical defaults are not carried forward.
- Existing repository-root containment, no-follow byte reads, canonical digests, command validation and workflow tracing are reused. No new provider, dependency, state/resume engine, evidence ledger or plugin packaging.
- The existing release-deployment skill and responsible release workflow own authorized rollout/closeout; Outcome does not add a shipping command.

## Deliberate output and portability changes

Durable output belongs to the selected owner repository at `.agents/outcomes/<run-id>/`, using a fresh non-overwriting run. No owner repository means chat, not an orphan workspace. The coordinator writes the human brief; only complete comparative assessments serialize report@1. Calculation worksheets remain optional, and trace events reuse the shared mechanism only for saved runs.

Installed entries resolve their canonical harness root from their location or adapter binding, not from the target repository. Capability and role names remain host-neutral. Runtime-specific activation and future marketplace packaging stay outside canonical behavior.

## Verification scope

The depth pass adds a testable intent-to-value mechanism, rival predictions and decision-sensitive evidence collection to the existing methods. It compares genuine alternatives using avoidable future and switching costs, not a fixed option quota or sunk-cost pressure. Current canonical method delivery and actual execution identity/disposition are recorded in the existing human proof note; no new schema fields or ledger are introduced. Unchanged checked evidence can be reused across phases without bypassing independent original-source challenge or final validation. Missing required comparative evidence remains insufficient.

`tests/outcome-pro-import.test.js` starts with a recorded missing-import failure and checks phase/order/loading, compact entry size, canonical agent isolation, preserved gates, helper reuse and exact flat-skill registration. `scripts/validate-outcome-pro-command.mjs` reuses the shared mechanics validator and verifies references/catalog resolution. Arithmetic, schema, unsafe-path and distribution behavior are exercised separately by their focused suites; textual contract checks are not proof of real-world analytical quality or live connector access.

`tests/outcome-pro-depth.test.js` checks method activation and instruction regressions. Scenario exercises can expose contradictory advice; neither those exercises nor passing tests establish real-user outcome quality, causal impact or lower runtime latency. Canonical sources are updated without regenerating installed agent snapshots, changing home-directory configuration or rewriting active runs.
