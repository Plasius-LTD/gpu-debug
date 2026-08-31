# NFR Compliance

## Security

- All runtime inputs are validated before they enter the session state.
- The package does not access remote services or hidden platform APIs.

## Reliability

- Histories and allocation counts are bounded.
- Disabled or aborted samples are ignored safely.
- Reset semantics are explicit and deterministic.
- Contradictory fixed-SPP root and nested evidence is rejected before retention.

## Performance

- Sessions are disabled by default.
- Runtime state stays in memory-only bounded collections.
- Fixed-SPP ingestion does not initiate renderer work, GPU readback, timestamp
  queries, command submission, or queue completion waits.

## Observability

- Snapshots expose stable owner, queue-class, and job-type groupings.
- Limitations are explicit so consumers understand what is inferred versus
  host-supplied.
- Fixed-SPP summaries report measurement counts separately from aggregate values
  so unavailable GPU evidence is not presented as zero or inferred data.

## Privacy

- The package is local-only by default.
- Examples and tests avoid PII and external data transfer.
