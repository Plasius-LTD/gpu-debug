import { describe, expect, it } from "vitest";

import {
  createGpuDebugSession,
  estimateDispatchInvocations,
} from "../src/index.js";

describe("gpu debug session", () => {
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
    expect(snapshot.limitations[1]).toContain("core-count");
  });

  it("bounds retained histories and ignores aborted inputs", () => {
    const controller = new AbortController();
    controller.abort();

    const session = createGpuDebugSession({
      enabled: true,
      maxRetainedDispatches: 2,
      maxRetainedQueueSamples: 2,
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
    expect(snapshot.frames.latestFrameTimeMs).toBe(18);
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
