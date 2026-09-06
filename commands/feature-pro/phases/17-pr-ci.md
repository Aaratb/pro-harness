# Phase 17: PR & CI

> Load this file only when this phase is selected or resumed.

- **Skills**: `prepare-change-for-review`, `create-pull-request`, `split-large-pull-request`, `review-pull-request`, `check-merge-readiness`, `score-change-risk`
- **Capabilities**: resolve `scm.pull-request.read`, `scm.pull-request.write`, and `ci.read`; any write remains outward-facing and must stay within the authorization already granted for this phase.
- **Slice PRs gate (mandatory before `scm.pull-request.write`):**
  1. Measure changed LOC from the resolved merge base: `git diff --stat <base>...HEAD`. Apply repository-owned exclusions only when repository instructions define them.
  2. If **> ~800 LOC** and not already stacked: **stop** — load `split-large-pull-request` to produce **3–4 reviewable stacked PRs** (<500 LOC each when possible).
  3. A single 5k-line PR is a **process failure** — do not open it. Split first, then run the auto-fix loop per PR in dependency order.
  4. Record in `state.json` → `staff_discipline.pr_slice`: `{ required, total_loc, pr_count, pr_urls[] }`.
  5. Announce line count and PR count in the Phase 17 summary.
- Open or update the pull request through `scm.pull-request.write`; the active adapter may use an approved MCP or native source-control CLI.
- **Test change placement:** follow the active repository's documented policy. Keep tests with the feature by default because they are part of its proof. Create a dedicated test branch/PR only when repository instructions or an explicitly approved delivery plan requires one; record its base and relationship to the feature PR.
- **Auto-loop sequence (no user input until clean):**

```
Step 1: read merge state, checks, and reviews through `scm.pull-request.read` and `ci.read`
Step 2: if mergeable == CONFLICTING:
          - resolve conflicts through repository-native version control using the complete merge-base diff
          - verify semantic conflict choices before committing and pushing
Step 3: read bounded failing-check evidence through `ci.read` and review comments through `scm.pull-request.read`
Step 4: parallel-launch:
          - matching canonical build/runtime resolver (with failure logs)
          - code-reviewer (re-review post-fix)
          - security-reviewer or scoped security lane agent (only if security check is red)
Step 5: push fixes, re-poll every 30s until green or 3 retries
Step 6: run `review-pull-request` and `check-merge-readiness` on the PR URL
Step 7: optional single safe stacked fix PR when the user requests it or one safe blocker fix is warranted (stacked fix PR only)
Step 8: report exact list of fixes applied + PR review / impact artifacts
```

**Pause for user only if** a fix needs a business-logic decision (not a formatting/lint/type/conflict issue).

## Additional phase requirements

- **One fix wave with the complete findings list**, not one agent per finding. Per-finding waves produce conflicting edits and redundant context.
- Size slices at the **reviewer boundary**: split where a reviewer could reject one slice while approving its neighbour; do not split where judging either requires holding both.
- **Verify a review suggestion before implementing it.** An incorrect suggestion implemented faithfully is still a defect. When a suggestion is unclear, resolve ALL unclear items before implementing ANY of them.
- Never use `HEAD~1` as a diff base for review or fix scoping — it silently truncates multi-commit work. Always diff against the resolved merge-base.
