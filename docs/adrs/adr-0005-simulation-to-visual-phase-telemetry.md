# ADR-0005: Simulation-to-Visual Phase Telemetry

- Status: Accepted
- Date: 2026-03-19

## Context

`@plasius/gpu-debug` already summarizes allocations, dispatches, queues, frame
pressure, and DAG unlocks. The next rendering architecture slice needs explicit
visibility into the handoff from authoritative simulation to visual scene
preparation.

Without a local phase telemetry model, downstream packages cannot answer basic
questions such as:

- how much time the handoff stages are consuming,
- whether secondary simulation is running against stale snapshots,
- which stage is introducing the most delay before scene preparation.

## Decision

`@plasius/gpu-debug` will add a local pipeline phase telemetry contract.

Callers can record phase samples with:

- owner
- pipeline category
- stage id
- optional duration
- optional snapshot lag in frames or milliseconds

The debug snapshot will expose an aggregated `pipeline` section with totals,
snapshot-lag summaries, per-pipeline buckets, and hottest stages.

## Consequences

- Physics, particles, and renderer packages can correlate handoff timing with
  frame-budget pressure.
- Snapshot age becomes visible without introducing a remote analytics
  dependency.
- The package remains local-first and still delegates any export to
  `@plasius/analytics`.
