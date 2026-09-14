# Context budgets — why they are what they are

Each `*-pro` command is validated against three budgets in
`scripts/validate-<name>-command.mjs`:

| Budget | Checks |
|---|---|
| `activeWordBudget` | `global_context` + the current phase file |
| `mainWordBudget` / `mainLineBudget` | the main command file |

`workspace-learning-pro` has a fourth, for phases whose mandatory reference documents load
alongside the phase.

## The rule

```
activeWordBudget = max(current, global_context + largest_phase + 600)
mainWordBudget   = max(current, current_words + 250)
mainLineBudget   = max(current, current_lines + 40)
```

**A floor, never a cut.** Re-derive when `global_context` or the largest phase grows. Never
trim prose to fit a budget — that is how instructions and machine-asserted phrases get lost.

`scripts/check-budget-headroom.mjs` runs inside `npm run validate` and fails below **300
words** of headroom, so the margin is visible while there is still room to act.

## Why 600 words of room

On 2026-09-10 a single commit tripped three checks at once — main-command words, phase active
context, and a semantic assertion — because every phase sat within a few words of its ceiling.
`workspace-learning-pro` Phase 3 had **4 words** of headroom; `architecture-pro` Phase 9 had
16; `debug-pro` 24. Two commands were 6 words from their main-command budget.

The failure mode is worse than the arithmetic. Budget errors mask semantic ones: the
`missing or unhealthy native MCP must preserve state` assertion had been broken by a reworded
sentence, and did not surface until the word counts were fixed.

## Relocation: investigated and rejected

Global context consumes 66–91% of every budget, and it is paid every session whether or not
the phase it serves ever runs. Moving phase-specific content out of global files into their
phases would be a real per-session saving — for `architecture-pro`, `audit` mode never runs
phases 7–8 and `design` never runs phase 4.

It does not survive inspection:

- **Every one of the 22 global files is read by name** by some validator or test, so a
  relocation is only safe block by block. `harness-test-cases/architecture-pro-efficiency.test.js:74-79`
  reads `commands/architecture-pro/routing.md` and asserts four phrases live *in that file*.
- **The candidate blocks are not phase-local.** `## Core ownership` mentions phases 7–8 but
  its routing table reads "Every certifiable run" and "Material persisted or event data".
  `## Capabilities and consent` spans phases 2, 7, 9 and 12. `## CodeQA route` is referenced
  by 5 of 8 phases. Counting phase *mentions* is a poor proxy for phase *specificity*.

There is also nothing to compress: across all nine commands, **26,497 words of global context
contain 13 near-duplicate sentence pairs**, with a 15-word mean sentence and almost none over
35 words. It is dense instruction, not padding.

## What is still open

34 sentences repeat across two or more commands, **16 of them in seven to nine of the nine** —
the invocation roadmap, banner rules and entry-choice text. A shared global layer would remove
that duplication. It would not reduce per-session tokens, since one command runs per session,
but it would cut the maintained surface and every command's measured global size.
