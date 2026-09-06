# Data and state reconstruction

## Evidence sources

Prefer authoritative checked-in sources in this order, adjusted for the detected stack:

1. database or event schemas and migrations;
2. model, entity, or typed contract definitions;
3. validators and serializers;
4. actual read and write sites;
5. tests and fixtures that demonstrate lifecycle;
6. documentation, which remains subject to drift.

For each entity or state shape record identity, important fields, ownership, cardinality, tenancy boundary, readers, writers, and lifecycle notes. Derive a relationship from schema constraints or evidenced identifiers; field names alone are insufficient.

Each transition records from state, to state, trigger, mutating symbol, guard, side effects, cite, and claim identifier. A transition shown only in a test or document is labeled accordingly. Absence and unreachable-state claims require exhaustive scoped search.

Choose evidence by the claim, not by the list alone: types describe expected shape, validators describe checks at their call sites, migrations describe declared database changes, and writers show attempted transitions. To explain an enforced invariant, connect the relevant constraint or check to the selected write path and its failure handling. Checked-in schema existence alone proves neither deployment nor universal runtime enforcement; distinguish a declared relationship from a confirmed constraint, and leave unavailable external enforcement unknown.

Reuse the trace's illustrative values to explain before and after state, authoritative owner, and when another reader can observe the change. Separate client or in-memory state, attempted persistence, committed state, and any derived or eventually updated view only where relevant. Transaction or visibility claims need supporting boundaries; a successful helper return is not automatically a durable commit. Keep the sequence, state view, and data example consistent without creating new artifacts or pretending to observe production state.

Do not invent persistence for a stateless target. Frontends may model client state, pipelines table grain and lineage, and infrastructure a resource graph.
