# Evaluation

## Versioned cases

`packages/domain/src/evaluation.ts` is the executable source of truth for the ten `V1` cases:

1. BMW estate car with equipment verification
2. BMW X3 with M Sport verification
3. Laptop search with SKU and delivered-price comparison
4. Washing-machine search with energy and installation costs
5. Ambiguous natural-language request
6. Service-provider comparison
7. Conflicting-source evidence
8. Partial source access
9. Duplicate cross-source listing
10. Stale price

## Metrics

- hard-filter recall
- field extraction accuracy
- duplicate detection precision/recall
- evidence coverage
- recommendation consistency
- unsupported-claim rate
- successful job completion
- latency and AI cost per successful job

Evaluation data records schema, adapter, scoring, prompt, and model-router versions. A
recommendation fails evaluation when a material fact lacks sufficient evidence.

`calculateEvaluationMetrics` validates observation records and calculates hard-filter recall, exact
field extraction accuracy, pairwise duplicate precision/recall, evidence coverage, unsupported
material-claim rate, top-recommendation consistency, completion, median latency, and mean EUR cost.
Empty denominators are handled explicitly; an empty evaluation run is rejected.

The automated suite verifies the case inventory and metric arithmetic. It does not claim a model or
live-source quality score. Release numbers are valid only after all ten cases have actual,
version-labelled outputs from the candidate build.
