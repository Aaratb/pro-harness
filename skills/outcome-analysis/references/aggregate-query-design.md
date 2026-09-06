# Aggregate query design

This reference designs a bounded read-only query proposal; it grants no SQL or production execution authority. The analyst returns it; the coordinator obtains scoped authority and executes through an existing documented tool.

Require supplied schema and primary provider documentation: dialect/version, tables/columns/types, keys/relationships, timestamp semantics, tenant/exposure filters and available aggregate views/replicas. Missing schema is a precise request, not permission to guess. Reuse validated existing queries first.

Translate the decision into exact entity, numerator/denominator, inclusion/exclusion, deduplication, grouping and baseline/observed windows. Aggregate server-side and suppress unsafe small cohorts; return no raw identifiers. Check join cardinality/fan-out, null treatment, timezones and boundary conditions; numerator must be a subset of the same denominator. Preaggregate at compatible grain before joining when needed; do not average incompatible rates or percentiles.

Bound scan/time/cost/result limits from provider capabilities and authorized scope, using documented partitions and filters. Explain query logic, limits, expected aggregate schema and known coverage gaps. Propose safe fixture/aggregate-total checks for joins, duplicate events, empty/zero denominators, missing values and window edges. Query plans or dry runs are operations too: coordinator checks permissions before using them. Index, schema, dashboard and tuning changes are out of scope.

Record the exact query definition and supplied documentation version with result provenance. Read-only does not mean harmless: stop rather than widen scope or run an unbounded production query. A successful query and matching arithmetic do not prove eligible populations or an honest instrumentation pipeline.
