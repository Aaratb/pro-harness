# Readiness, dependencies and finite capacity

Use only the checks that affect this execution question. These are analytical procedures, not a required project-management framework or authority to create an implementation plan.

## Establish the planning basis

Keep an inspectable basis for each material claim: selected item, source/version, capability meaning, estimate unit, role, availability window, prerequisite and evidence status. A supplied engineering estimate may be useful for a scenario even before a PRD exists; it does not become a validated commitment. When estimates are absent, give a readiness sequence and request the needed estimate rather than guessing a T-shirt size.

Separate scope readiness, dependency readiness, capacity fit, customer-outcome completeness and release readiness. Passing one does not establish the others. All selected items can have Product Notes while unresolved scope still prevents meaningful effort estimates. A partially reviewed backlog can support a subset discussion without becoming a completed all-feature note set. State the actual inspected scope.

Keep original human intent visible. A PRD may discover a different means or change the proposed scope, but an unresolved contradiction cannot quietly become the new execution baseline. Identify the specific human decision and affected plan entries; retain the historical note and unaccepted proposal.

## Build a small dependency model

Represent only the capability-level relationships needed for the decision. For each edge identify whether it is a sourced finish-before-start requirement, an external gate, a suspected dependency or a preferred order. Do not turn a row's visual position or priority into a technical prerequisite. Shared design or customer-context work may precede several features without itself being a newly selected feature.

Distinguish:

- Existing supported capability: may satisfy a prerequisite at its documented scope; do not borrow undocumented roles, timing or behavior from the proposed feature.
- Selected prerequisite: include its demand and readiness before dependent work.
- Deferred/unselected prerequisite: show unresolved feasibility and options for human reconciliation; do not count it as admitted work or omit its burden.
- External prerequisite: record known owner, availability/approval and uncertainty; a calendar hold is not completion proof.

Check circular or incompatible dependencies. Missing originals or unknown edge semantics prevent a definitive schedule but still allow a useful explanation of the specific conflict. Do not create architecture or engineering subtasks to paper over it.

## Normalize demand and availability

Use the source's actual resource pool and skill eligibility. Ten free generalist-days cannot substitute for two specialist-days without a supported substitution assumption. One person shown under two roles cannot supply both capacities simultaneously. Do not invent people or infer that a team has no other obligations.

Compute net available capacity from supplied commitments, leave and calendars, avoiding double subtraction when a figure is already net. Keep one-off effort and recurring support load distinct. A person-week and a calendar week coincide only under explicit availability and concurrency assumptions. If allocation percentages are supplied, apply them to the correct working-time base; unknown utilization or switching cost remains unknown rather than a universal buffer percentage.

Preserve whether work can be split, batched, interrupted or shared. Do not divide a non-parallelizable task duration by headcount, pack half of a non-splittable activity into a short slot, or process two features in one testing slot if the source requires a full slot for each.

## From lower bounds to a feasible scenario

Use precedence and demand/capacity bounds to expose impossible targets. With a stable capacity, demand divided by capacity gives a resource workload bound, not automatically a finishing date. Account for earliest release, design completion, calendar placement, partial windows, external waits and downstream work.

Construct a witness for any claimed feasible scenario: which capability uses which available resource/window, when prerequisites finish, and when the customer-facing outcome is verified or ready at the claimed level. Track cumulative unfinished demand rather than only totals. An empty early QA slot cannot be banked for an extra late slot unless the source permits it. A slow prerequisite can leave other roles idle even when their capacity totals look generous.

At coarse granularity, do not assume tasks finishing in a week can feed a successor in the same week. State the intra-week ordering assumption or use a conservative next window. If exact days are supplied, honor them. Count trailing QA, enablement or partner work needed for the stated completion target; engineering completion is not automatically customer readiness.

Only call a scenario feasible within the inspected constraints. Unknown work, pre-PRD scope and uncertain durations remain explicit. If no feasible witness is available, say that the computed time is a lower bound or candidate window, not a validated plan. Uncertainty should appear with the date, not in a detached disclaimer.

## Compare choices without changing the selected set

Useful sequence comparisons may favor an earlier usable outcome, earlier discovery of uncertainty, fewer resource collisions or reduced late-stage queueing. Explain the consequence and trade-off without inventing customer value weights or silently adopting priority. Several sequences may fit equally; the human may choose among them for reasons not yet supplied.

For an infeasible window, show the amount and location of unmet demand where possible. Compare only credible scenarios, such as extending the window, obtaining qualified capacity, changing a handoff assumption or reconsidering scope. Label which changes require approval and which lack evidence. Do not present added capacity as instantly available or exclude a selected item because it fits poorly.

Keep all selected IDs visible, including blocked or unfinished ones. A spillover cell can show remaining work but must not hide it from the completion claim. Do not turn an unnamed column into extra capacity or a historical date range into the next cycle's week. Preserve the original layout and human source values alongside any proposed view.

## Recheck the constraint after correction

Apply a corrected input at its proper scope once. Preserve the prior scenario for history, recompute affected demand/availability and identify changed versus unchanged timing. Relief of the first bottleneck may move the limiting constraint to another role, a dependency gate or a fixed external window. More engineering capacity cannot eliminate a later test/approval queue automatically.

Similarly, a new capability correction can remove proposed work while leaving an adoption gap, or reveal a dependency that changes the sequence. Reopen affected readiness and note assumptions without automatically changing selection. Describe the smallest next source or human choice that could make the plan more certain. Do not require a new discovery program when a narrow availability or capability answer suffices.
