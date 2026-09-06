# Customer Backward Pro

Use `/customer-backward-pro` in Claude/Cursor or `$customer-backward-pro` in Codex after installing the updated bundle. The canonical command, not a copied runtime-specific workflow, owns the behavior.

Start with a decision, question or supplied evidence. Use `--phase <1..8>` for one stage or `--capability <selector>` for exactly one method. When both are supplied they must map to the same phase. The eight phases are a navigation map, not eight compulsory workloads. The complete selector map is in [the command contract](../commands/customer-backward-pro/contract.json).

Examples:

```text
/customer-backward-pro We think small agencies struggle with invoice follow-up. Help us frame what to learn first.
/customer-backward-pro --capability interview-design Draft an interview from the supplied research question.
/customer-backward-pro --capability evidence-audit Check which claims these anonymized notes actually support.
```

The sixteen reusable methods retain their detailed research reasoning and load references only for the problem at hand. Existing Outcome query/measurement references and experiment analysis are reused as optional lenses; running Outcome Pro is not a prerequisite. Two canonical read-only roles replace separate roles for each discipline. One fresh independent actor challenges consequential recommendations; simple instruments and summaries do not trigger a review swarm.

## Output and authority

Chat-only work stays inline. Saved work uses `.agents/research/<study-slug>/` beneath the owning Git repository or an explicitly selected non-Git project. The read-only root resolver rejects guessed home/harness roots and path escapes. The coordinator creates the directory, rechecks containment before writes, and owns `research.md` plus shared `run-events.jsonl`. Add only necessary instruments or calculation records. Workers receive the explicit root but cannot write.

Supplied evidence does not need a provider. The coordinator uses existing Firecrawl-first public research and conditional Exa capabilities when authorized. This command does not execute warehouse queries, customer outreach, recording, transcription, transfers, experiments, publishing or product delivery. Public acquisition never receives private customer data.

The optional packet helper checks in-memory selection, declared lineage, limits and byte identity. Its version-2 assignment binds the research mode, skill and agent; historical version-1 packets are not silently accepted. Protected-operation preflight remains inert at version 1, including when ready for later adapter review. Neither helper establishes consent, source truth, independent participants, runtime isolation or market validity. See [local controls](../commands/customer-backward-pro/local-controls.md).

## Verification scope

Focused tests cover route resolution, preserved methods, local evidence/operation controls, selected-project paths, shared trace lifecycle and generated adapters in temporary homes. Structural tests cannot prove research quality. Synthetic forward exercises can test particular reasoning and user-experience cases; they do not establish live connector behavior or host-enforced isolation. No live customer acquisition or native-runtime research run is implied by a passing import test.

Three fresh-context synthetic exercises were run during import, using the actual command and selected methods rather than reviewer summaries:

| Exercise | Observed result |
|---|---|
| Evidence-free, 20-minute agency-owner interview | Produced an immediately usable instrument with neutral episode questions, consequence versus annoyance probes, rival causes, no-overdue branch, time-box fallback and explicit untested status. No fabricated interviews, setup or recruitment. |
| Audit of two interviews, a derivative sales recap, support-tagged CRM counts and an interviewer correction | Rejected the unsupported population/positioning conclusion; did not count the recap as a third customer, missing tags as negatives, or mixed bookkeeping time as reminder-only cost. Retained the surviving episodes and named unavailable row-level evidence. |
| Reminder-use aggregates across two segments and windows | Executed local arithmetic: established use 24/80 → 6/20 stayed 30%; new use 12/20 → 48/80 stayed 60%. Identified the pooled 36% → 54% change as composition, with no claim of individual retention or causal UI effect. |

Each loaded only its selected method and necessary references, kept the phase number/name visible on entry, and stayed inline without external operations. These are three bounded smoke exercises, not a statistical evaluation of all sixteen methods, all runtimes or full multi-phase research. Independent code review separately checked the local boundaries and integration; it is not customer-research validation.

A subsequent [disciplinary-depth evaluation](../evals/customer-backward-pro/results-2026-09-05.md) audited all sixteen methods, independently graded twenty standalone attempts and exercised a connected study with a fresh challenge and material source correction. It justified three localized method refinements without expanding the main command or runtime machinery. The report preserves minor partial results and version boundaries; passing these synthetic cases does not replace real research or user acceptance.

Import and activation are separate: adding these canonical files does not regenerate the user's existing Claude, Codex or Cursor discovery entries. Update installation only when ready; leave unrelated commands, skills, agents and hooks intact.
