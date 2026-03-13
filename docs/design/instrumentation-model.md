# Instrumentation Model

## Goals

- Keep debug instrumentation opt-in and local by default.
- Provide useful optimization signals without overstating hardware visibility.
- Align debug data with worker-job and frame-budget coordination.

## Session Model

The package uses a single session object that stores bounded local histories for:

- tracked allocations,
- queue samples,
- dispatch samples,
- frame samples.

## Snapshot Semantics

- Memory is caller-tracked, not device-global.
- Dispatch summaries derive workgroup and invocation estimates from supplied
  metadata.
- Queue summaries describe pressure and capacity where the caller provides it.
- Frame summaries describe budget pressure and optional GPU busy time.

## Hardware Hints

The session accepts optional adapter hints such as:

- memory capacity,
- core count,
- compute workgroup limits.

These hints are not required and should be treated as host-provided metadata
rather than portable WebGPU guarantees.
