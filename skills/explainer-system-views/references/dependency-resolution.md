# Dependency resolution

Build a deterministic local graph without executing package code.

Recognize direct local references from common import, require, include, module, package, workspace, build, and infrastructure configuration forms. Resolve relative paths and declared workspace aliases only from checked-in configuration. Preserve unresolved, dynamic, generated, conditional, and external edges separately.

Every edge records source file, target file or external package, line, evidence snippet, resolution status, and reason. Aggregate file edges into modules only after retaining the underlying cites.

Forward dependency claims need the import or configuration site. Complete reverse-dependency claims need exhaustive scoped search. Topological order applies only to an acyclic resolved subgraph; cycles are emitted explicitly rather than broken silently.

