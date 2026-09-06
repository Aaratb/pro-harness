# Deterministic fixture verification

## Engineering fixtures — 2026-09-06

**Result: PASS for the bounded seed-fixture checks below. This is not a model/workflow quality result.**

Inputs: [engineering cases](cases/engineering.json) and [separate engineering rubrics](rubrics/engineering.json). Verification used only freshly materialized authored seed files at `/private/tmp/pro-parity-fixtures.ZeGQhx`, never actor-modified workspaces. An additional `review-small-base` copy supplied the pre-change control. Cases, rubrics, production harness sources and live home configuration were not edited.

Runtime: **v26.5.0**. No packages, providers, model sessions, servers, browsers or network calls were started. Existing package-script implementations ran directly as local Node commands: `node --test <fixture test files>` and `node scripts/build.mjs`; this does not claim an npm lifecycle or cross-version test.

### Coverage

| Case | JS syntax | Import references | Existing tests | Declared build implementation |
|---|---:|---:|---:|---|
| feature-small | 6/6 | 11/11 | 4/4 | PASS |
| feature-substantial | 7/7 | 12/12 | 2/2 | PASS |
| architecture-small | 6/6 | 11/11 | 2/2 | PASS |
| architecture-substantial | 5/5 | 7/7 | 2/2 | PASS |
| review-small | 5/5 | 8/8 | 3/3 | PASS |
| review-substantial | 7/7 | 10/10 | 4/4 | PASS |
| **Total** | **36/36** | **59/59** | **17/17** | **6/6** |

Import checks resolved static relative targets and recognized Node built-ins; executed tests and probes also loaded their real dependency paths. This is not a general dynamic-import analyzer. Build implementations perform the fixture-declared JavaScript syntax checks, not production bundling.

**11/11 additional baseline/oracle probe groups passed:**

- Feature small: unfiltered Mina CLI output remained T1/T2/T5; the requested `--due-before` flag is absent in the baseline and exits 1; existing shared functions already supply owner filtering, exclusive cutoff, no-date/completed exclusion and invalid-date rejection.
- Feature substantial: both normal draft cases resolve valid synthetic references; unavailable mode rejects; invalid mode returns its deliberate malformed shape; unsafe mode contains literal HTML/action text. Server/helper modules import without listening. These are five stub cases, not real-model quality or UI safety evidence.
- Architecture small: existing formatter prints the expected invoice representation and total of 25,000 cents.
- Review small: the base control returns 404 for Amber requesting Blue's B-002. The working seed returns 200 with Blue's invoice and total of 22,000 cents, reproducing the dropped tenant guard. Zero-tax, missing-session and unknown-ID controls behave as documented.
- Review substantial: same client key/payload across tenants returns Amber's prior reservation to Blue (200, remaining stock 1, one reservation). Two concurrent requests against one unit both return 201; final stock is 0 but two units are confirmed. Quantity/session/body-tenant guards and escaped preview text remain correct.

All 59 files in the six prepared case snapshots retained their bytes through their syntax/test/build pass. The canonical case/rubric hashes were identical before and after the complete checker:

| Input | SHA-256 |
|---|---|
| `cases/engineering.json` | `8c5d3f100f3fca14c3026cfeb3ac5b8425e1b3557efcc20ddd3b64ff899e4729` |
| `rubrics/engineering.json` | `c2ed181a859b6302c5055461bf899338b108e97e193238ec7354f0cfe75bb688` |

### Checker corrections and limits

The scratch checker initially had an over-escaped regular expression and did not execute fixtures. Its next pass executed all fixture tests/builds/probes successfully but misclassified prefix-only `node:test` imports. Correcting the scratch checker to recognize both Node built-in naming forms produced the final exit-0 result above. Neither issue required a fixture or production change; do not count those checker mistakes as actor failures.

Not performed: actor implementation grading, command/agent execution, native selectors, UI render/taste, HTTP/API additions, Git/HEAD/unborn binding validation, artifact-schema completion, Node 20 compatibility, production performance or recovery measurements. Existing tests intentionally miss the seeded Review defects; their green result is not a product-readiness verdict. The independent probes establish fixture ground truth only, not that an actor found or reproduced it.

Reproducible scratch checker: `node /private/tmp/pro-parity-fixtures.ZeGQhx/verify.mjs`. It performs bounded read-only checks against the disposable seed snapshots and prints its results; the scratch directory remains available for inspection.
