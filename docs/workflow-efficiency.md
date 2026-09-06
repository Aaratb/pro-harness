# Workflow efficiency

Keep disciplinary methods and independent challenge. Reduce repeated loading,
approval-only turns, duplicate validation, and repeated rendering instead.
The loading/recovery changes apply to Architecture, Review, and Explainer; they do not change
the public command taxonomy or add providers, agents, or a runtime engine.

## Loading and measurement

Load the command's common guidance once, one current phase, and only the skills,
references, canonical agents/overlays, and capabilities selected by that phase.
Reuse unchanged loaded guidance within the same context; reread it after context
loss or a contract change. Never drop a required discipline to fit a word quota.
Catalog existence/schema checks are deterministic maintenance checks, not an
instruction to copy entire catalogs or schemas into the model prompt.

The existing command validators bound **command-shell words** (global guidance
plus one phase), not full runtime context or actual model tokens. For an
explicit loaded-file set, use the optional, read-only maintainer helper:

```bash
node scripts/measure-workflow-context.mjs \
  --file commands/review-pro.md \
  --file skills/review-core/SKILL.md \
  --file commands/review-pro/routing.md \
  --file commands/review-pro/phases/05-review.md \
  --file skills/pre-merge-review/SKILL.md \
  --file skills/review-evidence-integrity/SKILL.md \
  --file agents/definitions/code-reviewer.json
```

Include every additional reference, profile, overlay, skill bound by an agent,
and capability actually read. The example is not an exhaustive runtime load.
The helper deduplicates paths and reports words/bytes, not model tokens. It
does not inspect host-injected instructions, tool output, repeated reads, or
repository evidence and is not another per-phase gate. Use runtime usage for
actual token accounting.

## Phase presentation across public commands

The first user-facing output on a fresh invocation is the **complete roadmap**:
every phase in canonical order, with number, name and a short purpose. Show it
before target inspection, artifact/state initialization, trace writes or agent
dispatch. No phase-file sweep is needed: each command carries its small phase
index. Show all phases even in focused modes, with honest applicability rather
than fabricated completion. The default then waits for `next` or `phase <N>`.
A supplied task description alone is not a starting-phase choice. An explicit
selection, identified resume or instruction to start/continue already supplies
the choice, but never suppresses the opening map. Validate prerequisites after
selection without silently performing unrequested upstream work.

Same-run `next`, worker returns, Ralph iterations and context recovery do not
repeat the opening prompt. `status` displays the map and known progress without
starting execution. Existing consent and evidence gates remain; the opening
choice is not a new approval loop at every phase.

After selection, every actual phase entry, revisit or resume starts with the
existing fenced three-line banner: rule, `Phase N/total: Canonical Name`, rule.
Follow it with a short purpose sentence before phase-specific tools or
artifact/state work. The roadmap is a preview, not evidence of phase entry.
Ordinary updates in the same uninterrupted phase do not repeat the banner.
Workspace Codemap remains unphased: show its complete work outline and offer
`next` or a named focus before its existing execution banner; never invent a
numbered phase contract.

The command bodies retain the entry rule directly; thin skill entrypoints defer
to it before loading methods. No extra runtime reference, renderer, state field
or hook is needed. Feature's index, governance and Ralph handoff preserve its
banner after context loss. Installed thin wrappers reread canonical sources;
an already-running conversation may need an explicit reread of the updated
command instead of assuming hot reload.

The requested map/choice text increases command-shell context slightly; no
disciplinary method was removed to offset it. Feature's active-word ceiling
is 5,900 (previously 5,500). Outcome and Customer main-command ceilings are
1,300 (previously 1,100); active ceilings are 2,450 and 2,500 respectively
(previously 2,200). Codemap's command-shell ceiling is 1,650 (previously 1,450)
including its work outline. These are bounded instruction-word checks, not
model-token measurements or a latency claim.

`tests/phase-presentation.test.js` checks all public command entries, exact
phase-map agreement with their contracts, useful purposes, selection rules,
pre-selection boundaries and retained banners. Text-generation exercises can
check sample responses; neither proves that every model will always render the
map/banner or that a native session refreshed its instructions.

2026-09-06: removing roadmap-only startup to reduce ceremony also removed the
user's chance to see and select the workflow. Do not repeat that trade-off:
retain one opening choice, then avoid repetitive approvals after selection.

## Validation and recovery

Each command's completion hook owns its covered validators. Do not execute the
same checks separately immediately before/after that hook. Source and output
changes, resuming a run, or changed authority invalidate the relevant earlier
proof; there is no cross-run cache of permission or success. Published course
generations remain immutable and source-bound.

Use the shared trace writer from the start of a run. Existing ordering-only
history can use the approved continuation described in
`skills/observability-by-design/references/workflow-tracing.md`. It preserves
history and exposes `recovered-with-gaps`; it cannot certify work, grant
authority, hide privacy failures, or fabricate missing approvals.

## Proof before speed claims

Run deterministic regression tests for reduced-mode output requirements,
atomic batched publication, source/dependency invalidation, retained independent
verification and approvals, and trace recovery isolation. Then replay one small
and one substantial task per changed command in each target runtime. Compare
time to first useful result, wall time excluding human waiting, actual loaded
files/tokens, agent calls, publication/validator calls, and the same quality
rubric. Include a missing-dependency and trace-error case. Do not trade away
evidence, security, design reasoning, or honest uncertainty for a shorter run.

Static tests establish contract behavior, not end-to-end model quality or a
promised latency reduction. A runtime pilot remains necessary.

## Visual direction through fresh workers

2026-09-06: design-taste wording and text-only evaluations did not establish
rendered quality or reliable transfer into fresh implementers. Do not repeat
that inference. Feature Pro now carries the selected visual artifact and its
defining decisions through existing design notes, tasks and Ralph work briefs.
For new visual language or material redesign, inspect a representative rendered
screen before propagating its patterns. Small changes reuse a current sound
direction and inspect only the changed portion. No new document family, phase,
provider or fixed aesthetic is required.

Ralph remains bounded execution of approved tasks, not the design authority.
Keep a coherent screen or interaction together where practical; the coordinator
preserves the direction while workers get fresh context. Existing budgets,
permissions, phase banners and later gates remain. A missing render cannot
become visual approval: stop dependent visual expansion or record an explicit
waiver; unrelated nonvisual work may continue. Runtime/QA compare with the
selected reference and reuse current evidence, not approve a new screenshot
baseline merely because the code works.

Phases 5 and 8 reuse the existing browser route. The coordinator supplies
captures when implementation workers lack browser access; worker profiles are
not expanded. Canonical Feature Pro dispatch loads current definitions/skills.
Generated standalone native-agent adapters are snapshots and require their
normal regeneration when installed separately; do not assume hot reload.

Catalog/adapter tests establish resolvable design bindings; bounded text probes
can examine handoff decisions and evidence claims. Neither proves attractive
rendered outcomes. Validate that with a real feature from selected direction to
implemented screen, including independent visual critique and user judgment.
