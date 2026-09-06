# Reproduction and causal experiments

Load this reference for reproduction, ambiguity, flakiness, instrumentation or bisect. Use the smallest applicable technique; no fixed candidate count, fanout tier or numerical confidence formula is required.

## Build an exact feedback loop

Begin with the simplest safe route likely to reproduce the defect. Escalate only when the previous option cannot reach the actual failure:

1. An existing or temporary failing test at the relevant unit, integration or end-to-end seam.
2. A structured HTTP request against an authorized local/sandbox target.
3. A CLI with a fixed fixture and observable output comparison.
4. A browser interaction asserting the relevant DOM, console or network result.
5. A captured request/event replay through an isolated path, stripped of secrets and real effects.
6. A minimal throwaway harness with only the necessary service or dependency boundary.
7. A seeded property/fuzz loop checking the specific invariant.
8. A bisect harness against verified known states, in a throwaway worktree when code history is the axis.
9. A differential run of the same input against two versions or configurations, changing one relevant factor.
10. A structured human-assisted loop: precise steps, timestamp/build/session, expected/actual result, sanitized capture and explicit pass/fail. Do not invent an automated result for human interaction.

Record what was attempted and why an option was unsuitable; do not exhaust ten options ritualistically. Prefer faster setup, sharper observable assertions and determinism: fixed seed/time, isolated filesystem, pinned fixture, controlled dependency response and explicit cancellation. Avoid tests that assert only mock calls, private implementation details or absence of a crash.

Match four things: reported symptom, first-hand observation, available diagnostic signature and loop assertion. A near-match is a rejected reproduction. For a static-only defect, the actual deterministic diagnostic supplies the signature. Missing runtime logs do not invalidate a scoped static observation; they do limit runtime claims.

Compare an affected case with a genuinely comparable unaffected case to find the relevant boundary: identity/session, data shape, ordering, version, configuration or elapsed time. Reduce the reproduction one factor at a time while retaining that boundary and the un-minimized original recipe. A clean session, simplified fixture or immediate fake response that removes the failure condition is not a successful reduction.

If a safe exact loop cannot be built, ask for the specific environment, capture or authority that would unblock it. Retain an observation/detector recipe and an honest incomplete report. Do not proceed to permanent correction on a reproduced neighboring defect.

## Flaky behavior

Measure failure rate as failures divided by observed trials and retain their actual outcomes. Never assume `r=1` to justify one trial. For reasonably independent trials, select N so `(1-r)^N <= 0.05`; explain correlated trials or uncertainty in r rather than presenting this bound as universal. Record the same scenario and adequate trials after correction.

Improve observability/determinism without silently changing the failure. Controlled stress, scheduler manipulation or fault injection belongs only in an authorized isolated environment and must preserve the symptom. One passing trial cannot establish repair of an intermittent defect.

If instrumentation materially changes the measured rate, record `HEISENBUG-SUSPECTED`. Stop log-statement probes and consider a sanitizer, record/replay, debugger or timing-neutral counter. “Logging made it disappear” is not a resolution.

## Trace and distinguish

Trace backward from the visible failure to the first wrong value/state. Cite actual calls, data boundaries and observations. Mark the last known-correct upstream boundary and the first known-wrong one. Several consecutive blind boundaries create a concrete signal gap, not license to guess. Read source as early as useful; source location does not itself prove runtime execution.

Distinguish the frame reporting the error, the invariant already violated, and the component owning enforcement or authoritative state. Follow transformed errors, asynchronous work and persisted effects across those boundaries; a downstream catch can relieve the symptom while the wrong write, missing authority check or duplicate effect remains.

For an ambiguous case, write a small set of distinct plausible causes and falsifiable predictions before experiments. Consider actual relevant axes—code, data, configuration, dependency, traffic or time—without padding. Rank experiments by discrimination, cost and risk, not rhetorical confidence. The first generated hypothesis gets no privileged first probe unless it wins that ranking.

Show the prediction and one-variable probe before running it, including a comparison/control outcome that would distinguish the leading explanations. Record result and what remains possible. A mock is evidence only for the boundary it actually exercises: unconditional success cannot test partial commit, authorization or acknowledgement loss. Elimination needs an executed discriminating experiment or directly pertinent archival evidence; reasoning alone changes priority. An execution/setup error is `PROBE_ERROR`, never PASS, absence or elimination. After two failures of the same probe, reassess rather than execute an unchanged third attempt.

A coupled package resolution set may require a multi-variable change; label it explicitly and narrow the claim accordingly. When removing each candidate reduces but does not eliminate the failure, investigate multiple sufficient causes. Record before/after rates and the shared disjunctive explanation; partial necessity is not refutation.

## Prove the cause proportionately

A simple deterministic defect can be confirmed through exact reproduction, a discriminating origin check and source mechanism. Do not require a formal proof matrix for a typo with executable consequences. Ambiguity, risk, timing sensitivity or multiple causes call for stronger evidence:

- Necessity/sufficiency counterfactual pair: remove one factor and observe pass; restore it and observe the exact failure, with adequate trials.
- Explain magnitude and timing fit as well as direction. A static claim instead explains diagnostic/mechanism fit.
- Actively refute credible rivals; list what evidence rejected them and what remains unknown.
- For conjunctive causes, use leave-one-out checks to establish a 1-minimal necessary set. For disjunctive causes, preserve each independently sufficient mechanism.
- Use an authorized fresh independent challenger when useful. Provide only the claim and cited evidence, not the author's rank or confidence. If unavailable, the author can test a rival prediction but must label it self-challenge, not independent evidence. This proportional causal challenge does not replace the fresh independent code review required for a repair.

Qualitative confidence follows actual evidence. Neither an elegant story nor all agents finishing proves `CONFIRMED`. Never attribute cause to a person, role or team. Separate trigger, latent condition, contributing factors and root mechanism where relevant; fixing only the event that exposed a latent defect may leave recurrence intact.

## Instrumentation, bisect and stopping

Instrument only a named discriminating boundary. Cite the repository's logger/span/counter idiom, predeclare files and safety, tag `[DEBUG-<runid>]`, capture a diff and retain teardown instructions. Bound this to two rounds; a round answering no question ends the loop. Temporary diagnostics cannot silently become the permanent fix.

Bisect requires a verified passing good point, justified code-history axis, explicit authorization and a throwaway worktree. Never move the user's HEAD or assume `HEAD~1` is good. Record skipped revisions; name the commit exposing the defect without calling it the cause. Data/configuration/dependency/traffic/time investigations normally need their own controlled comparison instead.

After three failed corrections or repeated failed causal-model revisions for one symptom, stop patch iteration. Recheck the symptom contract, reconsider candidate space, or request the specification/architecture decision. A fourth speculative fix is not progress. Preserve active evidence and a precise next action even when the model remains unresolved.
