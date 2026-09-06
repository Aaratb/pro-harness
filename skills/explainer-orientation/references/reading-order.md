# Reading-order contract

Create a guided sequence from the repository atlas and dependency graph.

1. Start with repository instructions and the package or application entry point.
2. Read public contracts and routing before internal implementations.
3. Follow one representative path from entry through decisions to state or integration effects.
4. Read the core data or state shape before interpreting transitions.
5. Read tests beside the implementation they specify, not as an isolated final block.
6. Defer generated, vendor, broad infrastructure, and unrelated feature areas with an explicit reason.

Each step contains path, symbol or region, what to understand, why it comes now, prerequisite concept, cited dependency edge, and next step. Entry points and edges can be confirmed; the pedagogical ordering is an explained inference.

