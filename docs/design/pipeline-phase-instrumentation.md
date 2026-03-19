# Pipeline Phase Instrumentation

`@plasius/gpu-debug` now supports explicit simulation-to-visual phase telemetry.

## Pipelines

The local session recognizes:

- `simulation`
- `secondary-simulation`
- `scene-preparation`
- `render`

## Snapshot lag

When a caller records `snapshotAgeFrames` or `snapshotAgeMs`, the session
summarizes how stale the consumed snapshot was at the point of use.

This is useful for:

- verifying that secondary simulation is reading same-frame snapshots where
  expected,
- identifying delayed scene-preparation consumers,
- comparing handoff lag with frame-budget pressure.
