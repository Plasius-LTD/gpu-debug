import { createGpuDebugSession } from "../src/index.js";

const debug = createGpuDebugSession({
  enabled: true,
  adapter: {
    label: "XR development kit",
    maxComputeInvocationsPerWorkgroup: 512,
    memoryCapacityHintBytes: 12 * 1024 * 1024 * 1024,
    coreCountHint: 24,
  },
});

const releaseRenderTargets = debug.trackAllocation({
  id: "renderer.targets",
  owner: "renderer",
  category: "texture",
  sizeBytes: 48 * 1024 * 1024,
  label: "Primary render targets",
});

debug.recordQueue({
  owner: "lighting",
  queueClass: "lighting",
  depth: 18,
  capacity: 32,
  frameId: "frame-1",
});

debug.recordDispatch({
  id: "dispatch-1",
  owner: "lighting",
  queueClass: "lighting",
  jobType: "lighting.update",
  frameId: "frame-1",
  durationMs: 2.4,
  workgroups: { x: 32, y: 18, z: 1 },
  workgroupSize: { x: 8, y: 8, z: 1 },
  bytesRead: 1_572_864,
  bytesWritten: 524_288,
});

debug.recordFrame({
  frameId: "frame-1",
  frameTimeMs: 13.9,
  targetFrameTimeMs: 13.89,
  gpuBusyMs: 7.4,
});

console.log(JSON.stringify(debug.getSnapshot(), null, 2));

releaseRenderTargets();
