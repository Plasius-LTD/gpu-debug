# TDR-0003: Pipeline Phase and Snapshot Lag Contract

## Summary

`@plasius/gpu-debug` adds:

- `recordPipelinePhase(sample)`
- `snapshot.pipeline`

## Sample contract

Each pipeline phase sample includes:

- `owner`
- `pipeline`
- `stage`
- optional `frameId`
- optional `durationMs`
- optional `snapshotFrameId`
- optional `snapshotAgeFrames`
- optional `snapshotAgeMs`

## Snapshot summary

The pipeline snapshot reports:

- total sample count
- total and average duration
- average and max snapshot age
- per-pipeline buckets
- hottest stages by duration or lag

## Intended integrations

- `@plasius/gpu-physics` can report authoritative commit and snapshot stages
- `@plasius/gpu-particles` can report secondary simulation consumption against a
  stable snapshot
- render-side packages can report scene-preparation and handoff costs
