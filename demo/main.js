import { createGpuDebugSession } from "../dist/index.js";
import { mountHarborShowcase } from "./harbor-runtime.js";

const root = globalThis.document?.getElementById("app");
if (!root) {
  throw new Error("Debug demo root element was not found.");
}

function createState() {
  const session = createGpuDebugSession({
    enabled: true,
    adapter: {
      label: "package-local harbor demo",
      memoryCapacityHintBytes: 6 * 1024 * 1024 * 1024,
      coreCountHint: 12,
    },
  });
  session.trackAllocation({
    id: "demo.color",
    owner: "renderer",
    category: "texture",
    sizeBytes: 1280 * 720 * 4,
    label: "Main color buffer",
  });
  session.trackAllocation({
    id: "demo.ship-mesh",
    owner: "scene",
    category: "buffer",
    sizeBytes: 6 * 1024 * 1024,
    label: "Ship mesh data",
  });
  return {
    session,
    frameId: 0,
  };
}

function updateState(state, scene, dt) {
  state.frameId += 1;
  const frameId = `debug-${state.frameId}`;
  const dispatchDurationMs = 0.8 + scene.sprays.length * 0.04 + (scene.stress ? 1.4 : 0);
  state.session.recordQueue({
    owner: "renderer",
    queueClass: "render",
    depth: 4 + Math.round(scene.sprays.length / 2) + (scene.stress ? 6 : 0),
    capacity: 32,
    frameId,
  });
  state.session.recordDispatch({
    owner: "renderer",
    queueClass: "render",
    jobType: "harbor.compose",
    frameId,
    durationMs: dispatchDurationMs,
    workgroups: { x: 24, y: 16, z: 1 },
    workgroupSize: { x: 8, y: 8, z: 1 },
  });
  state.session.recordReadyLane({
    owner: "scene",
    queueClass: "render",
    laneId: "primary",
    priority: 840,
    depth: 2 + Math.round(Math.max(0, Math.sin(scene.time * 1.4)) * 8),
    capacity: 16,
    frameId,
  });
  state.session.recordDependencyUnlock({
    owner: "scene",
    queueClass: "render",
    sourceJobType: "physics.resolve",
    unlockedJobType: "render.compose",
    priority: 840,
    unlockCount: 1 + Math.round(Math.max(0, Math.cos(scene.time * 0.9)) * 4),
    frameId,
  });
  state.session.recordPipelinePhase({
    owner: "scene",
    pipeline: "scene-preparation",
    stage: "stable-visual-snapshot",
    frameId,
    durationMs: Math.max(1, dt * 1000 * (scene.stress ? 1.6 : 1.05)),
    snapshotAgeMs: scene.stress ? 12 : 6,
  });
  state.session.recordFrame({
    frameId,
    frameTimeMs: dispatchDurationMs + 13.8,
    targetFrameTimeMs: 16.67,
    gpuBusyMs: dispatchDurationMs + 8.2,
    dropped: scene.stress && dispatchDurationMs > 2,
  });
  return state;
}

function describeState(state) {
  const snapshot = state.session.getSnapshot();
  return {
    status: `Debug live · ${snapshot.frames.sampleCount} frame samples`,
    details:
      `Queue depth, dispatch time, ready-lane pressure, and pipeline phases are now sampled directly against the same local harbor scene.`,
    sceneMetrics: [
      `frame samples: ${snapshot.frames.sampleCount}`,
      `queue samples: ${snapshot.queues.sampleCount}`,
      `dispatch samples: ${snapshot.dispatch.sampleCount}`,
      `pipeline samples: ${snapshot.pipeline.sampleCount}`,
    ],
    qualityMetrics: [
      `avg frame: ${(snapshot.frames.averageFrameTimeMs ?? 0).toFixed(2)} ms`,
      `avg gpu busy: ${(snapshot.frames.averageGpuBusyMs ?? 0).toFixed(2)} ms`,
      `avg dispatch: ${(snapshot.dispatch.averageDurationMs ?? 0).toFixed(2)} ms`,
      `ready lane peak: ${(snapshot.dag.peakReadyLaneDepth ?? 0).toFixed(1)}`,
    ],
    debugMetrics: [
      `tracked memory: ${(snapshot.memory.totalTrackedBytes / (1024 * 1024)).toFixed(1)} MB`,
      `peak queue depth: ${(snapshot.queues.peakDepth ?? 0).toFixed(1)}`,
      `dependency unlock total: ${(snapshot.dag.totalUnlockCount ?? 0).toFixed(1)}`,
      `snapshot lag: ${(snapshot.pipeline.averageSnapshotAgeMs ?? 0).toFixed(2)} ms`,
    ],
    notes: [
      "The debug demo now rides on the shared @plasius/gpu-shared harbor runtime so telemetry is attached to the same family-owned scene pipeline.",
      "Stress mode drives queue depth and dispatch timing higher so the telemetry overlays react immediately.",
      "The scene remains a real 3D harbor while the package exposes its instrumentation state.",
    ],
    textState: {
      frameSamples: snapshot.frames.sampleCount,
      queueSamples: snapshot.queues.sampleCount,
      dispatchAverageMs: Number((snapshot.dispatch.averageDurationMs ?? 0).toFixed(2)),
      trackedMemoryBytes: snapshot.memory.totalTrackedBytes,
    },
    visuals: {
      waveAmplitude: snapshot.queues.peakDepth > 8 ? 0.82 : 0.64,
      flagMotion: snapshot.dag.peakReadyLaneDepth > 6 ? 0.66 : 0.52,
      reflectionStrength: snapshot.frames.averageGpuBusyMs && snapshot.frames.averageGpuBusyMs > 10 ? 0.18 : 0.12,
      shadowAccent: snapshot.dispatch.averageDurationMs && snapshot.dispatch.averageDurationMs > 1.6 ? 0.08 : 0.04,
      seaTop: "#214f65",
      seaMid: "#103c52",
      seaBottom: "#082231",
      skyTop: "#edf5fa",
      skyMid: "#bed2de",
      skyBottom: "#7ca0b5",
      flagColor: snapshot.frames.droppedCount > 0 ? { r: 0.8, g: 0.32, b: 0.18 } : { r: 0.72, g: 0.24, b: 0.18 },
    },
  };
}

await mountHarborShowcase({
  root,
  packageName: "@plasius/gpu-debug",
  title: "Debug Telemetry in a 3D Harbor",
  subtitle:
    "Family-coordinated 3D validation for queue, dispatch, and pipeline instrumentation, overlaid on the same harbor scene the metrics describe.",
  createState,
  updateState,
  describeState,
});
