# Phase 6 — Reproduction

Read the causal-experiments reference. Build the smallest exact feedback loop, escalating through its ten options only as necessary. Observe, minimize, improve determinism, and retain a real pass/fail result.

Match reported symptom, first-hand observation, available signature, and loop assertion. Reject a nearby failure. For a static-only claim, use the deterministic violation and output rather than inventing runtime telemetry.

Record argv, CWD, output, actual exit code, process identity and relevant source fingerprint. For flaky behavior, measure failures/trials and choose adequate trials; never describe reliability by an adjective or one lucky run.

Preserve relevant session, state, ordering and dependency conditions while minimizing; a mock that removes the failing boundary proves a different scenario. For an affected AI surface, use `ai-product-engineering` to separate deterministic tool/authorization/contract failures from probabilistic quality. Capture relevant model, prompt, retrieval and fixture versions without protected content. A single bad or good output is not a population-quality estimate; keep unaffected cases for later regression comparison.

If no safe exact reproduction is reachable, record attempted approaches and deliver a detector, observation recipe or precise access request as appropriate. Unreproduced behavior cannot enter permanent repair.

Gate: exact reproduction is observed, or a durable incomplete result goes to Phase 13.
