# Disciplinary decision-quality probes

These four synthetic cases exercise product judgment, design direction, engineering planning, and QA evidence. They are maintained evaluation inputs, not runtime instructions or mandatory workflow artifacts. They contain no customer data.

## Method

Compare frozen skill versions using the same case, runtime settings, tool restrictions, and response budget. Run each arm three times per case. Supply the two named skill texts and the task; withhold the rubric. Dependencies are excluded for this bounded text-only critique. Require no tools and no claim of actual research, browser inspection, or test execution. Limit responses to 450 words and record over-budget responses rather than silently discarding them.

Retain skill and prompt hashes, final answers, exit status, tool-call count, elapsed time, and reported token usage. Do not retain private reasoning. Classify infrastructure failures separately; do not score them as model failures or retry low-quality answers until they pass. Get approval before sending private instructions or data to a hosted evaluator.

Randomize response order and remove arm labels before independent judging. Score each of the five fixed criteria: 0 = absent/incorrect, 1 = generic or incomplete, 2 = concrete and correct against the supplied evidence. Retain reasons and report all trials, not only the best. Check for unsupported claims independently of the total score.

## What this can establish

- Whether a supplied decision case elicits important methods and truthful evidence boundaries.
- Response variability, response-length compliance, and the observed latency/token trade-off.
- Specific regressions worth investigating, not universal model or workflow quality.

## Limits

These are small, explicit diagnostic cases, not a held-out benchmark. Several hazards are directly stated and overlap skill examples; capable models may already reach the rubric ceiling with the short baseline. A ceiling result is inconclusive, not evidence that richer guidance is useless or that it improved quality. More words are not themselves a success criterion.

Text-only design judgments do not prove visual taste in rendered interfaces. These probes do not test specialist dispatch, context transfer across phases, permission enforcement, production integrations, or full Feature Pro execution. The four additional production/specification skills and agent-routing changes need separate structural/integration checks; their behavior is not isolated by these eight-skill probes.

Keep approved per-run snapshots and raw results in an explicit evaluation output location, outside runtime skill loading. Record the exact model/settings when exposed; otherwise disclose the missing metadata. Never convert these scores into a release guarantee or a percentage improvement without adequate independent evidence.
