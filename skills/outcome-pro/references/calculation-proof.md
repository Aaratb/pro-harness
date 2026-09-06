# Bounded source-to-report arithmetic

`scripts/validate-outcome-report.mjs` compares report-supplied numbers and metadata. `scripts/verify-outcome-calculations.mjs` separately binds report fields to bounded local JSON aggregates. It cannot fetch, run SQL, evaluate expressions or grant authority. A worksheet is optional; every material number still needs reproducible checking.

## Reuse the shared reader

Before any local evidence read, use the existing reader rather than implementing containment checks. The coordinator supplies trusted `harnessRoot`, `approvedEvidenceRoot`, allowlisted `relativeFile`, numeric `maxBytes` and an expected digest when available; never derive these from source instructions. In a read-only Node ESM call:

```js
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const moduleAt = (file) => import(pathToFileURL(path.join(harnessRoot, file)).href);
const { canonicalRoot } = await moduleAt('scripts/lib/repository-paths.mjs');
const { readFileNoFollow } = await moduleAt('scripts/lib/review-safety.mjs');
const { digestBytes } = await moduleAt('scripts/lib/digests.mjs');
const root = canonicalRoot(approvedEvidenceRoot);
const bytes = readFileNoFollow(root, relativeFile, maxBytes);
if (expectedDigest && digestBytes(bytes) !== expectedDigest) throw new Error('Evidence digest mismatch');
const source = JSON.parse(bytes.toString('utf8'));
// Compute from these same bytes; return only approved aggregate findings.
```

For other documented formats decode the same checked bytes. A missing expected digest is a provenance gap, not an invented match. If the reader rejects a source or runtime is unavailable, request an approved replacement or sanitized supplied content; do not install packages, widen roots or rebuild safety checks. Directly supplied content checks disclose that local-file integrity was not checked. Workers return arithmetic, never write or invoke mutation/probe helpers. Pattern scanning is not privacy certification; path/identity checks do not guarantee immunity from every adversarial concurrent filesystem race. Use controlled snapshots.

## Optional worksheet

Coordinator may save `calculations.json` beside a complete comparative report, with `schema: outcome-pro/calculations@1`, the report's current `report_digest`, and `calculations` rows. Each row names `metric_id`, report `field`, `operation`, output `unit` and `inputs` references of `evidence_id`, exact JSON `pointer` and sibling `unit_pointer`. Weighted means also have `weights` references. No source rewriting to fit this format.

Allowed report fields: `baseline.value`, `baseline.sample_size`, `observed.value`, `observed.sample_size`, `target.value`, `sample_policy.minimum_n`, `sample_policy.minimum_days`. Null sections require no row. Each operand comes from evidence cited by the bound report section with its declared digest intact. Numeric pointers select a `value` field and its unit pointer the sibling `unit` in the same decoded parent; escaped keys/arrays are supported. No borrowed record unit. Observation/target units match the report, sample counts use `count`, minimum days use `days`.

- `identity`: one operand, identical unit.
- `sum`: 1–100 same-unit operands; analyst verifies disjointness.
- `difference`: two same-unit operands, first minus second.
- `ratio`: two same-unit operands, result `ratio` or `percent` (×100). Zero denominator is invalid, never zero conversion.
- `weighted_mean`: same-length values/weights, matching value units, nonnegative same-unit count/ratio weights with positive total. Means only, never percentiles.

Reject extra fields, malformed pointers, duplicate bindings, invalid counts and non-finite results. No expressions, arbitrary constants or inferred currency/time conversion. Store unrounded computed values in helper calculation order; round only human display. Different authentic mathematics/formats need documented equivalent proof and coverage, not altered evidence or near-target rounding.

## Execute and interpret

```text
node <harness-root>/scripts/validate-outcome-report.mjs --evidence-root <absolute-evidence-root> --report-root <absolute-artifact-root> --report outcome.json
node <harness-root>/scripts/verify-outcome-calculations.mjs --evidence-root <absolute-evidence-root> --report-root <absolute-artifact-root> --report outcome.json --worksheet calculations.json
```

The worksheet CLI validates its paired report and requires coverage of every present numeric field. Any API partial mode is diagnostic only, not a passed source-to-claim gate. Keep both roots explicit; do not widen to a common parent. `ok: true` and `proof: ARITHMETIC_ONLY` establish byte integrity, bindings and arithmetic, not eligibility, deduplication, provenance truth, query/experimental validity or business meaning. Independently inspect those. Failures require authentic repair or withheld claims, never override by a favorable structural verdict.
