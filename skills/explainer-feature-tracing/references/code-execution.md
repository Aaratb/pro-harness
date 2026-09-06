# Code-execution walkthrough

Explain a file or function in runtime order rather than visual line order.

Capture:

1. caller, trigger, and why this symbol is in the selected path;
2. inputs, validation, normalization, and defaults;
3. ordered decisions with exact branch conditions;
4. calls and the relevant contract of each callee;
5. mutations, persistence, emitted events, external effects, and logging already present;
6. errors, early returns, retries, cleanup, and terminal values;
7. what executes next for each exit.

Assign stable exit identifiers such as `function-key/guard-denied` and `function-key/success`. Sequence views may reference only produced exit identifiers. Explain what a line or block achieves and why its order matters; do not restate syntax.

For straight-line plumbing, a compact cited walkthrough is sufficient. Branching or rule-bearing code receives a code-execution flow whose nodes reference claim identifiers.

Work the course's safe illustrative example through the material steps. Show the relevant input or prior state, normalization or guard, changed value or state, and each supported result; omit irrelevant payload fields and never copy secrets or production records. Example values model confirmed source behavior, not a claim that the code was run. State where the example stops depending on repository code and starts depending on an unavailable external contract.

Explain the decision that preserves an invariant and the symbol that enforces it, not just the name of the layer containing it. Keep a callee's return distinct from the initiating caller's completion, an in-memory mutation from a committed write, and scheduled work from its eventual effect. Where ordering matters, point to the call, await, transaction, or continuation that establishes it; absence of that evidence stays a limit, not a guessed guarantee.
