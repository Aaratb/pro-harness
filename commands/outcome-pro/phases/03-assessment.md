# Phase 3 — Assessment

Load `skills/outcome-analysis/SKILL.md`, dispatch its analysis focus for substantive work, and treat returned claims as drafts. Coordinator owns checks and final synthesis.

Connect observed results to the intended mechanism and test the strongest plausible rival explanation with distinguishing evidence. For AI-product outcomes only, use the analysis skill's `ai-product-engineering` route as assessment-only depth; offline scores, completed customer tasks and operational cost/safety are separate claims. No implementation, live evaluation or release gate is imported.

- **Comparative:** after the source-to-claim gate, read `schemas/outcome-pro/report.schema.json`; run `scripts/validate-outcome-report.mjs` with explicit evidence/report roots and relative report path. Report per-metric target result, gaps and overall `MET`, `MISSED` or `INSUFFICIENT_EVIDENCE`. Accept the machine assessment only when `ok: true`; diagnostics with errors are not validated verdicts. Repair from authentic evidence or explain the blocker.
- **Descriptive/milestone:** source-check facts and calculations in a human brief. No missing-baseline penalty for a valid descriptive count, no invented report fields or machine target verdict.
- **Experiment:** source/method-check the actual accepted design, calculations, uncertainty, practical value and guardrails in a human brief. Distinguish independently recomputed from supplied analysis; broken/missing design stays an insufficient-evidence finding, not a fabricated win. No machine-validation claim for that brief. It can enter recommendation after its checks and any required challenge.

Missing required baseline/target/policy, immature/incomplete windows, insufficient samples, incompatible units/cohorts/definitions or unknown comparability remain inconclusive. Missing release evidence prevents overall comparative success; secondary gaps remain visible without pretending to be primary failures. Reject impossible calendar dates, future evaluations, empty evidence and imprecise sample counts. Use real timestamps with explicit offsets; unsupported leap seconds need trustworthy compatible exports, not silent normalization.

Observed change is not causal attribution. Consider seasonality, concurrent releases, selection, instrumentation change and other counterfactual explanations. Report@1 always has `causal_claim: false`; neither its validator nor worker agreement certifies significance or causality. Supplied experiment results need separately appropriate design/statistical checks.

## Independent challenge

After proposed claims exist, trigger the challenge focus for costly/hard-to-reverse choices, conflicting sources, material segment/guardrail harm or causal/model assumptions driving advice. Load `skills/outcome-independent-challenge/SKILL.md` completely and follow the clean fresh packet contract. The coordinator—not analyst—supplies original sources and proposed claims.

Reconcile supported/disputed/unverified findings against original evidence, not consensus. Recheck changed calculations and rerun affected validation. Narrow/withhold unresolved claims; unqualified success is blocked by unresolved material harm. When independence is unavailable, explicitly report **independent challenge not performed**, bounded local coverage and consequential advice as provisional. No reviewer swarm for an uncontroversial status question.

Complete with established versus unproven value, actual validation/calculation coverage, material uncertainty and challenge result. A valid insufficient-evidence finding completes assessment; never loop until positive.
