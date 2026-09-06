# Architecture recognition

Architecture names summarize evidence; they do not replace it.

## Signals

- layered or modular systems: dependency direction, boundary interfaces, package visibility, module registration;
- ports and adapters: core interfaces with replaceable infrastructure implementations and composition at an outer boundary;
- event-driven systems: publishers, contracts, subscribers, acknowledgement, retry, or dead-letter handling;
- pipelines: declared lineage, stages, materializations, scheduling, and data-quality contracts;
- frontend state systems: component boundaries, stores, effects, server/client split, and data-fetch ownership;
- resource graphs: declarative resources, modules, providers, and state convergence;
- libraries: public exports, compatibility surface, adapters, and implementation hiding.

Explain the responsibilities the evidence shows before offering a familiar label. Most repositories combine shapes; name the dominant shape for the current action and record exceptions. A pattern label remains inferred unless checked-in architecture documentation explicitly claims it and current code still supports it.

Every role row requires plain-language job, real file, real symbol, evidence level, and consequence. Missing roles are `not present`, not filled with a convenient neighbor.

