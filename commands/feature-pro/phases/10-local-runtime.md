# Phase 10: Local Runtime Gate

> Load this file only when this phase is selected or resumed.

- **Skills**: `browser-exploration`, `browser-qa`, `webapp-testing`, `workspace-codemap-context`; add `browser-session-setup` only for authenticated flows, `observability-by-design` for runtime evidence, and `ai-product-engineering` only when the AI overlay activates
- **Capabilities**: resolve `browser.navigate`, `browser.inspect`, and `browser.capture`; authentication setup must not expose credentials in artifacts.
- **Purpose**: prove the built UI/API beyond Phase 9's contract-level seam check; give the user a tested URL and safe sample data before review, QA or deploy.
- **Auto-skip when**:
  - feature has no user-facing runnable surface, whether UI or API (pure infra, library-only, migrations-only)
  - all touched apps lack a working local dev server *and* the user explicitly opts out
  - the `erd.md` blast-radius table contains no FE entry point and no API the user can hit locally
  - announce every auto-skip; never silently skip
- **One user-facing port — host-shell first**:
  - For micro-frontend (Module Federation) apps, expose a **single** clickable host-shell URL (e.g. `http://localhost:8080`). Remotes use their own ports, but **the user opens the host shell**, which loads them. Never substitute a raw remote port.
  - For non-micro-frontend apps, expose the app's own dev port as the single URL.
  - Always print the URL in the phase summary so the user can click it directly.
- **Inputs**: touched-application list from `erd.md`, repository-owned and application-specific codemaps for everything touched, and any prior `state.json` `local_runtime` block.
- **Workflow**:
  1. **Detect the local stack** from the codemap + `erd.md`. For each touched app, resolve:
     - which **host shell** loads it (for micro-frontend apps)
     - the **remote ports** the host shell expects
     - any required adjacent remotes the feature touches
  2. **Run repository-native setup checks first.** Check prerequisites, auth, dependencies, host configuration, ports, and HTTP in dependency order. Fix the first failing stage before trusting a later stage.
  3. **Check existing processes, listeners, and runtime-visible terminal sessions before starting servers.** If a dev server for the required app/port is already running, **reuse** it instead of spawning a duplicate.
  4. **Start the missing servers** non-blocking (background), one per terminal: host shell, then each required remote. Wait until each port reports listening before moving on.
  5. **Verify HTTP**: the host-shell URL returns 2xx, each `remoteEntry.js` is reachable, and no console errors block boot.
  6. **Discover the API before asking**: inspect routes/specs/tests/configuration and update the Phase 8 verification contract with endpoints, methods, schemas, auth, base URL, and sample-data requirements. Ask the user only for missing external API documentation/access, a runnable URL that cannot be derived or started, and safe representative sample data that cannot be generated from fixtures. Never request credentials in chat or artifacts.
  7. **Exercise the built surface**: for UI, use `browser-exploration` then `browser-qa`. For APIs, execute at least one happy path and the most important auth/validation/upstream failure path using safe sample data. Capture real request/response status and redacted evidence under `.agents/features/<slug>/runtime/`.
     - **Visual acceptance for UI changes**: compare current renders against the selected direction at relevant states/viewports; reuse source-current Phase 9 evidence. Record concrete drift/corrections separately from functional/accessibility results in `runtime/local-evidence.md`. Never overwrite references to bless mismatches. Resolve material drift before a visual pass; absent rendering or explicit waivers remain unverified, not passed.
  8. **Check the sequence diagram**: compare the observed call/trace order with Phase 8's intended sequence, including authorization, data/external/AI boundaries and correlation propagation. Update `erd.md` or write `runtime/observed-sequence.md`; any unexplained divergence is a finding, not a diagram edit to hide drift.
  9. **Hand the user the URL, sample-data recipe, and supporting commands**, then pause. For an API-only feature, the URL may be the tested endpoint or local API base.
- **Agents** (single parallel batch, picked by what's actually needed):
  - `visual-tester` — local URL smoke, responsive checks, and screenshot evidence
  - `end-to-end-tester` — when a quick scripted smoke through the changed flow is more reliable than a freeform browser drive
  - `platform-engineer` — when local environment wiring, ports, dependency access, or configuration blocks startup
  - `ci-automation-engineer` — when preview or build automation is the failing boundary
  - `visual-tester` — when a visually significant change needs a screenshot baseline
- **Completion contract** (pass when ALL of these hold):
  - the single UI or API URL is reachable by the appropriate client
  - the changed UI renders without gating console errors and/or the changed API returns the expected happy-path and key failure response
  - observed sequence matches the intended diagram or every divergence has an owned finding
  - for changed UI, rendered comparison supports the selected direction; any unverified or waived visual evidence remains explicit and is not reported passed
  - URL + safe sample-data recipe + supporting commands + redacted evidence are written to the phase summary and `state.json`
  - **Blocked** is acceptable and explicit when a prerequisite the user must resolve (auth, missing secrets, blocked VPN, unavailable upstream service) stops local proof — record the exact blocker and the smallest next action.
- **What this is not**:
  - not full QA — that's Phase 14
  - not staging — that's Phase 19
  - not a hard gate — Phase 16 remains the hard gate; this is a strong soft gate that defaults to "do not advance until green or explicitly waived"
- **Output**:
  - `.agents/features/<slug>/runtime/local-evidence.md` (URL, API cases, sample-data recipe, commands run, ports, screenshot paths, blockers)
  - `.agents/features/<slug>/runtime/observed-sequence.md` when a runtime/API boundary exists
  - `state.json` gains a `local_runtime` block (see State Persistence)
  - phase summary prints the **clickable host-shell URL** as the first line so the user can jump straight in

## Additional phase requirements

- **Walk the boundaries in order and stop at the FIRST broken one.** Do not collect five failures downstream of one root cause; the first break explains the rest.
- **When two consecutive layers return no signal at all, that is an observability gap** — report it as a finding in its own right, not as "inconclusive".
- **Never run the same check more than twice.** A third identical attempt is a loop, not evidence. Change the probe or escalate.
- Report every check as `Checking / Evidence / Next`, and **quote real output** — a claim with no quoted output does not satisfy this gate.
- **Every verdict carries an evidence tier: TESTED · PARTIAL · INFERRED.** Never guess a tier, and never let an INFERRED result satisfy a gate that requires TESTED.
