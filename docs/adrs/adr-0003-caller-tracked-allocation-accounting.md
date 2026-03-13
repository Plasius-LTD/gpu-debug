# ADR-0003: Caller-Tracked Allocation Accounting

## Status

- Proposed -> Accepted
- Date: 2026-03-13
- Version: 1.0
- Supersedes: N/A
- Superseded by: N/A

## Context

There is no portable WebGPU API that enumerates all live GPU allocations for an
application. We still need a practical way to understand whether package-owned
buffers and textures are growing unexpectedly.

## Decision

Memory usage will be derived from explicit caller-reported allocation records.

- Allocations are tracked by stable id.
- Snapshots summarize totals by owner and category.
- If a host provides a memory-capacity hint, the package will compute a tracked
  usage ratio against that hint.

## Consequences

- Positive: accounting is deterministic and testable.
- Positive: packages can attribute memory growth to specific owners.
- Negative: untracked resources remain invisible.
- Neutral: the tracked usage ratio is a local diagnostic, not a complete device
  memory report.

## Alternatives Considered

- Try to infer memory from dispatches only: rejected because dispatch metadata
  does not reveal resident resource sizes.
- Wait for a future standard API: rejected because local accounting is useful
  today.
