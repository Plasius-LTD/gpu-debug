# ADR-0002: Inferred Metrics and Optional Hardware Hints

## Status

- Proposed -> Accepted
- Date: 2026-03-13
- Version: 1.0
- Supersedes: N/A
- Superseded by: N/A

## Context

Users want visibility into GPU memory and cores, but portable WebGPU does not
guarantee direct access to authoritative live core-count, total-memory, or
occupancy counters.

## Decision

The package will expose:

- caller-tracked allocation totals,
- queue depth and dispatch timing summaries,
- estimated workgroup and invocation counts,
- optional host-supplied hardware hints when a privileged runtime can provide
  them.

The package will not claim unavailable counters as authoritative portable API
data.

## Consequences

- Positive: reported data stays honest and portable.
- Positive: native or privileged runtimes can still provide richer hints.
- Negative: the package is not a replacement for vendor-specific profilers.
- Neutral: clients may combine the snapshot with other telemetry if needed.

## Alternatives Considered

- Report fabricated core or memory estimates unconditionally: rejected because
  the numbers would be misleading.
- Depend on platform-specific profiler SDKs: rejected because the base package
  must stay lightweight and portable.
