# ADR-0007: Passive Fixed-SPP Renderer Evidence

- Status: Accepted
- Date: 2026-08-31
- Version: 1.0

## Context

The adaptive path-sampling programme needs a fixed-SPP baseline that can be
compared with later scheduling modes. The canonical renderer now reports exact
primary-ray counts, optional measured secondary rays and total path segments,
timestamp or fallback timing evidence, and diagnostic buffer memory.

The debug package must retain and summarize that evidence without becoming a
second profiler or changing renderer execution. In particular, enabling a debug
session must not cause GPU counters, timestamps, buffer mapping, command
submission, or queue waits.

## Decision

Add a passive, caller-reported `recordFixedSppTelemetry(...)` contract and a
bounded `snapshot.fixedSpp` aggregate.

- The input is structurally compatible with the fixed-SPP subset of the
  canonical renderer frame statistics.
- The debug package has no renderer runtime dependency.
- Renderer integrations decide whether diagnostics are enabled and forward only
  already-resolved statistics.
- Unavailable secondary-ray, path-segment, and GPU-time values remain nullable.
- Aggregates report how many samples contained measured evidence.
- Root counters and nested evidence are validated for coherence before storage.
- Any remote export continues to route through `@plasius/analytics`.

## Consequences

- Positive: fixed and adaptive benchmark evidence can share one local diagnostic
  snapshot without duplicating renderer instrumentation.
- Positive: disabled renderer diagnostics retain their zero-readback behavior.
- Positive: consumers can distinguish measured GPU evidence from fallback CPU
  or queue-completion timing.
- Neutral: integrations must explicitly forward a renderer frame snapshot.
- Neutral: the bounded history stores compact summaries rather than raw buffers.

## Alternatives Considered

- Start renderer readbacks from `gpu-debug`: rejected because it would couple
  diagnostics to renderer internals and make debug enablement alter GPU work.
- Infer missing secondary rays or GPU time: rejected because estimates would not
  be valid matched-quality benchmark evidence.
- Add a renderer runtime dependency: rejected because the compatible contract is
  data-only and structural typing keeps the package boundary smaller.

## References

- `Plasius-LTD/plasius-ltd-site#2116`
- `Plasius-LTD/gpu-debug#35`
- `Plasius-LTD/gpu-renderer#166`
