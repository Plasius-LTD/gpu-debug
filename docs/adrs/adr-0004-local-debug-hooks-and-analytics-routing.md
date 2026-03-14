# ADR-0004: Local Debug Hooks and Analytics Routing

## Status

- Proposed -> Accepted
- Date: 2026-03-13
- Version: 1.0
- Supersedes: N/A
- Superseded by: N/A

## Context

Debug snapshots may eventually be exported or correlated with analytics, but
this package should not create another bespoke transport layer or persistence
stack.

## Decision

`@plasius/gpu-debug` will expose local session APIs only. That includes
allocation, queue, dispatch, frame, ready-lane, and dependency-unlock sample
collection. If snapshots need to be exported, batching, transport, queueing,
and persistence must go through `@plasius/analytics`.

## Consequences

- Positive: debug instrumentation stays focused on data collection.
- Positive: analytics concerns are reused through the existing package boundary.
- Negative: remote export requires an integration step outside this package.
- Neutral: local-only usage remains the default.

## Alternatives Considered

- Add a package-local analytics client: rejected because it duplicates existing
  infrastructure.
