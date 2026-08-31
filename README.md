# @plasius/gpu-debug

[![npm version](https://img.shields.io/npm/v/@plasius/gpu-debug.svg)](https://www.npmjs.com/package/@plasius/gpu-debug)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Plasius-LTD/gpu-debug/ci.yml?branch=main&label=build&style=flat)](https://github.com/Plasius-LTD/gpu-debug/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/Plasius-LTD/gpu-debug)](https://codecov.io/gh/Plasius-LTD/gpu-debug)
[![License](https://img.shields.io/github/license/Plasius-LTD/gpu-debug)](./LICENSE)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-yes-blue.svg)](./CODE_OF_CONDUCT.md)
[![Security Policy](https://img.shields.io/badge/security%20policy-yes-orange.svg)](./SECURITY.md)
[![Changelog](https://img.shields.io/badge/changelog-md-blue.svg)](./CHANGELOG.md)

Opt-in GPU debug instrumentation for Plasius WebGPU runtimes. The package tracks
caller-reported allocations, queue pressure, dispatch samples, and frame-budget
signals without claiming portable WebGPU exposes authoritative raw hardware
counters.

Apache-2.0. ESM + CJS builds. TypeScript types included.

## Install

```bash
npm install @plasius/gpu-debug
```

## Browser Demo

```bash
npm run demo
```

Then open `http://localhost:8000/gpu-debug/demo/`.

`npm run demo` now visualizes debug telemetry against the shared 3D harbor
scene from the public `@plasius/gpu-shared` package surface, while
`npm run demo:example` keeps the console example path.

## What It Solves

- Exposes tracked GPU allocation totals by owner and category.
- Records queue depth, dispatch timings, and estimated invocation counts.
- Records DAG-ready lane depth and dependency-unlock activity when integrations
  supply those samples.
- Records compact wavefront queue, hit-buffer, and termination summaries
  without dumping raw GPU buffers.
- Retains bounded fixed-SPP renderer evidence for primary/secondary rays, path
  segments, GPU/render-job timing, timestamp-query status, and telemetry memory.
- Summarizes frame-budget pressure alongside dispatch activity.
- Accepts optional host-supplied hardware hints such as memory capacity or core
  count when a native or privileged runtime can provide them.
- Defaults to disabled so clients opt into the overhead explicitly.
- Keeps analytics/export outside the package; route any remote delivery through
  `@plasius/analytics`.

## Usage

```ts
import {
  createGpuDebugSession,
  gpuDebugQueueClasses,
  gpuPipelinePhases,
  gpuResourceCategories,
  summarizeFixedSppTelemetry,
  summarizeWavefrontTelemetry,
} from "@plasius/gpu-debug";

const debug = createGpuDebugSession({
  enabled: true,
  adapter: {
    label: "Apple M3 Max",
    maxComputeInvocationsPerWorkgroup: 1024,
    memoryCapacityHintBytes: 48 * 1024 * 1024 * 1024,
    coreCountHint: 40,
  },
});

console.log(gpuDebugQueueClasses);
console.log(gpuPipelinePhases);
console.log(gpuResourceCategories);

const releaseParticles = debug.trackAllocation({
  id: "particles.buffer",
  owner: "particles",
  category: "buffer",
  sizeBytes: 8 * 1024 * 1024,
  label: "Particle state",
});

debug.recordQueue({
  owner: "post-processing",
  queueClass: "post-processing",
  depth: 24,
  capacity: 64,
  frameId: "frame-101",
});

debug.recordReadyLane({
  owner: "lighting",
  queueClass: "lighting",
  laneId: "priority-4",
  priority: 4,
  depth: 5,
  capacity: 8,
  frameId: "frame-101",
});

debug.recordDispatch({
  id: "dispatch-101-post",
  owner: "post-processing",
  queueClass: "post-processing",
  jobType: "post.process",
  frameId: "frame-101",
  durationMs: 1.8,
  workgroups: { x: 48, y: 27, z: 1 },
  workgroupSize: { x: 8, y: 8, z: 1 },
  bytesRead: 2_097_152,
  bytesWritten: 1_048_576,
});

debug.recordDependencyUnlock({
  owner: "lighting",
  queueClass: "lighting",
  sourceJobType: "lighting.direct",
  unlockedJobType: "lighting.resolve",
  priority: 2,
  frameId: "frame-101",
});

debug.recordFrame({
  frameId: "frame-101",
  frameTimeMs: 16.9,
  targetFrameTimeMs: 16.67,
  gpuBusyMs: 8.2,
});

debug.recordPipelinePhase({
  owner: "physics",
  pipeline: "simulation",
  stage: "worldSnapshot",
  frameId: "frame-101",
  durationMs: 0.7,
  snapshotAgeFrames: 0,
  snapshotAgeMs: 0,
});

debug.recordWavefrontTelemetry({
  owner: "wavefront",
  queueClass: "render",
  frameId: "frame-101",
  bounceDepth: 0,
  activeRayCount: 128,
  queueCapacity: 256,
  hitBufferCount: 92,
  terminationReasons: [
    { reason: "emissive", count: 10 },
    { reason: "environment", count: 4 },
  ],
  hitKinds: [
    { kind: "triangle", count: 78 },
    { kind: "environment", count: 4 },
  ],
});

// Pass statistics already resolved by @plasius/gpu-renderer. This call never
// initiates a GPU readback or enables renderer diagnostics on its own.
debug.recordFixedSppTelemetry({
  owner: "wavefront",
  queueClass: "render",
  frameId: "frame-101",
  samplesPerPixel: rendererStats.samplesPerPixel,
  renderedSamplesPerPixel: rendererStats.renderedSamplesPerPixel,
  primaryRays: rendererStats.primaryRays,
  secondaryRays: rendererStats.secondaryRays,
  totalPathSegments: rendererStats.totalPathSegments,
  rayCounts: rendererStats.rayCounts,
  timings: rendererStats.timings,
  telemetryMemoryBytes: rendererStats.telemetryMemoryBytes,
});

const snapshot = debug.getSnapshot();
console.log(snapshot);
console.log(summarizeWavefrontTelemetry(snapshot.wavefront));
console.log(summarizeFixedSppTelemetry(snapshot.fixedSpp));
releaseParticles();
```

## Hardware Counter Policy

Portable WebGPU does not currently guarantee authoritative access to:

- raw GPU core count,
- total adapter memory,
- vendor-specific live occupancy counters.

`@plasius/gpu-debug` therefore exposes:

- tracked allocations reported by the caller,
- estimated invocation and workgroup totals from dispatch metadata,
- queue-depth and frame-budget summaries,
- DAG-ready lane and dependency-unlock summaries when integrations report them,
- pipeline phase and snapshot-lag summaries when integrations report them,
- wavefront queue, hit-buffer, termination, and bounce-depth summaries when
  integrations report compact telemetry,
- fixed-SPP ray, path-segment, timing, timestamp-query, and telemetry-memory
  evidence when renderer integrations report already-resolved frame statistics,
- optional hardware hints provided by the host runtime.

If a native shell, browser extension, or proprietary platform layer can provide
accurate hints, pass them in explicitly. Otherwise treat the session snapshot as
an inferred optimization aid rather than a full hardware profiler.

## API

- `createGpuDebugSession(options?)`
- `estimateDispatchInvocations(sample)`
- `summarizeFixedSppTelemetry(snapshot.fixedSpp)`
- `gpuDebugQueueClasses`
- `gpuPipelinePhases`
- `gpuResourceCategories`
- `summarizeWavefrontTelemetry(snapshot.wavefront)`

The exported constants are the docs-first enum contract for integrations that
need to validate or surface queue classes, pipeline phases, or tracked resource
categories without importing internal validation helpers.

`recordFixedSppTelemetry(sample)` accepts the fixed-SPP subset of the canonical
renderer frame statistics structurally, so `gpu-debug` does not need a runtime
dependency on the renderer. The method is a local ingestion boundary only: it
does not call a renderer, map a buffer, request timestamps, or read GPU memory.
Nullable secondary-ray, path-segment, and GPU-time values remain nullable in the
snapshot, while aggregates explicitly identify how many samples were measured.
GPU counter record cardinality is validated independently from the collapsed
bounce histogram: available evidence requires a positive
`capturedRayCounts === expectedRayCounts`, while histogram buckets must sum to
`totalPathSegments`. A renderer can therefore report many tile/sample/depth
records collapsed into a smaller per-bounce histogram without losing the exact
readback count.

## Worker and Frame Correlation

When worker-based packages use `@plasius/gpu-worker`, prefer passing stable
metadata and a shared `frameId` through the worker loop telemetry hooks.

```ts
import { createGpuDebugSession } from "@plasius/gpu-debug";
import { createWorkerLoop } from "@plasius/gpu-worker";

const debug = createGpuDebugSession({ enabled: true });

const loop = createWorkerLoop({
  device,
  frameId: () => `frame-${frameNumber}`,
  worker: {
    pipeline: workerPipeline,
    workgroups: [2, 1, 1],
    workgroupSize: 64,
    owner: "particles",
    queueClass: "simulation",
    jobType: "worker.dequeue",
  },
  jobs: [
    {
      pipeline: simulatePipeline,
      workgroupCount: [64, 1, 1],
      workgroupSize: [64, 1, 1],
      owner: "particles",
      queueClass: "simulation",
      jobType: "particles.simulate",
    },
  ],
  telemetry: {
    onDispatch(sample) {
      debug.recordDispatch({
        owner: sample.owner,
        queueClass: sample.queueClass,
        jobType: sample.jobType,
        frameId: sample.frameId,
        workgroups: sample.workgroups,
        workgroupSize: sample.workgroupSize,
      });
    },
  },
});

debug.recordFrame({
  frameId: `frame-${frameNumber}`,
  frameTimeMs,
  targetFrameTimeMs,
});
```

This keeps the package local-first: `@plasius/gpu-worker` emits local samples,
`@plasius/gpu-debug` stores and summarizes them, and any remote export still
belongs to `@plasius/analytics`.

For DAG-enabled integrations, callers can also feed ready-lane and dependency
unlock data into the same session:

```ts
debug.recordReadyLane({
  owner: "lighting",
  queueClass: "lighting",
  laneId: "priority-3",
  priority: 3,
  depth: 2,
  capacity: 8,
  frameId: `frame-${frameNumber}`,
});

debug.recordDependencyUnlock({
  owner: "lighting",
  queueClass: "lighting",
  sourceJobType: "lighting.cache",
  unlockedJobType: "lighting.resolve",
  priority: 2,
  frameId: `frame-${frameNumber}`,
});

debug.recordPipelinePhase({
  owner: "physics",
  pipeline: "simulation",
  stage: "worldSnapshot",
  frameId: `frame-${frameNumber}`,
  durationMs: 0.8,
});
```

## Analytics Integration

This package does not ship its own analytics client. If snapshots or events need
to leave the local runtime, route them through `@plasius/analytics`.

## Demo

Run the console demo locally:

```bash
npm run demo
```

See [demo/README.md](./demo/README.md) for details.

## Development Checks

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run pack:check
npm run zero-three
```

## Permanent Zero-Three invariant

`@plasius/gpu-debug` provides optional local-first WebGPU instrumentation.
Three.js, Three.js subpaths, TSL, `@types/three`, `@react-three/*`, and packages
whose dependency graph reaches Three.js are permanently prohibited from source,
manifests, locks, installed dependency graphs, declarations, optional debug
bundles, npm tarballs, SBOMs, tests, tooling, and active usage documentation.
There is no compatibility mode, waiver, rollback, or fallback.

Run `npm run zero-three:source` before dependency installation and `npm run
zero-three` after building and installing to generate complete package evidence.
The canonical architectural decision is the site ADR
[ADR 0168](https://github.com/Plasius-LTD/plasius-ltd-site/blob/main/docs/adrs/adr-0168-three-js-is-prohibited-from-gpu-native-rendering.md).

## Release Automation

GitHub Actions now carries the package delivery path:

- CI runs on pushes and pull requests to enforce lint, typecheck, audit, build,
  coverage, and package verification.
- CD publishes to npm only through the manual GitHub workflow.
- A scheduled workflow opens monthly npm audit-fix pull requests.

## Files

- `src/types.ts`: public debug types and snapshot contracts.
- `src/session.ts`: opt-in debug session runtime and summary generation.
- `src/validation.ts`: shared runtime validation helpers.
- `tests/*.test.ts`: unit coverage for session behavior and bounded histories.
- `docs/adrs/*`: package architecture decisions.
- `docs/tdrs/*`: implementation design records.
- `docs/design/*`: integration and NFR design detail.

<!-- BEGIN PLASIUS RELEASE INTEGRITY -->
## Release integrity

CI keeps the administrative contributor registry outside Git and npm package
artifacts using exact, case-normalised path checks. Repository-owned pull
requests and `main` execute on GitHub-hosted runners with Node.js 24.18.0 LTS.
Release preparation lands metadata through the protected branch, waits for
successful exact-commit CI, and then publishes the sealed package through npm
OIDC from the `production` environment. The release retains and attests the
SBOM and complete Zero-Three evidence, pins the npm release client to 11.6.2,
and rechecks the exact remote `main` commit immediately before publication;
there is no legacy npm token fallback.
<!-- END PLASIUS RELEASE INTEGRITY -->
