# Phase 8 — Architecture Decision

Classify each decision as mechanical, taste, or user-owned. Mechanical decisions cite the forcing constraint. Taste decisions record the tiebreaker and runner-up. User-owned decisions that change purpose or trade away an expressed requirement are never auto-resolved.

Eliminate options that violate a hard constraint. Score surviving options on the approved criteria using an anchored rubric, evidence status, confidence, and score ranges. Identify the Pareto frontier before weighted totals; do not select a dominated option without an explicit human exception.

Load `architecture-decision-records` for sensitivity analysis: vary the decision-sensitive assumption or weight within plausible bounds, label this exploratory analysis without changing the approved baseline, and identify rank reversals. A small weighted lead is not evidence of superiority. Explain what would make the runner-up win and the cheapest proof that could resolve consequential uncertainty. Load `grill-with-docs` for a remaining user-owned trade, not to reopen settled answers.

Before scoring a narrowed option set, validate its decision packet and verify the `option_scope` evidence and independent-review references against the actual reports. A fresh instance distinct from every option author must have challenged the exclusions and surviving choices. Unresolved material objections block selection; preserve dissent and any explicit human risk acceptance. Do not rerun that review when the constraints, options, and evidence are unchanged.

Resolve the report ID through `state.lane_runs`, check its artifact digest, and verify the challenger and author runtime dispatch identities recorded there as defined by routing. Missing dispatch evidence blocks narrowed selection; a schema-valid report or self-declared challenger identity is insufficient.

For every option record reversibility, switching cost, assumptions, risks, evidence, and the observation that would make it win. Preserve the strongest dissent. For the selected option record build, runtime, operations, latency, availability, consistency, migration, exit, lost-optionality, failure-mode, and cognitive costs.

At the existing decision checkpoint, show what is selected, what stays unchanged, what is sacrificed, and remaining dissent beside the relevant view. Invite the user to amend a constraint or propose another viable shape. Reevaluate affected options, criteria and challenge evidence through the legal path before selection; a score is not the decision's defense.

Require explicit sign-off on the selected architecture and any one-way or material business trade. Without it, leave the decision pending and do not enter deep design.
