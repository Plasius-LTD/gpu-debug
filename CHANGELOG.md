# Changelog

All notable changes to this project will be documented in this file.

The format is based on **[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)**, and this project adheres to **[Semantic Versioning](https://semver.org/spec/v2.0.0.html)**.

---

## [Unreleased]

- **Added**
  - Pipeline phase telemetry for simulation-to-visual handoff timing and
    snapshot-lag diagnostics.
  - ADR, TDR, design docs, and tests for pipeline phase instrumentation.
  - A browser-based 3D harbor demo so telemetry is shown against visible scene
    state.

- **Changed**
  - CI and CD workflows now upload coverage through the Codecov CLI instead of
    the JavaScript action wrapper, removing the remaining Node 20 action path.
  - Debug snapshots now include a `pipeline` summary section when callers record
    phase samples.
  - `demo/main.js` now mounts the shared 3D showcase runtime while
    `demo:example` remains available for the console example.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.1] - 2026-03-14

- **Added**
  - `recordReadyLane(...)` and `recordDependencyUnlock(...)` session APIs for
    DAG-ready queue diagnostics.
  - `snapshot.dag` summaries covering ready-lane depth, utilization, and
    downstream unlock activity.

- **Changed**
  - Integration docs now describe how DAG worker schedulers can feed lane-depth
    and dependency-unlock samples into the local debug session.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.0] - 2026-03-13

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.0] - 2026-03-13

- **Added**
  - Initial `@plasius/gpu-debug` package scaffold based on the Plasius package
    standard.
  - Opt-in debug session API for tracked allocations, queue samples, dispatch
    samples, and frame-budget summaries.
  - ADRs, TDRs, design docs, unit tests, and a runnable console demo.
  - Standard GitHub CI/CD and scheduled npm audit workflows for package
    validation and release automation.
  - Consumer guidance for correlating `@plasius/gpu-worker` dispatch samples
    and frame ids inside a local debug session.

- **Changed**
  - Debug instrumentation guidance now documents inferred metrics and
    host-supplied hardware hints instead of claiming unavailable portable
    WebGPU counters.
  - Added repository release-automation guidance reflecting the new GitHub
    workflow set.
  - Updated package maintenance guidance to use the Node 24 baseline reflected in
    `.nvmrc`.

- **Fixed**
  - N/A

- **Security**
  - Local-only instrumentation and analytics routing constraints documented.


[0.1.0]: https://github.com/Plasius-LTD/gpu-debug/releases/tag/v0.1.0
[0.1.1]: https://github.com/Plasius-LTD/gpu-debug/releases/tag/v0.1.1
