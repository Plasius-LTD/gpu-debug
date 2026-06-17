# ADR-0006: Wavefront Queue and Hit Summaries

- Status: Accepted
- Date: 2026-06-17
- Version: 1.0

## Context

The wavefront path-tracing backlog needs renderer-facing diagnostics that answer
practical questions quickly:

- how many active rays are still alive per bounce,
- whether queue overflow is occurring,
- what kinds of hits are being produced,
- why paths are terminating.

`@plasius/gpu-debug` already handles allocations, queues, dispatches, DAG
telemetry, frames, and simulation-to-visual phase timing. It still lacks a
compact summary surface for wavefront-specific diagnostics.

The package must stay honest about what it can observe. Dumping full GPU ray or
hit buffers would be expensive, package-specific, and often unavailable in the
target runtime. The new diagnostics therefore need to remain caller-reported
summary samples instead of pretending the package can inspect raw GPU memory
portably.

## Decision

`@plasius/gpu-debug` will add a caller-reported wavefront telemetry contract:

- `recordWavefrontTelemetry(...)` records per-bounce summary samples
- `snapshot.wavefront` aggregates active-ray counts, queue utilization,
  overflow totals, hit-buffer counts, termination reasons, hit kinds, and
  bounce-depth distribution
- `summarizeWavefrontTelemetry(...)` formats that snapshot into compact
  operator-facing lines

The package will not collect or expose raw ray-buffer or hit-buffer payloads by
default. Integrations remain responsible for producing compact summary samples.

## Consequences

- Positive: renderer packages gain one shared local-first diagnostic surface for
  bounce-pipeline inspection.
- Positive: debugging stays lightweight and safe for browser and worker
  environments because only summary samples are retained.
- Positive: termination and hit-kind summaries can be correlated with existing
  queue and dispatch telemetry in one snapshot.
- Neutral: integrations must explicitly report wavefront summaries; the package
  still does not invent data that the runtime does not expose.

## Alternatives Considered

- Export raw GPU buffers through `@plasius/gpu-debug`:
  rejected because it would be heavyweight, package-specific, and often
  impossible in portable WebGPU environments.
- Leave wavefront diagnostics entirely package-local:
  rejected because it would fragment the debug contract across renderer and
  diagnostics packages.

## References

- `Plasius-LTD/plasius-ltd-site#1042`
- `Plasius-LTD/gpu-debug#13`
