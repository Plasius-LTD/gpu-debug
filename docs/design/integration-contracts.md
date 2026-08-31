# Integration Contracts

## With `@plasius/gpu-worker`

- Use stable worker job labels for `jobType`.
- Use bounded queue class labels for `queueClass`.
- Record queue depth and dispatch samples around worklist execution.
- Record ready-lane depth and dependency-unlock samples when DAG schedulers
  expose those events locally.
- Prefer `createWorkerLoop({ frameId, telemetry })` so dispatch samples carry
  shared `frameId` values and stable worker metadata without extra glue code.

## With `@plasius/gpu-performance`

- Reuse the same `frameId` when correlating frame-budget decisions and debug
  samples.
- Treat `targetFrameTimeMs` as a caller-supplied value from the performance
  governor when available.

## With `@plasius/gpu-renderer`

- Forward only already-resolved fixed-SPP frame statistics to
  `recordFixedSppTelemetry(...)`.
- Keep renderer telemetry opt-in. Enabling a debug session must not enable GPU
  counters, timestamp queries, readbacks, or queue waits in the renderer.
- Preserve `null` for unavailable secondary-ray, path-segment, and GPU timing
  evidence. Do not substitute estimates.
- Use the same stable `frameId` as other queue, dispatch, and frame samples.
- The fixed-SPP input is structurally compatible with the renderer statistics
  subset and does not create a runtime package dependency.

## With `@plasius/analytics`

- Keep this package local-first.
- If snapshots or summarized events need to be exported, do so through
  `@plasius/analytics`.
