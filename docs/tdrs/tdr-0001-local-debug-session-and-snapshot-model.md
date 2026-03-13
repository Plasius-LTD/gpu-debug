# Technical Design Record (TDR)

## Title

TDR-0001: Local Debug Session and Snapshot Model

## Status

- Proposed -> Accepted
- Date: 2026-03-13
- Version: 1.0
- Supersedes: N/A
- Superseded by: N/A

## Scope

Defines the runtime session API used to collect and summarize local GPU debug
signals.

## Context

The package must remain lightweight, deterministic, and safe to enable in local
or developer-focused builds. The data model needs to cover allocations,
dispatches, queues, and frames without introducing platform-specific runtime
dependencies.

## Design

The package exposes `createGpuDebugSession(options)` which returns a mutable
session object.

- Sessions default to `enabled: false`.
- `trackAllocation()` records caller-owned resource sizes by id and returns a
  release function.
- `recordQueue()` stores bounded queue-depth samples.
- `recordDispatch()` stores bounded dispatch samples and derives invocation
  counts from workgroup metadata.
- `recordFrame()` stores bounded frame-budget samples.
- `getSnapshot()` returns a consolidated summary object.
- `reset()` clears the local session state.

## Data Contracts

- `GpuDebugSessionOptions`
- `GpuDebugAdapterInfo`
- `TrackedGpuAllocation`
- `GpuQueueSample`
- `GpuDispatchSample`
- `GpuFrameSample`
- `GpuDebugSnapshot`

## Operational Considerations

- Reliability: all runtime inputs are validated and bounded.
- Observability: stable identifiers let packages correlate owners and job types.
- Security: the package does not access external services or hidden runtime
  state.
- Cost: disabled sessions are cheap and sample histories are capped.

## Rollout and Migration

1. Enable the package only in client-selected debug paths.
2. Add allocation and dispatch reporting incrementally per package.
3. Export snapshots through `@plasius/analytics` only if remote analysis is
   required.

## Risks and Mitigations

- Risk: package authors may forget to release tracked allocations.
  Mitigation: `trackAllocation()` returns a release function and snapshots expose
  lingering totals.
- Risk: dispatch metadata may be incomplete.
  Mitigation: invocation counts are estimated only from the metadata supplied.

## Open Questions

- Whether future sessions need optional event hooks in addition to snapshot
  polling.
