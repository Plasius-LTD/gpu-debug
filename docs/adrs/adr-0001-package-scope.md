# ADR-0001: GPU Debug Package Scope

## Status

- Proposed -> Accepted
- Date: 2026-03-13
- Version: 1.0
- Supersedes: N/A
- Superseded by: N/A

## Context

Plasius needs an opt-in package for GPU runtime diagnostics that can be enabled
locally by clients without imposing a required dependency on production runtime
paths.

## Decision

`@plasius/gpu-debug` will be a local, opt-in instrumentation package that:

- defaults to disabled,
- tracks caller-reported allocations and runtime samples,
- emits only local snapshots,
- avoids owning analytics transport, persistence, or remote control.

## Consequences

- Positive: debug overhead is explicit and under client control.
- Positive: the package can integrate with `@plasius/gpu-worker` and
  `@plasius/gpu-performance` without coupling their runtime safety to debug
  code.
- Negative: snapshots are only as complete as the data clients report.
- Neutral: packages may still integrate with external profilers separately.

## Alternatives Considered

- Always-on instrumentation: rejected because it adds avoidable overhead.
- Fold debug features into `@plasius/gpu-performance`: rejected because
  instrumentation and control policy have different responsibilities.

## References

- [`../design/instrumentation-model.md`](../design/instrumentation-model.md)
