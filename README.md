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

## What It Solves

- Exposes tracked GPU allocation totals by owner and category.
- Records queue depth, dispatch timings, and estimated invocation counts.
- Records DAG-ready lane depth and dependency-unlock activity when integrations
  supply those samples.
- Summarizes frame-budget pressure alongside dispatch activity.
- Accepts optional host-supplied hardware hints such as memory capacity or core
  count when a native or privileged runtime can provide them.
- Defaults to disabled so clients opt into the overhead explicitly.
- Keeps analytics/export outside the package; route any remote delivery through
  `@plasius/analytics`.

## Usage

```ts
import { createGpuDebugSession } from "@plasius/gpu-debug";

const debug = createGpuDebugSession({
  enabled: true,
  adapter: {
    label: "Apple M3 Max",
    maxComputeInvocationsPerWorkgroup: 1024,
    memoryCapacityHintBytes: 48 * 1024 * 1024 * 1024,
    coreCountHint: 40,
  },
});

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

console.log(debug.getSnapshot());
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
- optional hardware hints provided by the host runtime.

If a native shell, browser extension, or proprietary platform layer can provide
accurate hints, pass them in explicitly. Otherwise treat the session snapshot as
an inferred optimization aid rather than a full hardware profiler.

## API

- `createGpuDebugSession(options?)`
- `estimateDispatchInvocations(sample)`

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
```

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
