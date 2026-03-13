# Technical Design Record (TDR)

## Title

TDR-0002: Worker and Performance Integration Contracts

## Status

- Proposed -> Accepted
- Date: 2026-03-13
- Version: 1.0
- Supersedes: N/A
- Superseded by: N/A

## Scope

Defines how `@plasius/gpu-debug` is expected to integrate with
`@plasius/gpu-worker` and `@plasius/gpu-performance`.

## Context

Plasius wants a worker-job-first performance model. Debugging should follow the
same boundaries so snapshots can explain which worker queues, job families, and
frame-budget regimes are active.

## Design

- `owner` identifies the package or subsystem emitting a sample.
- `queueClass` groups worker lanes such as render, simulation, lighting, and
  post-processing.
- `jobType` aligns dispatch samples with stable worker job labels.
- frame samples can be correlated with `@plasius/gpu-performance` negotiated
  targets and decisions outside this package.

The package does not depend on `@plasius/gpu-worker` or
`@plasius/gpu-performance` directly; it stays framework-agnostic and typed
through shared string contracts.

## Data Contracts

- stable `owner`
- stable `queueClass`
- stable `jobType`
- `frameId` correlation ids across dispatch, queue, and frame samples

## Operational Considerations

- Reliability: correlation ids remain optional so instrumentation can be added
  incrementally.
- Observability: queue class and job type make the snapshot useful across many
  effect packages.
- Security: no hidden telemetry export path exists in the package.
- Cost: keeping integration string-based avoids extra runtime dependencies.

## Rollout and Migration

1. Start with package-local allocation and dispatch reporting.
2. Add shared `frameId` correlation where runtime wiring already exists.
3. Expand adoption across new worker-based effect packages.

## Risks and Mitigations

- Risk: package-specific naming drift.
  Mitigation: document stable ids in package ADRs and TDRs.
- Risk: consumers expect authoritative hardware counters.
  Mitigation: snapshot limitations remain explicit and always present.

## Open Questions

- Whether future `@plasius/gpu-*` packages should share a small common debug id
  vocabulary.
