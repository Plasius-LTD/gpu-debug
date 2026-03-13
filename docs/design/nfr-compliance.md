# NFR Compliance

## Security

- All runtime inputs are validated before they enter the session state.
- The package does not access remote services or hidden platform APIs.

## Reliability

- Histories and allocation counts are bounded.
- Disabled or aborted samples are ignored safely.
- Reset semantics are explicit and deterministic.

## Performance

- Sessions are disabled by default.
- Runtime state stays in memory-only bounded collections.

## Observability

- Snapshots expose stable owner, queue-class, and job-type groupings.
- Limitations are explicit so consumers understand what is inferred versus
  host-supplied.

## Privacy

- The package is local-only by default.
- Examples and tests avoid PII and external data transfer.
