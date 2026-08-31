# TDR-0004: Fixed-SPP Telemetry Validation and Aggregation

- Status: Accepted
- Date: 2026-08-31

## Contract

One retained sample contains stable owner/frame correlation, requested and
rendered SPP, root ray totals, nested ray-count evidence, nested timing evidence,
and diagnostic memory bytes.

The nested shapes mirror the canonical renderer's fixed-SPP statistics subset.
No renderer object or callback is retained.

`capturedRayCounts` and `expectedRayCounts` describe GPU counter records before
aggregation and must be positive and equal when evidence is available. They are
not the number of histogram buckets. `bounceHistogram` independently collapses
those records by bounce and must sum to `totalPathSegments`.

## Admission Rules

- Counts are finite non-negative integers.
- Requested and rendered SPP are positive integers, with rendered SPP no greater
  than requested SPP.
- Available ray evidence has a source and complete measured values.
- Available ray evidence has positive, matching captured and expected record
  counts independent of bounce-bucket cardinality.
- Available timestamp evidence has timestamp timing and a measured GPU duration.
- Bounce histogram totals agree with measured path segments.
- Root secondary-ray/path-segment values agree with nested evidence.
- Aborted or disabled samples are rejected before normalization or retention.

## Aggregation

The session retains at most `maxRetainedFixedSppSamples` entries. Snapshots expose
totals and averages for measured values, separate measured-sample counts, status
histograms, peak telemetry memory, and the latest normalized sample. Reset clears
the complete fixed-SPP history.

No missing value is coerced to a measured zero. A total whose name includes
`Measured` sums only available measurements, with the matching sample count
reported alongside it.

## Runtime Cost Boundary

The package performs in-memory validation and bounded array aggregation only.
It does not allocate GPU resources, add shader atomics, issue command buffers,
request timestamp features, map buffers, or wait for queue completion.
