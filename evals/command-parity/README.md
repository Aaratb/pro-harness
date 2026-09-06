# Feature Pro quality-parity audit

This maintainer-only audit compares the nine current public commands in Claude and Codex against Feature Pro's interaction and outcome-quality standard. It is not runtime instruction material. No production command, skill, agent, hook, provider, schema, installer or live configuration is changed by this audit.

Current result: [partial audit report and scorecard](REPORT.md). Native evaluation is incomplete because Claude's selected model reached its usage limit. See [recorded execution](execution.md), [Architecture visual findings](architecture-visual-findings.md), [source findings](source-findings.md), and `grades/`. Machine-specific raw evidence is maintainer-only; do not include it in a public plugin distribution without review.

## Approved design

- Synthetic inputs only; one small and one substantial case per command/runtime, giving 36 initial runs including Feature Pro references.
- Run small cases before substantial cases. Permit at most two additional fresh attempts for failed or inconclusive pairs; retain all attempts and infrastructure failures.
- Preserve each command's job and phase structure. Do not equate quality with length, agent count or Feature's twenty phases.
- Freeze canonical inputs and runtime bindings. Actors see only their case, actual command entrypoint and authorized synthetic workspace, never hidden rubrics or other answers.
- Use predefined user replies without rubric-informed coaching. An unavailable reply or unresolved permission remains a limitation, not fabricated approval.
- Report observable method/agent execution separately from self-reported workflow traces. Never retain private reasoning, credentials or hidden model payloads.
- Evaluate outcome with five command-specific criteria, each 0 absent/incorrect, 1 partial/generic, 2 concrete/correct. A diagnostic pass requires at least 8/10, no zero and no critical failure. Report experience independently.
- Native selector rendering requires an observed interactive session. Headless success does not prove graphical or terminal UI fidelity. Rendered visual judgment does not prove human learning or user acceptance.

## Boundaries

Cases may create or modify only their disposable synthetic repository and its workflow artifacts. No real customer data, production access, public research, package installation, network-connected product behavior, releases, live home configuration edits or historical-source edits are authorized. The authenticated model service transport is necessary for the requested native-runtime trials; it does not authorize research or application network access.

Maintainer case definitions live in `cases/`; rubrics and deterministic ground truth live separately in `rubrics/`. Do not copy rubrics into actor workspaces. Raw redacted execution evidence and frozen source copies are held in the recorded temporary audit root; reports retain their exact identity and limitations.

The fixture container is `{ "version": 1, "cases": [...] }`. Each case names `id`, `command`, `size`, `prompt`, fixed `followups`, `base_files`, `working_files` and `unborn`. The preparer initializes an isolated Git base unless `unborn`, then applies working changes. An optional `later_file_changes: { "turn": N, "files": {...} }` applies immediately before the Nth follow-up; initial invocation is turn zero. Unreached changes are not counted as a completed refresh test.

The rubric container is `{ "version": 1, "cases": { "case-id": { "criteria": [...], "critical_failures": [...], "oracle": {...} } } }`. Keep grading independent of fixture authors where possible, with command/runtime labels hidden during first-pass judgment. Report every observed attempt, not only the strongest output.

## Runtime references

Execution flags must be verified against installed `claude --help` / `codex exec --help` and their official documentation, not guessed. Session-only restrictions preserve user settings; generated test configuration is not installed globally. References: [Claude settings](https://code.claude.com/docs/en/settings), [Codex configuration](https://learn.chatgpt.com/docs/config-file/config-reference).

Final verdicts are supported in tested cases, gap, inconclusive or blocked. They are not universal equivalence, calibrated probabilities, production readiness or automatic approval to change the harness.
