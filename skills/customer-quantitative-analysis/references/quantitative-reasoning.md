# Quantitative reasoning by research question

Choose only relevant methods. Known formulas do not substitute for a correct population, design and observation process. Use current primary methodological/provider documentation when implementing a statistical procedure or engine-specific query; do not guess an API, uncertainty method or universal threshold.

## Optional existing lenses

Read the selected available skill or reference completely before applying its relevant lens. These files are optional local reuse, not required command dependencies. Missing lenses leave the core analytical method usable. Do not recursively load the whole inventory. Customer research scope and worker authority remain controlling; leaf references do not activate another workflow, grant acquisition or writes, impose historical targets, or start roadmap/monitoring work.

| Condition | File relative to this reference | Reuse and exclusions |
|---|---|---|
| Verified schema and dialect; SQL proposal needed | ../../outcome-analysis/references/aggregate-query-design.md | Reuse query construction/explanation. Proposed SQL is not executed or production-certified. No writes, index changes, arbitrary scripts or access authority. |
| Retention, funnel or adoption cohorts | ../../outcome-analysis/references/measurement-design.md | Reuse cohort calculations and follow-up ideas. No minimum cohort count, mandatory novel findings, causal 'why', automatic experiment or required visual. |
| A genuine experiment with documented design | ../../ab-test-analysis/SKILL.md | Reuse design/guardrail scrutiny only under the accepted design. Do not import fixed significance/power/sample formulas, automatic extension, ship/revert, or mandatory Python installs. |
| Metric meaning is unclear | ../../outcome-analysis/references/measurement-design.md | Reuse metric numerator/denominator/window/source definition only. No mandatory North Star/dashboard/alert implementation. |

These canonical paths resolve within the skills collection. When the measurement leaf refers to canonical cohort methods, use the cohort/exposure checks below; do not load the Outcome workflow or its analytical-methods reference. Its future-roadmap section stays inactive unless that distinct question is explicitly assigned, and never grants a delivery decision. Consult only supplied/authorized documentation; further-reading links are not permission for external acquisition. If an existing skill's instructions conflict with the user's research scope, keep the narrower scope and state the excluded portion.

## Cohorts, funnels and exposure

Define entry eligibility independently of successful outcome; conditioning on conversion hides abandonment. Compare like observation ages and opportunities: a recent cohort cannot have a long-term retention result yet. Distinguish repeat-event rates from unique-person/account rates. Align numerator and denominator with eligibility and exposure windows, and state how returns/reactivation count.

Inspect rates within meaningful segments as well as weighted totals. Decompose a change into within-segment behavior and changed mix where the data permits; do not assume a trend survived all segments. A small cell may be interesting for research but unstable for population estimation. Counts, missingness and bounds can be more useful than a precise-looking average.

For funnels, missing downstream events can mean logging/access problems or actual abandonment. Reconcile instrumentation and cross-system identities before labeling customer intent. Cross-sectional differences do not directly show longitudinal transitions. An account appearing in several workflows is not a duplicate to erase unless the claim's unit requires that aggregation.

## Sampling, surveys and prevalence

Specify the frame, selection mechanism, unit, eligibility, response rate, question wording/version/context and any weighting. Purposive interviews and rank-ordered recruitment reveal cases; counts among them do not estimate a market rate. A probability sample still needs coverage and nonresponse checks. If weights/design are unknown, preserve descriptive results rather than inventing adjustments.

Use question-specific asked and usable-response denominators. Not asked, declined, unclear, skipped and negative are different outcomes. Survey scale changes, leading prompts and different translations can break comparability. State the measured construct rather than labeling every satisfaction response demand or willingness to pay. Qualitative frequency and survey prevalence can disagree because they measure different questions or populations.

## Experiment and causal interpretation

Use causal language only when the design and evidence support the estimand. Establish assignment/randomization unit, exposure, outcome, interference, sample-ratio integrity, guardrails, observation maturity and analysis/stopping plan. Account for repeated looks or many exploratory comparisons using an appropriate accepted method. An observational before/after change with a plausible story remains observational.

Use the study's justified effect threshold, uncertainty method and decision rule. If they were not set, explain what is missing; do not retrofit convenient thresholds to the observed result. Statistical detectability is not practical value. An inconclusive result is neither proven no effect nor permission to keep extending until it wins. Recommend a research interpretation/next study, not rollout or production mutations.

## Economic quantities and proxies

Keep customer time/cost saved, gross transaction value, provider revenue and contribution distinct. Verify currency, period, unit, frequency and overlap before combining quantities. Stated time burden is not fully recoverable cash; observed spending on an alternative does not prove willingness to pay us. Estimate only within the supported population and label assumptions/ranges. No arbitrary multiple of registered accounts as TAM or revenue.

Reconcile bottom-up quantities with available aggregate data without treating agreement as validation. Disagreement may reveal a definition error, omitted actor, subaccount duplication or an unrealistic counterfactual. Preserve nonquantifiable harms rather than assigning invented currency values. Route deeper value/capture reasoning to a separately scoped economics analysis when needed; do not make it a prerequisite for basic discovery.

## Minimal proof shape

A material numeric claim should let another analyst locate the same input, apply the stated selection and computation, and see the same output. Retain exact source/row/field identity or an approved protected artifact reference, formula or executed code, numerator/denominator, units, population and time window. State whether the input is raw data, aggregate export, reported figure or scenario assumption. Hashes bind versions; they do not prove definitions, completeness, consent or causality.
