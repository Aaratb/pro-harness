# Evaluating the harness

This harness ships two kinds of check, and confusing them is expensive.

**Conformance** — `harness-test-cases/`, 672 checks — asks *does the instruction say what we think
it says*. It is free, deterministic, and runs on every commit. It protects decisions already
made: a phase cannot silently lose its gate, a validator and the prose it asserts on cannot drift
apart, a renamed file cannot orphan its references.

**Evaluation** — `evals/` — asks *is the output any good*. It runs a real model against a fixture,
has a **different** model judge the result against a frozen rubric, and appends the verdict to a
ledger. It is slow, costs money, and varies between runs, so it runs when instructions materially
change rather than on every commit.

Conformance cannot tell you the instruction is wrong, only that it is intact. That gap is the
entire reason evals exist here, and the findings below are what fell into it.

## The loop

```
evals/<suite>/<discipline>.json   fixtures + frozen rubric
evals/ledger/<suite>.jsonl        append-only verdicts, one line per criterion per sample
evals/baseline/<suite>.json       the accepted met-rate a run is compared against
```

```bash
npm run eval:report -- <suite>    # met-rate per criterion for the most recent run
npm run eval:gate   -- <suite>    # compare against the baseline; exit 1 on regression
npm run eval:accept -- <suite>    # promote the latest run to baseline (a deliberate act)
```

Producing and judging happens in a workflow that spawns a producer and a different judge model,
then feeds verdicts to `record`. Everything downstream of the verdicts — met-rate, regression,
whether a run may be accepted — is plain Node with no model calls, which is what makes the gate
reproducible and cheap to reason about.

### Five rules, enforced in code rather than left to discipline

**A verdict must cite the artifact.** `assertVerdict` refuses a reason under twenty characters. A
judge that cannot quote the output has not graded it, and an ungrounded verdict is worse than no
verdict because the report still looks credible.

**Producer and judge must differ.** A run where they match is refused outright. Self-grading is
the failure that makes an eval suite quietly worthless.

**The rubric is frozen.** A criterion's wording *is* the bar. Changing it invalidates every
comparison against it, so `rubric_version` must be bumped and the baseline explicitly re-accepted.
One run may not mix versions. Quietly editing a criterion until the harness passes it measures
nothing.

**Sample more than once.** A criterion's result is a met-rate across samples, not a verdict.
`partial` counts as half — and a criterion that keeps landing on partial is a signal the
criterion is ambiguous, not that the output is mediocre.

**Gate on regression, never aggregate.** A criterion falling materially below its accepted
baseline blocks. Aggregate scores are reported and never gate, because an aggregate is the
easiest thing to drift upward without anything improving.

### Writing a criterion

Both sides get written out — what `met` looks like, and the specific failure `not_met` catches:

```json
{
  "id": "finds-the-real-bottleneck",
  "met": "Identifies handoff acceptance (21 of 30 late tickets) as the dominant observed cause,
          above initial sorting at a 40-second median.",
  "not_met": "Accepts the team's framing that sorting is the problem, or treats the three causes
              as comparable."
}
```

A judge choosing between two described behaviours can be reproduced by a second judge. A judge
rating a vibe cannot. This is the difference between a rubric and a wish.

## Findings

### A reasoning rubric ceilings, and measures the model rather than the harness

The first suite tests product judgement: a scenario with a planted trap, five behavioural
criteria. Three samples, judged independently. **15 of 15 met, 1.00 on every criterion.**

That is a poor result wearing a good one's clothes. A rubric everything clears can detect
regression but can never show improvement.

It also reproduced a result this repository had already found. An earlier two-arm study — bare
prompt against full harness instructions, four disciplines, three trials each — scored 10/10/10
in **both** arms for product, engineering and QA, and concluded the richer instructions showed no
broad decision-quality improvement on that probe set.

The lesson generalises: **a case earns its place only if a capable model without the harness fails
it.** General reasoning quality is precisely where models already ceiling, so measuring it
measures the model. The harness's real claims are about discipline — not fabricating evidence, not
asserting a test ran, citing `path:line`, stopping at gates, independent challenge over
self-review, holding state across a long workflow.

### The harness lost to its own control

The second suite tests discipline instead. A draft review of four findings is presented alongside
the source excerpts those findings cite. Two are traps, two are controls:

- **F2** claims refund amounts are unvalidated, citing line 88 — but lines 85-87 already return
  `ErrRefundExceedsTotal`. The finding is *false*, not miscited.
- **F4** cites line 104 of a file the excerpt states has 93 lines.
- **F1** and **F3** are genuinely supported and must survive untouched.

Two arms, three samples each, judged blind against opaque labels:

| criterion | baseline | harness |
|---|---|---|
| rejects-the-contradicted-finding | 1.00 | 1.00 |
| catches-the-unverifiable-citation | 1.00 | 1.00 |
| blocks-the-handoff | 1.00 | 1.00 |
| **separates-a-bad-citation-from-a-bad-finding** | **1.00** | **0.33** |
| **does-not-invent-defects** | **1.00** | **0.33** |

The harness arm did **worse**, and the mechanism is one missing category.

`skills/review-evidence-integrity/SKILL.md:30` fixes the disposition set as `CONFIRMED`,
`REPRODUCED`, `LIKELY`, `UNVERIFIED`, `REFUTED`. **None of those means "the citation does not
resolve."** A candidate following the skill has nowhere to put F4, so it forces it into `REFUTED`
— the same bucket as a finding the source actively contradicts. Line 16 then instructs it to
preserve refuted candidates in the audit record, and two of three harness samples emitted almost
that sentence verbatim, giving a false finding and an unevaluable one the identical remedy.

The baseline arm, handed no vocabulary at all, drew the distinction unprompted.

`UNVERIFIED` caused the second failure: one sample downgraded the well-supported F1 and demanded
evidence the packet never contained. The scepticism is correct in general and miscalibrated here.

**No conformance test could have found this.** All 672 pass, because the skill says precisely what
it means to say. The defect is that what it means is incomplete, and only running it against a
case with a knowable right answer surfaced that.

**The caveat, stated plainly:** three samples, one case, one judge. This is a signal with a
traceable cause, not a proven regression. What makes it actionable is that the cause is a specific
missing category on a specific line rather than a feeling that output got worse.

## Adding a discipline

1. **Write a case a bare model fails.** If you cannot construct one, the discipline may not be
   something the harness actually improves — which is itself worth knowing before you invest in it.
2. **Include controls, not only traps.** An answer that flags everything is not careful, it is
   noisy. The `does-not-invent-defects` criterion exists to fail a candidate that withdraws a
   sound finding, and it earned its place immediately.
3. **Run both arms.** Without a control you are measuring the model and attributing it to the
   harness.
4. **Judge blind.** Candidates are presented under opaque labels so the judge grades the answer
   rather than the arm.
5. **Accept the baseline at its measured value**, including bad numbers. That records the floor;
   it does not endorse it.

## Limits

Small samples, one judge per run, and a handful of cases. These results are directional. The
ledger exists so that direction accumulates across harness revisions instead of being re-derived
— the second finding above cost four agents to rediscover something already recorded and since
lost, which is precisely the waste a durable ledger prevents.

An eval suite is also gameable by its own authors. The frozen rubric, the independent judge, the
mandatory citation and the regression-only gate are all there to make gaming visible rather than
easy. None of them makes it impossible.
