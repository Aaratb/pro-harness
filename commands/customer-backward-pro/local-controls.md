# Local research checks

These Node helper calls do no source I/O, acquisition, dispatch or artifact writing; packet-module initialization reads only the bundled route contract. Invoke only with approved minimized in-memory data; the caller owns loading, authorization, privacy, output and actual runtime controls. They do not authenticate supplied permission records, identify personal data, prove independence or certify research quality.

## Evidence packets

Import `prepareResearchPacket` from `scripts/lib/customer-research-packet.mjs` using the canonical `HARNESS_ROOT`. It accepts `(request, context)`. Read the module's exported contract and a minimal fixture in `tests/customer-research-packet.test.js` when constructing a packet; do not infer missing source content or grants from an example.

The request uses `customer-backward-pro/packet-request@2`, canonical `role`, exact `skill` and `research_mode` from `contract.json` → `capability_routes`. Context binds separately reviewed sources, company/study scope, allowed roles and `allowed_research_modes`, byte/count limits and available lineage/corrections. A broad analyst role alone does not authorize all modes. The returned worker packet uses version `customer-backward-pro/worker-packet@2`. Historical request/output versions are not silently accepted.

The helper checks supplied byte identity, selection, limits and declared lineage. It neither follows source locators nor verifies their external content. Retain `validation: local_contract_only`, `execution_allowed: false`, and `independence: not_verified_by_validator`; dispatch is the coordinator's separate authorized decision. A failed check is not a usable prepared packet. Omitted or unavailable originals remain unavailable, not synthesized.

The runtime worker assignment separately includes the explicit `artifact_root`; it is not permission to read arbitrary project files or write within the root. The source access scope and output location are different boundaries.

## Protected-operation proposals

Import `preflightResearchOperation` from `scripts/lib/customer-research-operation.mjs`; it accepts `(request, trustedContext)`. Use real supplied organization approval, participant permission scopes, exact operation binding, time and completion history. The request format remains `customer-backward-pro/operation-request@1`; inspect the module and focused test fixture for exact fields before invocation. Never manufacture timestamps or policy to make a proposal pass.

The result is `blocked`, `reconcile`, `already_completed` or `ready_for_adapter_review`, always with `execution_allowed: false`. Recording permission is not transcription, transfer, quotation or publication permission. A timeout/partial outcome is not safe evidence for a duplicate operation. No live executor, durable operation log, concurrency lock or cancellation mechanism is implemented here. This command does not perform protected operations.

Do not run either helper simply to fill a checklist. Use the packet check for its actual handoff guarantee and preflight for a relevant protected proposal; ordinary approved public searches and small inline notes need neither a fabricated organization grant nor another state system.
