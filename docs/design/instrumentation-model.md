# Instrumentation Model

## Goals

- Keep debug instrumentation opt-in and local by default.
- Provide useful optimization signals without overstating hardware visibility.
- Align debug data with worker-job and frame-budget coordination.

## Session Model

The package uses a single session object that stores bounded local histories for:

- tracked allocations,
- queue samples,
- ready-lane samples,
- dispatch samples,
- dependency-unlock samples,
- fixed-SPP renderer frame samples,
- frame samples.

## Snapshot Semantics

- Memory is caller-tracked, not device-global.
- Dispatch summaries derive workgroup and invocation estimates from supplied
  metadata.
- Queue summaries describe pressure and capacity where the caller provides it.
- DAG summaries describe ready-lane pressure and downstream unlock flow where
  the caller reports those events.
- Frame summaries describe budget pressure and optional GPU busy time.
- Fixed-SPP summaries aggregate caller-resolved primary/secondary rays, path
  segments, timing evidence, evidence status, and telemetry memory. Missing GPU
  measurements stay missing and are never inferred from CPU timing.

## Fixed-SPP Ingestion Boundary

`recordFixedSppTelemetry(...)` is deliberately passive. The renderer decides
whether to collect counters or timestamps and supplies its completed frame
statistics. The debug session validates, bounds, and summarizes those values; it
never initiates readback, command submission, or timestamp queries.

## Hardware Hints

The session accepts optional adapter hints such as:

- memory capacity,
- core count,
- compute workgroup limits.

These hints are not required and should be treated as host-provided metadata
rather than portable WebGPU guarantees.
