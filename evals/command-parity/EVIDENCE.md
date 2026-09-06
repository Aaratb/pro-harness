# Evidence retention and reproduction

This is machine-specific maintainer evidence, not public runtime material. Do not automatically ship the raw bundle in a plugin: it contains local paths, synthetic prompts, runtime/session identifiers, tool outputs and withheld grading material. No actual customer data was used. Public text excludes hidden reasoning fields; a bounded credential-pattern scan also passed, but is not a complete privacy guarantee.

`evidence.tar.gz` retains the frozen canonical/dependency/adapter bytes and manifest; discovery calibration; readiness probes; installed-profile trials; anonymized grading packets and separate mappings; original fixtures/rubrics/grades; and the disposable evaluation scripts. `evidence-manifest.json` records archive SHA-256 and size. The archive is historical evidence, not an executable installer.

The original scratch root is `/private/tmp/pro-parity-audit.1Lnfhp`. Each `installed-v1/<case>-<runtime>-<attempt>/` directory contains:

- `actor-case.json`: the case supplied, without its hidden rubric.
- `run.json`: fixture hash, actual session, exposed model/settings, per-turn timing/state.
- `turn-N/user.txt` and `invocation.json`: exact predefined reply and native invocation.
- `turn-N/events.jsonl`: timestamped redacted native event export; missing events remain missing.
- `turn-N/assistant.md`: public assistant output, including forwarded worker text where the runtime exposed it. A forwarded claim is not itself proof of independent execution.
- `repo/`: disposable synthetic source and actual artifacts. Git object directories are excluded from the archive; fixture definitions and recorded baseline hashes preserve input identity, not a reconstructed signed Git history.

The `frozen/` directory and `freeze.json` bind source bytes. The temporary scripts contain this machine's paths; do not run them against another home or with broader permissions unchanged. Reproduction requires fresh isolated repositories, a new declared runtime profile and authorized native access. Never execute expected answers or make grading packets visible to actors. Preserve prior packets and failed attempts when adding evidence.

Engineering ground-truth checks are also retained as `pro-parity-fixtures.ZeGQhx/`, copied from their independent disposable seed workspace. They validate fixture mechanics, not actor outputs. Main command validation and 102 focused regression-test logs remain adjacent to this document.

Current limitations: Claude quota interrupted the paired evaluation; substantial cases, rendered screenshots, native question controls and external release stages are unperformed. Consult `REPORT.md`, not process exit codes, for the actual quality conclusions.
