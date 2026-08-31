import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  createGpuDebugSession,
  estimateDispatchInvocations,
  gpuDebugQueueClasses,
  gpuPipelinePhases,
  gpuResourceCategories,
  summarizeFixedSppTelemetry,
  summarizeWavefrontTelemetry,
} from "../src/index.js";

describe("gpu debug session", () => {
  it("exports queue, pipeline, and resource category contracts from the package root", () => {
    expect(gpuDebugQueueClasses).toEqual([
      "render",
      "simulation",
      "lighting",
      "post-processing",
      "voxel",
      "transfer",
      "custom",
    ]);
    expect(gpuPipelinePhases).toEqual([
      "simulation",
      "secondary-simulation",
      "scene-preparation",
      "render",
    ]);
    expect(gpuResourceCategories).toEqual([
      "buffer",
      "texture",
      "bind-group",
      "pipeline",
      "custom",
    ]);
  });

  it("uses the public gpu-shared package surface for the browser demo", () => {
    const demoSource = fs.readFileSync(
      path.resolve(process.cwd(), "demo", "main.js"),
      "utf8"
    );
    const demoHtml = fs.readFileSync(
      path.resolve(process.cwd(), "demo", "index.html"),
      "utf8"
    );

    expect(demoSource).toContain('from "@plasius/gpu-shared"');
    expect(demoSource).not.toContain("node_modules/@plasius/gpu-shared/dist");
    expect(demoHtml).toContain('<script type="importmap">');
    expect(demoHtml).toContain(
      '"@plasius/gpu-shared": "../node_modules/@plasius/gpu-shared/dist/index.js"'
    );
  });

  it("defaults to disabled and ignores samples until enabled", () => {
    const session = createGpuDebugSession();

    expect(session.isEnabled()).toBe(false);
    expect(
      session.recordFrame({
        frameId: "frame-1",
        frameTimeMs: 16.7,
      })
    ).toBe(false);

    session.setEnabled(true);
    expect(
      session.recordFrame({
        frameId: "frame-1",
        frameTimeMs: 16.7,
      })
    ).toBe(true);
    expect(session.getSnapshot().frames.sampleCount).toBe(1);
  });

  it("tracks allocations and releases them safely", () => {
    const session = createGpuDebugSession({
      enabled: true,
      adapter: {
        memoryCapacityHintBytes: 1000,
      },
    });

    const releaseA = session.trackAllocation({
      id: "particles",
      owner: "particles",
      category: "buffer",
      sizeBytes: 400,
    });
    session.trackAllocation({
      id: "lighting",
      owner: "lighting",
      category: "texture",
      sizeBytes: 200,
    });

    let snapshot = session.getSnapshot();
    expect(snapshot.memory.totalTrackedBytes).toBe(600);
    expect(snapshot.memory.trackedUsageRatio).toBe(0.6);

    releaseA();
    snapshot = session.getSnapshot();
    expect(snapshot.memory.totalTrackedBytes).toBe(200);
    expect(session.releaseAllocation("missing")).toBe(false);
  });

  it("summarizes dispatch, queue, and frame samples", () => {
    const session = createGpuDebugSession({
      enabled: true,
      adapter: {
        coreCountHint: 24,
      },
    });

    session.recordQueue({
      owner: "post",
      queueClass: "post-processing",
      depth: 12,
      capacity: 24,
      frameId: "frame-2",
    });
    session.recordReadyLane({
      owner: "lighting",
      queueClass: "lighting",
      laneId: "priority-4",
      priority: 4,
      depth: 5,
      capacity: 8,
      frameId: "frame-2",
    });
    session.recordDispatch({
      owner: "post",
      queueClass: "post-processing",
      jobType: "post.process",
      frameId: "frame-2",
      durationMs: 2.5,
      workgroups: { x: 20, y: 10, z: 1 },
      workgroupSize: { x: 8, y: 8, z: 1 },
      bytesRead: 4096,
      bytesWritten: 2048,
    });
    session.recordDependencyUnlock({
      owner: "lighting",
      queueClass: "lighting",
      sourceJobType: "lighting.direct",
      unlockedJobType: "lighting.resolve",
      priority: 2,
      unlockCount: 2,
      frameId: "frame-2",
    });
    session.recordPipelinePhase({
      owner: "physics",
      pipeline: "simulation",
      stage: "worldSnapshot",
      frameId: "frame-2",
      durationMs: 0.7,
      snapshotAgeFrames: 0,
      snapshotAgeMs: 0,
    });
    session.recordPipelinePhase({
      owner: "particles",
      pipeline: "secondary-simulation",
      stage: "particles.fire.update",
      frameId: "frame-2",
      snapshotFrameId: "frame-2",
      durationMs: 0.5,
      snapshotAgeFrames: 0,
      snapshotAgeMs: 0.2,
    });
    session.recordFrame({
      frameId: "frame-2",
      frameTimeMs: 16.9,
      targetFrameTimeMs: 16.67,
      gpuBusyMs: 8.1,
    });

    const snapshot = session.getSnapshot();
    expect(snapshot.dispatch.sampleCount).toBe(1);
    expect(snapshot.dispatch.estimatedInvocations).toBe(12_800);
    expect(snapshot.dispatch.busyRatio).toBeCloseTo(2.5 / 16.9, 6);
    expect(snapshot.queues.peakUtilizationRatio).toBe(0.5);
    expect(snapshot.frames.averageGpuBusyMs).toBe(8.1);
    expect(snapshot.dag.readyLaneSampleCount).toBe(1);
    expect(snapshot.dag.peakReadyLaneUtilizationRatio).toBe(0.625);
    expect(snapshot.dag.totalUnlockCount).toBe(2);
    expect(snapshot.dag.byUnlockedJobType).toEqual([
      {
        owner: "lighting",
        queueClass: "lighting",
        unlockedJobType: "lighting.resolve",
        priority: 2,
        unlockCount: 2,
      },
    ]);
    expect(snapshot.pipeline.sampleCount).toBe(2);
    expect(snapshot.pipeline.totalDurationMs).toBeCloseTo(1.2, 6);
    expect(snapshot.pipeline.averageSnapshotAgeMs).toBeCloseTo(0.1, 6);
    expect(snapshot.pipeline.maxSnapshotAgeFrames).toBe(0);
    expect(snapshot.pipeline.byPipeline).toEqual([
      {
        pipeline: "simulation",
        sampleCount: 1,
        totalDurationMs: 0.7,
        averageDurationMs: 0.7,
        averageSnapshotAgeMs: 0,
        maxSnapshotAgeMs: 0,
        maxSnapshotAgeFrames: 0,
      },
      {
        pipeline: "secondary-simulation",
        sampleCount: 1,
        totalDurationMs: 0.5,
        averageDurationMs: 0.5,
        averageSnapshotAgeMs: 0.2,
        maxSnapshotAgeMs: 0.2,
        maxSnapshotAgeFrames: 0,
      },
    ]);
    expect(snapshot.limitations[1]).toContain("core-count");
  });

  it("summarizes wavefront queue, hit, and termination telemetry", () => {
    const session = createGpuDebugSession({
      enabled: true,
    });

    session.recordWavefrontTelemetry({
      owner: "wavefront",
      queueClass: "render",
      frameId: "frame-7",
      bounceDepth: 0,
      activeRayCount: 128,
      queueCapacity: 256,
      hitBufferCount: 96,
      terminationReasons: [
        { reason: "emissive", count: 12 },
        { reason: "environment", count: 4 },
      ],
      hitKinds: [
        { kind: "triangle", count: 80 },
        { kind: "environment", count: 4 },
      ],
    });
    session.recordWavefrontTelemetry({
      owner: "wavefront",
      queueClass: "render",
      frameId: "frame-7",
      bounceDepth: 1,
      activeRayCount: 48,
      queueCapacity: 64,
      overflowCount: 3,
      hitBufferCount: 44,
      terminationReasons: [
        { reason: "max-depth", count: 2 },
        { reason: "environment", count: 6 },
      ],
      hitKinds: [
        { kind: "triangle", count: 18 },
        { kind: "emissive", count: 9 },
      ],
    });

    const snapshot = session.getSnapshot();
    expect(snapshot.wavefront.sampleCount).toBe(2);
    expect(snapshot.wavefront.peakActiveRayCount).toBe(128);
    expect(snapshot.wavefront.totalOverflowCount).toBe(3);
    expect(snapshot.wavefront.maxBounceDepth).toBe(1);
    expect(snapshot.wavefront.byTerminationReason).toEqual([
      { reason: "emissive", count: 12 },
      { reason: "environment", count: 10 },
      { reason: "max-depth", count: 2 },
    ]);
    expect(snapshot.wavefront.byHitKind).toEqual([
      { kind: "triangle", count: 98 },
      { kind: "emissive", count: 9 },
      { kind: "environment", count: 4 },
    ]);
    expect(snapshot.wavefront.byBounceDepth).toEqual([
      {
        bounceDepth: 0,
        sampleCount: 1,
        averageActiveRayCount: 128,
        peakActiveRayCount: 128,
        averageHitBufferCount: 96,
        peakHitBufferCount: 96,
        totalOverflowCount: 0,
      },
      {
        bounceDepth: 1,
        sampleCount: 1,
        averageActiveRayCount: 48,
        peakActiveRayCount: 48,
        averageHitBufferCount: 44,
        peakHitBufferCount: 44,
        totalOverflowCount: 3,
      },
    ]);

    expect(summarizeWavefrontTelemetry(snapshot.wavefront)).toEqual([
      "Wavefront telemetry: 2 samples, peak 128 active rays, overflow 3, max bounce 1.",
      "Termination reasons: emissive=12, environment=10, max-depth=2.",
      "Hit kinds: triangle=98, emissive=9, environment=4.",
      "Bounce depth: b0 avg=128.0 peak=128; b1 avg=48.0 peak=48.",
    ]);
  });

  it("handles empty wavefront telemetry summaries", () => {
    const session = createGpuDebugSession({ enabled: true });
    expect(session.getSnapshot().wavefront.sampleCount).toBe(0);
    expect(summarizeWavefrontTelemetry(session.getSnapshot().wavefront)).toEqual([
      "Wavefront telemetry: no samples recorded.",
    ]);
  });

  it("summarizes sparse wavefront evidence without inventing hit data", () => {
    const session = createGpuDebugSession({ enabled: true });
    session.recordWavefrontTelemetry({
      owner: "wavefront",
      queueClass: "render",
      bounceDepth: 0,
      activeRayCount: 0,
    });

    const snapshot = session.getSnapshot().wavefront;
    expect(snapshot.peakQueueUtilizationRatio).toBeUndefined();
    expect(snapshot.averageHitBufferCount).toBeUndefined();
    expect(snapshot.byBounceDepth[0]?.peakHitBufferCount).toBeUndefined();
    expect(summarizeWavefrontTelemetry(snapshot)).toEqual([
      "Wavefront telemetry: 1 samples, peak 0 active rays, overflow 0, max bounce 0.",
      "Termination reasons: none recorded.",
      "Hit kinds: none recorded.",
      "Bounce depth: b0 avg=0.0 peak=0.",
    ]);
    expect(() =>
      session.recordWavefrontTelemetry({
        owner: "wavefront",
        queueClass: "render",
        bounceDepth: 0,
        activeRayCount: 0.5,
      })
    ).toThrow(/activeRayCount must be an integer/);
  });

  it("retains and summarizes fixed-SPP renderer baseline telemetry", () => {
    const session = createGpuDebugSession({
      enabled: true,
      maxRetainedFixedSppSamples: 2,
    });

    expect(
      session.recordFixedSppTelemetry({
        owner: "wavefront",
        queueClass: "render",
        frameId: "frame-8",
        samplesPerPixel: 2,
        renderedSamplesPerPixel: 2,
        primaryRays: 256,
        secondaryRays: 209,
        totalPathSegments: 465,
        rayCounts: {
          status: "available",
          source: "gpu-active-queue-readback",
          expectedPrimaryRays: 256,
          observedPrimaryRays: 256,
          secondaryRays: 209,
          totalPathSegments: 465,
          bounceHistogram: [256, 125, 84],
          capturedRayCounts: 3,
          expectedRayCounts: 3,
          reason: null,
        },
        timings: {
          status: "available",
          source: "timestamp-query",
          timestampQueryStatus: "available",
          totalGpuTimeMs: 8.25,
          totalRenderJobTimeMs: 9.5,
          classificationTimeMs: null,
          compactionTimeMs: null,
          samplingTimeMs: 8.25,
          reason: null,
        },
        telemetryMemoryBytes: 48,
      })
    ).toBe(true);

    session.recordFixedSppTelemetry({
      owner: "wavefront",
      queueClass: "render",
      frameId: "frame-9",
      samplesPerPixel: 2,
      renderedSamplesPerPixel: 1,
      primaryRays: 128,
      secondaryRays: null,
      totalPathSegments: null,
      rayCounts: {
        status: "unavailable",
        source: null,
        expectedPrimaryRays: 128,
        observedPrimaryRays: null,
        secondaryRays: null,
        totalPathSegments: null,
        bounceHistogram: [],
        capturedRayCounts: 0,
        expectedRayCounts: 3,
        reason: "gpu-work-not-awaited",
      },
      timings: {
        status: "fallback",
        source: "cpu-submit",
        timestampQueryStatus: "not-recorded",
        totalGpuTimeMs: null,
        totalRenderJobTimeMs: 4.5,
        classificationTimeMs: null,
        compactionTimeMs: null,
        samplingTimeMs: null,
        reason: "gpu-work-not-awaited",
      },
      telemetryMemoryBytes: 0,
    });

    const snapshot = session.getSnapshot().fixedSpp;
    expect(snapshot.sampleCount).toBe(2);
    expect(snapshot.measuredRayCountSampleCount).toBe(1);
    expect(snapshot.measuredGpuTimeSampleCount).toBe(1);
    expect(snapshot.totalPrimaryRays).toBe(384);
    expect(snapshot.totalMeasuredSecondaryRays).toBe(209);
    expect(snapshot.totalMeasuredPathSegments).toBe(465);
    expect(snapshot.averageMeasuredSecondaryRays).toBe(209);
    expect(snapshot.averageMeasuredPathSegments).toBe(465);
    expect(snapshot.averageGpuTimeMs).toBe(8.25);
    expect(snapshot.averageRenderJobTimeMs).toBe(7);
    expect(snapshot.peakTelemetryMemoryBytes).toBe(48);
    expect(snapshot.byRayCountStatus).toEqual([
      { status: "available", count: 1 },
      { status: "unavailable", count: 1 },
    ]);
    expect(snapshot.byTimestampQueryStatus).toEqual([
      { status: "available", count: 1 },
      { status: "not-recorded", count: 1 },
    ]);
    expect(snapshot.latest?.frameId).toBe("frame-9");

    expect(summarizeFixedSppTelemetry(snapshot)).toEqual([
      "Fixed-SPP telemetry: 2 samples, 384 primary rays, 209 measured secondary rays, 465 measured path segments.",
      "Timing: GPU avg 8.25 ms from 1 sample; render-job avg 7.00 ms from 2 samples.",
      "Evidence: ray counts available=1, unavailable=1; timestamp queries available=1, not-recorded=1; peak telemetry memory 48 bytes.",
    ]);
  });

  it("keeps fixed-SPP diagnostics disabled, bounded, abortable, and resettable", () => {
    const session = createGpuDebugSession({ maxRetainedFixedSppSamples: 1 });
    const sample = {
      owner: "wavefront",
      queueClass: "render" as const,
      frameId: "frame-1",
      samplesPerPixel: 1,
      renderedSamplesPerPixel: 1,
      primaryRays: 64,
      secondaryRays: 8,
      totalPathSegments: 72,
      rayCounts: {
        status: "available" as const,
        source: "gpu-active-queue-readback" as const,
        expectedPrimaryRays: 64,
        observedPrimaryRays: 64,
        secondaryRays: 8,
        totalPathSegments: 72,
        bounceHistogram: [64, 8],
        capturedRayCounts: 2,
        expectedRayCounts: 2,
        reason: null,
      },
      timings: {
        status: "fallback" as const,
        source: "queue-completion" as const,
        timestampQueryStatus: "unsupported" as const,
        totalGpuTimeMs: null,
        totalRenderJobTimeMs: 3,
        classificationTimeMs: null,
        compactionTimeMs: null,
        samplingTimeMs: null,
        reason: "timestamp-query-unsupported",
      },
      telemetryMemoryBytes: 32,
    };

    expect(session.recordFixedSppTelemetry(sample)).toBe(false);
    expect(session.getSnapshot().fixedSpp.sampleCount).toBe(0);

    session.setEnabled(true);
    const controller = new AbortController();
    controller.abort();
    expect(
      session.recordFixedSppTelemetry({ ...sample, signal: controller.signal })
    ).toBe(false);

    expect(session.recordFixedSppTelemetry(sample)).toBe(true);
    expect(
      session.recordFixedSppTelemetry({
        ...sample,
        frameId: "frame-2",
        primaryRays: 32,
        secondaryRays: null,
        totalPathSegments: null,
        rayCounts: {
          ...sample.rayCounts,
          status: "not-requested",
          source: null,
          expectedPrimaryRays: 32,
          observedPrimaryRays: null,
          secondaryRays: null,
          totalPathSegments: null,
          bounceHistogram: [],
          capturedRayCounts: 0,
          reason: null,
        },
        telemetryMemoryBytes: 0,
      })
    ).toBe(true);
    expect(session.getSnapshot().fixedSpp.sampleCount).toBe(1);
    expect(session.getSnapshot().fixedSpp.latest?.frameId).toBe("frame-2");

    session.reset();
    expect(session.getSnapshot().fixedSpp.sampleCount).toBe(0);
    expect(summarizeFixedSppTelemetry(session.getSnapshot().fixedSpp)).toEqual([
      "Fixed-SPP telemetry: no samples recorded.",
    ]);
  });

  it("rejects incoherent fixed-SPP renderer evidence", () => {
    const session = createGpuDebugSession({ enabled: true });
    const invalid = {
      owner: "wavefront",
      queueClass: "render" as const,
      samplesPerPixel: 1,
      renderedSamplesPerPixel: 1,
      primaryRays: 64,
      secondaryRays: 8,
      totalPathSegments: 71,
      rayCounts: {
        status: "available" as const,
        source: "gpu-active-queue-readback" as const,
        expectedPrimaryRays: 64,
        observedPrimaryRays: 64,
        secondaryRays: 8,
        totalPathSegments: 72,
        bounceHistogram: [64, 8],
        capturedRayCounts: 2,
        expectedRayCounts: 2,
        reason: null,
      },
      timings: {
        status: "available" as const,
        source: "timestamp-query" as const,
        timestampQueryStatus: "available" as const,
        totalGpuTimeMs: 3,
        totalRenderJobTimeMs: 4,
        classificationTimeMs: null,
        compactionTimeMs: null,
        samplingTimeMs: 3,
        reason: null,
      },
      telemetryMemoryBytes: 48,
    };

    expect(() => session.recordFixedSppTelemetry(invalid)).toThrow(
      /fixedSpp.totalPathSegments must match fixedSpp.rayCounts.totalPathSegments/
    );
  });

  it("fails closed for malformed fixed-SPP counters and timing evidence", () => {
    const session = createGpuDebugSession({ enabled: true });
    const makeSample = () => ({
      owner: "wavefront",
      queueClass: "render" as const,
      samplesPerPixel: 2,
      renderedSamplesPerPixel: 2,
      primaryRays: 64,
      secondaryRays: 8 as number | null,
      totalPathSegments: 72 as number | null,
      rayCounts: {
        status: "available" as const,
        source: "gpu-active-queue-readback" as
          | "gpu-active-queue-readback"
          | null,
        expectedPrimaryRays: 64 as number | null,
        observedPrimaryRays: 64 as number | null,
        secondaryRays: 8 as number | null,
        totalPathSegments: 72 as number | null,
        bounceHistogram: [64, 8] as readonly number[],
        capturedRayCounts: 2,
        expectedRayCounts: 2,
        reason: null as string | null,
      },
      timings: {
        status: "available" as
          | "not-requested"
          | "available"
          | "fallback"
          | "unavailable"
          | "failed",
        source: "timestamp-query" as
          | "timestamp-query"
          | "queue-completion"
          | "cpu-submit"
          | null,
        timestampQueryStatus: "available" as
          | "not-recorded"
          | "available"
          | "unsupported"
          | "failed",
        totalGpuTimeMs: 3 as number | null,
        totalRenderJobTimeMs: 4,
        classificationTimeMs: null as number | null,
        compactionTimeMs: null as number | null,
        samplingTimeMs: 3 as number | null,
        reason: null as string | null,
      },
      telemetryMemoryBytes: 48,
    });

    const cases: readonly [RegExp, (sample: ReturnType<typeof makeSample>) => void][] = [
      [/rayCounts must be an object/, (sample) => {
        sample.rayCounts = null as never;
      }],
      [/bounceHistogram must be an array/, (sample) => {
        sample.rayCounts.bounceHistogram = "invalid" as never;
      }],
      [/expectedPrimaryRays must be null or an integer/, (sample) => {
        sample.rayCounts.expectedPrimaryRays = 1.5;
      }],
      [/primaryRays must be an integer/, (sample) => {
        sample.primaryRays = 1.5;
      }],
      [/totalGpuTimeMs must be null or a finite number/, (sample) => {
        sample.timings.totalGpuTimeMs = undefined as never;
      }],
      [/totalRenderJobTimeMs must be a finite number/, (sample) => {
        sample.timings.totalRenderJobTimeMs = undefined as never;
      }],
      [/samplesPerPixel must be an integer greater than zero/, (sample) => {
        sample.samplesPerPixel = undefined as never;
      }],
      [/reason must be null or a non-empty string/, (sample) => {
        sample.timings.reason = "";
      }],
      [/capturedRayCounts must match/, (sample) => {
        sample.rayCounts.capturedRayCounts = 1;
      }],
      [/available fixedSpp\.rayCounts require/, (sample) => {
        sample.rayCounts.source = null;
      }],
      [/available fixedSpp\.rayCounts require/, (sample) => {
        sample.rayCounts.expectedPrimaryRays = null;
      }],
      [/available fixedSpp\.rayCounts require/, (sample) => {
        sample.rayCounts.observedPrimaryRays = null;
      }],
      [/available fixedSpp\.rayCounts require/, (sample) => {
        sample.rayCounts.secondaryRays = null;
      }],
      [/available fixedSpp\.rayCounts require/, (sample) => {
        sample.rayCounts.totalPathSegments = null;
      }],
      [/bounce histogram must sum/, (sample) => {
        sample.rayCounts.bounceHistogram = [64, 7];
      }],
      [/timings must be an object/, (sample) => {
        sample.timings = null as never;
      }],
      [/timings\.source must be one of/, (sample) => {
        sample.timings.source = "invalid" as never;
      }],
      [/available timestamp-query evidence requires/, (sample) => {
        sample.timings.status = "fallback";
      }],
      [/available timestamp-query evidence requires/, (sample) => {
        sample.timings.source = null;
      }],
      [/available timestamp-query evidence requires/, (sample) => {
        sample.timings.totalGpuTimeMs = null;
      }],
      [/signal must be an AbortSignal/, (sample) => {
        (sample as typeof sample & { signal: unknown }).signal = {};
      }],
      [/renderedSamplesPerPixel cannot exceed/, (sample) => {
        sample.renderedSamplesPerPixel = 3;
      }],
      [/secondaryRays must match/, (sample) => {
        sample.secondaryRays = 9;
      }],
      [/must both be measured or both be null/, (sample) => {
        sample.totalPathSegments = null;
        sample.rayCounts.totalPathSegments = null;
        sample.rayCounts.status = "unavailable" as never;
      }],
      [/must equal primaryRays plus secondaryRays/, (sample) => {
        sample.totalPathSegments = 71;
        sample.rayCounts.totalPathSegments = 71;
        sample.rayCounts.bounceHistogram = [64, 7];
      }],
      [/expectedPrimaryRays/, (sample) => {
        sample.rayCounts.expectedPrimaryRays = 63;
      }],
      [/observedPrimaryRays/, (sample) => {
        sample.rayCounts.observedPrimaryRays = 63;
      }],
    ];

    for (const [message, mutate] of cases) {
      const sample = makeSample();
      mutate(sample);
      expect(() => session.recordFixedSppTelemetry(sample)).toThrow(message);
    }
  });

  it("reports unavailable fixed-SPP GPU timing without inventing a zero", () => {
    const session = createGpuDebugSession({ enabled: true });
    session.recordFixedSppTelemetry({
      owner: "wavefront",
      queueClass: "render",
      samplesPerPixel: 1,
      renderedSamplesPerPixel: 1,
      primaryRays: 32,
      secondaryRays: null,
      totalPathSegments: null,
      rayCounts: {
        status: "not-requested",
        source: null,
        expectedPrimaryRays: 32,
        observedPrimaryRays: null,
        secondaryRays: null,
        totalPathSegments: null,
        bounceHistogram: [],
        capturedRayCounts: 0,
        expectedRayCounts: 0,
        reason: null,
      },
      timings: {
        status: "not-requested",
        source: null,
        timestampQueryStatus: "not-recorded",
        totalGpuTimeMs: null,
        totalRenderJobTimeMs: 0,
        classificationTimeMs: null,
        compactionTimeMs: null,
        samplingTimeMs: null,
        reason: null,
      },
      telemetryMemoryBytes: 0,
    });

    expect(summarizeFixedSppTelemetry(session.getSnapshot().fixedSpp)[1]).toBe(
      "Timing: GPU unavailable from 0 samples; render-job avg 0.00 ms from 1 sample."
    );
  });

  it("bounds retained histories and ignores aborted inputs", () => {
    const controller = new AbortController();
    controller.abort();

    const session = createGpuDebugSession({
      enabled: true,
      maxRetainedDispatches: 2,
      maxRetainedQueueSamples: 2,
      maxRetainedReadyLaneSamples: 2,
      maxRetainedDependencyUnlockSamples: 2,
      maxRetainedPipelinePhaseSamples: 2,
      maxRetainedFrameSamples: 2,
      maxTrackedAllocations: 1,
    });

    session.trackAllocation({
      id: "a",
      owner: "renderer",
      category: "buffer",
      sizeBytes: 10,
    });
    session.trackAllocation({
      id: "b",
      owner: "renderer",
      category: "buffer",
      sizeBytes: 20,
    });

    session.recordDispatch({
      owner: "renderer",
      queueClass: "render",
      jobType: "render.prepare",
      frameId: "f1",
      durationMs: 1,
      workgroups: { x: 1, y: 1, z: 1 },
    });
    session.recordDispatch({
      owner: "renderer",
      queueClass: "render",
      jobType: "render.prepare",
      frameId: "f2",
      durationMs: 1,
      workgroups: { x: 1, y: 1, z: 1 },
    });
    session.recordDispatch({
      owner: "renderer",
      queueClass: "render",
      jobType: "render.prepare",
      frameId: "f3",
      durationMs: 1,
      workgroups: { x: 1, y: 1, z: 1 },
    });

    session.recordQueue({
      owner: "renderer",
      queueClass: "render",
      depth: 1,
    });
    session.recordQueue({
      owner: "renderer",
      queueClass: "render",
      depth: 2,
    });
    session.recordQueue({
      owner: "renderer",
      queueClass: "render",
      depth: 3,
    });

    session.recordReadyLane({
      owner: "lighting",
      queueClass: "lighting",
      laneId: "priority-3",
      priority: 3,
      depth: 1,
    });
    session.recordReadyLane({
      owner: "lighting",
      queueClass: "lighting",
      laneId: "priority-2",
      priority: 2,
      depth: 2,
    });
    session.recordReadyLane({
      owner: "lighting",
      queueClass: "lighting",
      laneId: "priority-1",
      priority: 1,
      depth: 3,
    });

    session.recordDependencyUnlock({
      owner: "lighting",
      queueClass: "lighting",
      sourceJobType: "lighting.direct",
      unlockedJobType: "lighting.cache",
    });
    session.recordDependencyUnlock({
      owner: "lighting",
      queueClass: "lighting",
      sourceJobType: "lighting.cache",
      unlockedJobType: "lighting.resolve",
    });
    session.recordDependencyUnlock({
      owner: "lighting",
      queueClass: "lighting",
      sourceJobType: "lighting.resolve",
      unlockedJobType: "lighting.present",
    });

    session.recordFrame({
      frameId: "f1",
      frameTimeMs: 16,
    });
    session.recordFrame({
      frameId: "f2",
      frameTimeMs: 17,
    });
    session.recordFrame({
      frameId: "f3",
      frameTimeMs: 18,
    });
    session.recordPipelinePhase({
      owner: "physics",
      pipeline: "simulation",
      stage: "authoritativeCommit",
      durationMs: 0.3,
    });
    session.recordPipelinePhase({
      owner: "physics",
      pipeline: "simulation",
      stage: "worldSnapshot",
      durationMs: 0.4,
    });
    session.recordPipelinePhase({
      owner: "particles",
      pipeline: "secondary-simulation",
      stage: "particles.fire.update",
      durationMs: 0.5,
    });

    expect(
      session.recordFrame({
        frameId: "ignored",
        frameTimeMs: 20,
        signal: controller.signal,
      })
    ).toBe(false);

    const snapshot = session.getSnapshot();
    expect(snapshot.memory.allocationCount).toBe(1);
    expect(snapshot.dispatch.sampleCount).toBe(2);
    expect(snapshot.queues.sampleCount).toBe(2);
    expect(snapshot.frames.sampleCount).toBe(2);
    expect(snapshot.dag.readyLaneSampleCount).toBe(2);
    expect(snapshot.dag.dependencyUnlockSampleCount).toBe(2);
    expect(snapshot.pipeline.sampleCount).toBe(2);
    expect(snapshot.frames.latestFrameTimeMs).toBe(18);
  });

  it("resets DAG diagnostics alongside the rest of the session", () => {
    const session = createGpuDebugSession({ enabled: true });

    session.recordReadyLane({
      owner: "particles",
      queueClass: "simulation",
      laneId: "priority-2",
      priority: 2,
      depth: 4,
    });
    session.recordDependencyUnlock({
      owner: "particles",
      queueClass: "simulation",
      sourceJobType: "particles.simulate",
      unlockedJobType: "particles.render",
    });
    session.recordPipelinePhase({
      owner: "physics",
      pipeline: "simulation",
      stage: "worldSnapshot",
      durationMs: 0.4,
    });

    session.reset();

    const snapshot = session.getSnapshot();
    expect(snapshot.dag.readyLaneSampleCount).toBe(0);
    expect(snapshot.dag.dependencyUnlockSampleCount).toBe(0);
    expect(snapshot.dag.totalUnlockCount).toBe(0);
    expect(snapshot.pipeline.sampleCount).toBe(0);
  });

  it("validates pipeline phase samples", () => {
    const session = createGpuDebugSession({ enabled: true });

    expect(() =>
      session.recordPipelinePhase({
        owner: "physics",
        pipeline: "unknown" as never,
        stage: "worldSnapshot",
      })
    ).toThrow(/pipelinePhase.pipeline must be one of/);

    expect(() =>
      session.recordPipelinePhase({
        owner: "physics",
        pipeline: "simulation",
        stage: "worldSnapshot",
        snapshotAgeFrames: 0.5,
      })
    ).toThrow(/pipelinePhase.snapshotAgeFrames must be an integer/);
  });

  it("estimates invocation counts from dispatch metadata", () => {
    expect(
      estimateDispatchInvocations({
        owner: "voxels",
        queueClass: "voxel",
        jobType: "voxel.build",
        workgroups: { x: 4, y: 4, z: 2 },
        workgroupSize: { x: 8, y: 8, z: 1 },
      })
    ).toBe(2048);
  });
});
