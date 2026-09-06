# Representative observed outputs

These are actual public assistant outputs from synthetic native CLI trials, not exemplar answers written by the evaluator. They illustrate final-answer usefulness, not the entire interaction, completed workflow assurance or Feature parity. Full transcripts, tool evidence and grading limitations are retained separately. No screenshots or native selector observation were completed.

## Outcome — small delivery-register case

Claude, final supplied follow-up:

> Two of the four changes planned for the August pilot (search shortcut and CSV column labels) shipped on 2026-08-20; saved export filters were moved out of scope on 2026-08-18, and reminder wording is built but not yet deployed to the pilot.

Codex, final supplied follow-up:

> We shipped two of the four changes originally planned for the pilot; one was deferred and one is complete but not yet deployed.

Both correctly reject “everything shipped” without conflating implementation with deployment. Independent diagnostic grades: Claude 8/10, Codex 9/10; the difference reflects interaction/minimality criteria as well as the correct central conclusion.

## Customer — small biased-notes case

Codex, final supplied follow-up:

> These notes don’t show customers asking for a receipt assistant. They show prompted interest, while current search/export worked in both operator examples and the buyer wouldn’t pay extra. Demand remains unvalidated; next, test neutral recent cases where receipt work caused measurable time or cost.

This is a bounded team note, not a claim of population-wide demand or a completed research study. The independent grade found 10/10 for this case. The paired Claude candidate retained the same central nonvalidation conclusion but scored 7/10 for over-expansion, unsupported source-context details and an overlong handoff. See the complete grade rather than treating the single excerpt as comparative proof.

## Roadmap — human disagreement and selection

Codex, final supplied follow-up:

> Current decision: Select `R2 — Invoice notes` only for the pilot team. Keep `R1` unselected and `R3` deferred. Retain R2’s Product Note exactly as written.
>
> Pending: feature definition/PRD, feasibility, dependencies, estimates, staffing, and delivery timing. No files were changed.

The decision and note protection are correct. The run nevertheless scored 6/10: the broader transcript traversed disproportionate phases and claimed independent-review completion without sufficient observable execution support. A polished final paragraph is not enough to pass assurance criteria.

## Feature — explicit approval boundary, not a finished feature

Codex's corrected-profile reference attempt reached:

> Phase 2 is ready for its required approval gate.
>
> Proposed business requirement: before local handoff, all specified cutoff-filter cases must pass, and the existing owner-only output must remain exact. The requester/repository owner is the acceptance owner.
>
> Approve this requirement? Reply `approve` or provide a correction.

The intervening link to the actual requirements artifact is omitted from this excerpt; it is retained in the transcript. This demonstrates an understandable approval boundary, not implementation or complete reference quality. The paired Claude execution was interrupted by its model quota.
