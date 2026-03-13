# Integration Contracts

## With `@plasius/gpu-worker`

- Use stable worker job labels for `jobType`.
- Use bounded queue class labels for `queueClass`.
- Record queue depth and dispatch samples around worklist execution.
- Prefer `createWorkerLoop({ frameId, telemetry })` so dispatch samples carry
  shared `frameId` values and stable worker metadata without extra glue code.

## With `@plasius/gpu-performance`

- Reuse the same `frameId` when correlating frame-budget decisions and debug
  samples.
- Treat `targetFrameTimeMs` as a caller-supplied value from the performance
  governor when available.

## With `@plasius/analytics`

- Keep this package local-first.
- If snapshots or summarized events need to be exported, do so through
  `@plasius/analytics`.
