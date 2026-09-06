# Architecture visual delivery — scoped verification

Date: 2026-09-06.

This is an authorized implementation after the command-parity audit, not a revision of that frozen audit. Its cases, evidence and historical conclusions remain unchanged. The fixture here is hand-authored synthetic architecture material, not an output from a new Claude or Codex workflow trial.

## Change and evidence

- Architecture reuses the existing offline renderer through an opt-in companion path. Its phases, run-state schema, consent boundaries, and other commands' default companion behavior remain unchanged.
- New instruction regressions failed before the update; the Architecture, phase-presentation and skill-quality checks passed afterwards.
- Companion regressions failed before implementation. Independent review then identified inert-markup and disclosure gaps; new tests reproduced them before correction. The final seven helper tests pass, and a fresh reviewer recheck confirmed both last disclosure cases are rejected.
- The final full `npm test` run completed with **583 tests: 582 passed, one failed**. The failure is the existing distribution hygiene test, which scans all saved content and encounters machine-specific paths in the earlier `evals/command-parity/` reports and evidence. That material was not changed or deleted to make this run green.
- The Architecture command validator passes with 13 phases and a compact 1,427-word entry. The generated example also passes companion validation with `--render-diagrams`.
- Active Claude and Codex entrypoints were inspected: both already resolve the canonical installation. No activation, home configuration, provider, or historical-source change was made.

## Direct visual inspection

Opened the generated HTML in a local browser without external assets. Inspected the baseline, change overlay, and sequence diagram as rendered images, including participant/message direction and the invalid/valid branches. The example preserves the existing export path, identifies proposed changes on nodes and connections, and distinguishes proposal from observed behavior.

The initial example's dense labels were shortened without dropping relationships. Opening a full-size diagram initially widened the page; the opt-in layout was corrected. At the observed 934-pixel viewport, page width remained 934 pixels, all six overview/full-size images loaded, and diagram sources remained collapsed. Section navigation and disclosure expansion/collapse were exercised.

A narrower observation reported a 560-pixel viewport with matching page width and horizontal scrolling contained inside the full-size region. A requested 375-pixel override did not produce a valid visual capture; that breakpoint is **unverified**, not passed. Keyboard-only disclosure operation was not established in this check.

Tool screenshots were inspected directly during execution. No screenshot archive is supplied here; the reproducible self-contained artifact is [EXPLAIN.html](EXPLAIN.html), generated from [EXPLAIN.md](EXPLAIN.md).

## Limits

Structural validation, safe rendering, visual inspection and user understanding are separate evidence. These checks establish the scoped helper behavior and instruction wiring, not future model compliance, architecture correctness for a real system, native runtime interaction parity or human comprehension. No new end-to-end Claude/Codex trial or production release was performed.

## Collaboration follow-up — 2026-09-06

The subsequent user-authorized change makes visual co-design explicit in the existing command, routing and phase instructions. Provisional shapes precede detailed comparison when intent is unsettled; meaningful answers change visible boundaries/contracts. The existing question method is now available at context, audit synthesis, deep design and walkthrough checkpoints as well as intake, options and decision. It is loaded only for unresolved user-owned trades.

Six instruction regressions failed before implementation and passed after it. Independent review identified two edge cases: clarified intent versus verified current behavior, and a material correction in a mode with no legal return. Both are explicitly addressed; a further failing return-path assertion passed after correction, and the reviewer confirmed no remaining scoped blockers.

Final focused verification: **73/73 tests passed** across collaboration, Architecture depth/efficiency/behavior/import and phase presentation. `npm run validate` passed all command and catalog validators. The entry is now 1,454 words; the existing 1,600-word entry and 4,200-word active-context ceilings were not raised. The previous full-suite result above belongs to the earlier visual implementation; the full suite was not rerun for this instruction-only follow-up.

No phases, state schemas, agents, providers, renderer behavior, policy transitions, home configuration or frozen parity evidence changed. Active Claude/Codex wrappers still resolve the canonical command. The documentation's conversation example is illustrative, not a new runtime trial. Actual conversational quality and native question-control fidelity remain unverified in fresh end-to-end sessions.
