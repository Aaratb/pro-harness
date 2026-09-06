# Outcome analytical methods

This reference supplies analytical depth, not new phases, permissions or verdict schemas. Apply only relevant checks. Existing skill examples are subordinate to the canonical Outcome contract. State known facts, modeled estimates and hypotheses separately. Read primary documentation before provider-specific queries or version-dependent/statistical implementation; do not invent statistical methods or confidence intervals from a skill's example formula.

## Intent, mechanism and decision-changing evidence

For a material outcome question, connect the intended customer job or domain result to the proposed mechanism, exposure, changed behavior and realized value. Mark each relevant link observed, hypothesized or missing; a missing link limits the conclusion, not the legitimacy of facts on either side. A coherent mechanism is not causal proof. For a decision-driving explanation, identify a credible rival and what each predicts differently; use existing segment, timing, exposure or qualitative evidence to distinguish them. If both fit, retain both and name the smallest discriminating check rather than declaring a cause.

Use **decision sensitivity** to prioritize gaps: which plausible unresolved input or explanation could change the owner's choice, in what direction, and what evidence would distinguish it? Prefer that check over more descriptive slices. Consider collection cost, delay, privacy and the consequence/reversibility of acting now. Stop further collection when it cannot plausibly change the supported decision; disclose remaining limits. Required missing measurements still produce insufficient evidence, never a relaxed target or manufactured success. Do not invent probabilities, numerical value of information or precision; execute reversal/break-even calculations only from supported inputs, otherwise state the condition qualitatively.

## Descriptive status and milestones

Answer what exists or happened, who benefited if known, and the cutoff. A repository file proves implementation exists; a passing test proves its tested behavior; a deployment proves delivery; exposure and customer adoption each need their own evidence. None alone proves revenue, retention or savings. Count the actual scoped units, not commits, tickets or events as customers. A historical descriptive trend may be established without an intervention or target. Do not confuse lack of causal proof with lack of observable achievement. Use a human brief, no fabricated report@1 success.

## Cohort, retention and ordered funnels

- Define entity (account/user/order), eligibility, assignment/exposure, start event, required ordered steps, conversion horizon and timezone. Numerator must be a subset of the same denominator; event counts are not unique entities. Check deduplication, retries, bots/internal traffic, identity merges and join fan-out using schema/query definitions or aggregate audit totals.
- Show step counts and conditional conversion versus end-to-end conversion; do not multiply incompatible window/cohort rates. Identify drop-off, not a proven cause. Distinguish all eligible from reached/exposed users.
- Retention uses equal cohort age and a specified return/active event. Right-censor immature cohorts rather than treating not-yet-observed days as churn; distinguish full-window retained fraction from survival estimates. Do not require an arbitrary number of cohorts or invent meaningful patterns.
- Compare like populations/windows/instrumentation. Check material segments where mix can change the decision. Aggregate improvement can coexist with every segment getting worse (mix/Simpson effects); recompute segment and properly weighted results. Do not average rates equally unless weights justify it. A failed accepted segment guardrail blocks an unqualified win.
- Good evidence can establish measured adoption/retention success against an accepted target; it cannot attribute the change to the release by itself. Next step is the smallest informative segment/query/qualitative check, not automatically a rebuild.

## Experiment interpretation

Recover the accepted hypothesis, primary unit of randomization/analysis, assignment and exposure, target/MDE, guardrails, planned sample/duration, stopping rule and multiplicity policy. Check sample-ratio mismatch, contamination/interference, missing outcomes, repeated observations, novelty, exclusions and post-treatment selection. A positive lift with broken assignment does not rescue the experiment. Don't extend a fixed-horizon test just because a p-value is disappointing or pick a winning segment after the fact.

Compute arm rates, absolute percentage-point difference and relative lift (undefined for zero control). For significance/intervals, use an appropriate reviewed analysis or primary-source-backed method matching the design; separate supplied results from independently recomputed results. Never reuse a fixed p<0.05, 80% power, 95% interval or simplistic formula without an accepted design. Statistical significance, practical value and net guardrail impact are different questions. Wide uncertainty is not proof of no effect. A valid supplied experiment may support a carefully qualified experimental finding; report@1 remains an observed-target report with `causal_claim: false`, not causal certification. Recommend a human decision; never roll out or stop treatment from analysis alone.

## Economics and realized business value

Reconcile measured revenue/cost at a consistent currency, period and accounting definition. Separate bookings, recognized revenue, cash collected, refunds/credits and forecast; do not silently equate them. If definitions/tax/exchange treatment matter and are absent, ask for reconciliation rather than guessing. Business measurement is not legal/accounting certification.

For a cost claim, show the baseline cost, measured current cost, incremental implementation/ongoing cost, shared allocations and net result under explicit comparable volume/service quality. Time saved × loaded rate is modeled capacity value, not realized cash unless staffing/overtime/vendor spend actually changed. Do not double-count: never add modeled labor value and a reduced bill for the same saved work, or total revenue and its uplift as separate benefits. Separate one-off and recurring effects; amortization/payback requires a declared period and stable assumptions. CAC needs compatible acquisition spend and newly acquired paying customers; LTV needs justified horizon/margin/retention, not a magical multiple. Use sensitivity only for consequential uncertain inputs and show the break-even condition. Preserve negative/zero values where real.

## Marketing and growth attribution

Track reach → eligible leads → customers → retained/realized value with deduplicated, aligned entities/windows. Impressions, opens and signups may be useful leading signals but not substitutes for the requested business result. Distinguish platform-attributed, last-touch and incremental conversions; overlapping channels cannot each claim the same customer/revenue. Reconcile to a deduplicated source of truth or state a range/gap, not the most favorable dashboard. No lift/incremental ROI claim without a defensible counterfactual. Campaign timing, seasonality, organic demand and lagged conversion can explain changes. A descriptive paid-customer acquisition cost can be sound without claiming causal incrementality. Reuse existing aggregate analytics before proposing new collection.

## Engineering and operations

Use workload, service scope, measurement window, traffic/error denominator and accepted SLO/target. Weighted means require counts/weights; percentiles cannot be averaged across services/windows—use the aggregate distribution/histogram or retain separate p95/p99 values. Distinguish sampled traces from all requests and successful-request latency from user-perceived latency including failures/timeouts. Filtered error logs cannot estimate global error rate; no logs does not prove no failures.

Report throughput and latency alongside error/queue/resource/saturation guardrails where relevant. A backup configuration is not a restore drill; a test at present load is not 10x capacity proof. Improvement may be demonstrated for the measured workload without claiming business impact or universal production readiness. Suspected defects go to Review first; structural limits go to Architecture. Avoid speculative root causes, production tuning or load tests without the proper authority.

## AI-product outcomes

Apply only when the initiative actually includes AI/ML/LLM, retrieval, prompts or agent/tool behavior. Reuse the assessment methods in `ai-product-engineering` and its evaluation-and-release reference under Outcome authority; do not inherit build/release gates, writes or permission to run evaluations. Deterministic contract tests, fixed-set offline evaluations and live customer outcomes answer different questions. Report measured offline task quality for its evaluated cases; passing contract tests or a higher model score do not establish live customer benefit.

Recover the accepted task-success definition and eligible-task denominator. Distinguish autonomous completion from human-corrected completion, fallback, escalation, abstention and abandonment; do not remove difficult or refused tasks to inflate success. Record each side's model, prompt, retrieval/index, tool and grader versions, dataset provenance/contamination, cohort, case mix and observation windows. Separate the intended changed component from other differences that confound comparison; isolate what the evidence supports, and never substitute a fixed-set gain for live improvement.

Assess quality and safety failures, consequential slices, uncertainty and end-to-end latency alongside success. Calculate cost per successfully completed task from total measured in-scope cost, including failed attempts, retry/tool costs and human effort where measured without double-counting, divided by the declared successful-task count. State whether success includes assisted completion; preserve missing costs, a zero denominator and important tail/slice harm rather than hiding them in a favorable mean. No new evaluation run, raw prompt collection, rollout or safety certification follows from this assessment.

## Qualitative and mixed evidence

Use deidentified customer stories to explain the job, friction, observed behavior and desired outcome. Cite supporting and contradictory accounts; identify recruitment/selection, segment coverage and source limitations. Do not infer population prevalence, satisfaction percentages or causal bugs from a few interviews. Customer accounts can establish that a problem was reported and suggest a testable explanation; quantitative evidence determines measured prevalence/outcome where needed. Never fabricate a mandatory number of segments or quotes.

## Source-to-claim and challenge output

For each material claim: `claim | source + field/passage | arithmetic/derivation | unit + population + window | supported limit/gap`. Target/sample-policy/definition provenance matters as much as observation values. If a material denominator or source differs, either reconcile with evidence, narrow the claim to the supported scope, or leave it unverified. Don't silently drop inconvenient evidence or relabel primary metrics.

For the triggered fresh challenge, use [outcome-independent-challenge](../../outcome-independent-challenge/SKILL.md). The coordinator owns reconciliation and unavailable-worker disclosure; peer agreement never substitutes for evidence.

## Proportionate decision memo

For a consequential choice, compare the real options against the same outcome and constraints; consider two credible alternatives where they exist, not a quota. Include status quo, an existing capability/service or a manual path only when genuinely viable; never fabricate alternatives. Explain the recommendation and strongest rejection, marginal/avoidable future costs, opportunity and switching costs, reversibility, least-certain point and falsifier. Sunk costs describe history, not a reason to continue. Use decision sensitivity for the smallest useful next evidence with owner/window; prefer existing telemetry and reversible changes. For routine descriptive status, answer directly with sourced facts and one next step if needed. Never invent certainty, costs or repeated approval rituals to fill a template.
