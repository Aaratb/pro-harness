# evals — measuring output quality

`harness-test-cases/` asks *does the instruction say what we think it says*. It is fast,
deterministic, and runs on every commit. It cannot tell you whether the output is any good.

`evals/` asks *is the output any good*. It runs a real model against a fixture, has a
**different** model judge the result against a frozen rubric, and appends the verdict to a
ledger so quality can be tracked across harness revisions. It is slow, costs money, and is
non-deterministic — so it runs when instructions materially change, not on every commit.

Both are necessary. Conformance protects decisions already made; evals tell you whether those
decisions were good ones.

## Layout

```
evals/<suite>/<discipline>.json   fixtures + frozen rubric, one file per discipline
evals/ledger/<suite>.jsonl        append-only verdicts, one line per criterion per sample
evals/baseline/<suite>.json       the accepted met-rate a run is compared against
```

## The rules that make this compound

**The rubric is frozen.** A criterion's wording is the bar. Changing it invalidates every
comparison against it, so `rubric_version` must be bumped and the baseline explicitly re-accepted.
Quietly editing a criterion until the harness passes it measures nothing.

**Judges are independent.** The model that produced the artifact never grades it. Judge and
producer are recorded on every ledger line so a contaminated run is visible after the fact.

**Sample more than once.** Output is non-deterministic; a single run is noise. A criterion's
result is a met-rate across samples, not a verdict.

**Gate on regression, not aggregate.** A criterion moving from met to not-met against the
accepted baseline blocks. Aggregate scores are reported but never gate — an aggregate is the
easiest thing to game, including unintentionally.

**Verdicts cite.** A judge that cannot quote the artifact text supporting its verdict has not
graded it.

## Running it

```bash
npm run eval:report -- feature-pro    # met-rate per criterion for the most recent run
npm run eval:gate   -- feature-pro    # compare against the accepted baseline; exit 1 on regression
npm run eval:accept -- feature-pro    # promote the latest run to baseline (a deliberate act)
```

These are **not** part of `npm test`. Conformance runs on every commit because it is free and
deterministic; evals cost money, need models, and vary between runs. Run them when instructions
materially change.

Producing and judging happens through a workflow that spawns a producer and a **different**
judge model, then feeds the verdicts to `record`. The ledger refuses a run where producer and
judge match, so a contaminated run cannot be recorded even by accident.

## Known limitation: this rubric is at ceiling

The first real run scored **15/15 met** across three samples. That is not a good result — a
rubric everything clears has no discriminating power. It can still catch a regression, which is
why the baseline is accepted at 1.0, but it can never show an improvement.

This reproduces a finding the harness had already recorded and then lost. An earlier two-arm
study (short-baseline prompt vs full harness instructions, four disciplines, three trials each,
independently judged) found:

| Domain | Baseline arm | Harness arm |
|---|---|---|
| Product | 10 / 10 / 10 | 10 / 10 / 10 |
| Engineering | 10 / 10 / 10 | 10 / 10 / 10 |
| QA | 10 / 10 / 10 | 10 / 10 / 10 |
| Design | 9 / 9 / 10 | 10 / 9 / 10 |

Its conclusion: *"the richer instructions did not demonstrate a broad decision-quality
improvement on this small probe set."* A capable model answers these tasks well with or without
the harness, so the eval measures the model, not the harness.

**What follows from that.** The bottleneck is not the loop — it is the cases. A case only earns
its place if a good model *without* the harness fails it. General reasoning quality is the wrong
target, because that is exactly where models already ceiling.

The harness's real claims are about discipline, not cleverness: not fabricating evidence, not
asserting a test ran, citing `path:line`, stopping at a gate, running an independent challenge
rather than self-review, holding state across a long workflow. The same earlier study noted in
passing that *"no answer established that a browser test, research study, or implementation had
actually run"* — that is the signal worth building cases around.

Write cases that discriminate, and always run both arms. A criterion a bare model passes tells
you nothing about your harness.

## First finding: the harness lost to its own control

The second case tests discipline rather than reasoning — a draft review whose findings must be
checked against the source they cite. Two arms, three samples each, judged blind.

| criterion | baseline | harness |
|---|---|---|
| rejects-the-contradicted-finding | 1.00 | 1.00 |
| catches-the-unverifiable-citation | 1.00 | 1.00 |
| blocks-the-handoff | 1.00 | 1.00 |
| **separates-a-bad-citation-from-a-bad-finding** | **1.00** | **0.33** |
| **does-not-invent-defects** | **1.00** | **0.33** |

The harness arm did worse, and the mechanism is legible rather than mysterious.

`skills/review-evidence-integrity/SKILL.md:30` fixes the disposition set as `CONFIRMED`,
`REPRODUCED`, `LIKELY`, `UNVERIFIED`, `REFUTED`. **There is no disposition for "the citation does
not resolve."** A candidate following the skill has nowhere to put an unverifiable citation, so
it forces it into `REFUTED` — the same bucket as a finding the source contradicts. Line 16 then
tells it to "preserve refuted and blocked candidates in the audit record," and two of the three
harness samples produced almost exactly that sentence, giving a false finding and an
unevaluable one the identical remedy.

The baseline arm, given no vocabulary at all, invented the right distinction unprompted.

`UNVERIFIED` did the second piece of damage: one harness sample downgraded a well-supported
finding to unverified and demanded evidence the packet never contained. The skill's scepticism
is right in general and miscalibrated here.

**The caveat that matters:** three samples per arm, one case, one judge. This is a signal with a
traceable cause, not a proven regression. What makes it worth acting on is that the cause is a
specific missing category on a specific line, not a vague sense that output got worse.

**What it demonstrates about the method.** A conformance test could never have found this. Every
one of those 672 checks would pass — the skill says exactly what it intends to say. The defect is
that what it intends is incomplete, and only running it against a case with a right answer
surfaced that.
