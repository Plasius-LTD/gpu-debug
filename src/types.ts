export type GpuDebugQueueClass =
  | "render"
  | "simulation"
  | "lighting"
  | "post-processing"
  | "voxel"
  | "transfer"
  | "custom";

export type GpuResourceCategory =
  | "buffer"
  | "texture"
  | "bind-group"
  | "pipeline"
  | "custom";

export type GpuPipelinePhase =
  | "simulation"
  | "secondary-simulation"
  | "scene-preparation"
  | "render";

export interface GpuVector3 {
  x: number;
  y?: number;
  z?: number;
}

export interface GpuDebugAdapterInfo {
  label?: string;
  vendor?: string;
  architecture?: string;
  driver?: string;
  maxBufferSizeBytes?: number;
  maxStorageBufferBindingSizeBytes?: number;
  maxComputeInvocationsPerWorkgroup?: number;
  maxComputeWorkgroupsPerDimension?: number;
  memoryCapacityHintBytes?: number;
  coreCountHint?: number;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface GpuDebugSessionOptions {
  enabled?: boolean;
  adapter?: GpuDebugAdapterInfo;
  maxRetainedDispatches?: number;
  maxRetainedQueueSamples?: number;
  maxRetainedReadyLaneSamples?: number;
  maxRetainedDependencyUnlockSamples?: number;
  maxRetainedPipelinePhaseSamples?: number;
  maxRetainedWavefrontSamples?: number;
  maxRetainedFixedSppSamples?: number;
  maxRetainedFrameSamples?: number;
  maxTrackedAllocations?: number;
}

export interface TrackedGpuAllocation {
  id: string;
  owner: string;
  category: GpuResourceCategory;
  sizeBytes: number;
  label?: string;
  signal?: AbortSignal;
}

export interface GpuQueueSample {
  owner: string;
  queueClass: GpuDebugQueueClass;
  depth: number;
  capacity?: number;
  frameId?: string;
  signal?: AbortSignal;
}

export interface GpuReadyLaneSample {
  owner: string;
  queueClass: GpuDebugQueueClass;
  laneId: string;
  priority?: number;
  depth: number;
  capacity?: number;
  frameId?: string;
  signal?: AbortSignal;
}

export interface GpuDispatchSample {
  id?: string;
  owner: string;
  queueClass: GpuDebugQueueClass;
  jobType: string;
  frameId?: string;
  durationMs?: number;
  workgroups: GpuVector3;
  workgroupSize?: GpuVector3;
  bytesRead?: number;
  bytesWritten?: number;
  signal?: AbortSignal;
}

export interface GpuFrameSample {
  frameId?: string;
  frameTimeMs: number;
  targetFrameTimeMs?: number;
  gpuBusyMs?: number;
  dropped?: boolean;
  signal?: AbortSignal;
}

export interface GpuDependencyUnlockSample {
  owner: string;
  queueClass: GpuDebugQueueClass;
  sourceJobType: string;
  unlockedJobType: string;
  priority?: number;
  unlockCount?: number;
  frameId?: string;
  signal?: AbortSignal;
}

export interface GpuPipelinePhaseSample {
  owner: string;
  pipeline: GpuPipelinePhase;
  stage: string;
  frameId?: string;
  durationMs?: number;
  snapshotFrameId?: string;
  snapshotAgeFrames?: number;
  snapshotAgeMs?: number;
  signal?: AbortSignal;
}

export interface GpuWavefrontHitKindSample {
  kind: string;
  count: number;
}

export interface GpuWavefrontTerminationSample {
  reason: string;
  count: number;
}

export interface GpuWavefrontTelemetrySample {
  owner: string;
  queueClass: GpuDebugQueueClass;
  frameId?: string;
  bounceDepth: number;
  activeRayCount: number;
  queueCapacity?: number;
  overflowCount?: number;
  hitBufferCount?: number;
  hitKinds?: readonly GpuWavefrontHitKindSample[];
  terminationReasons?: readonly GpuWavefrontTerminationSample[];
  signal?: AbortSignal;
}

/** Availability state reported by the renderer for exact per-bounce ray counts. */
export type GpuFixedSppRayCountStatus =
  | "not-requested"
  | "available"
  | "unavailable"
  | "failed";

/** Timing evidence state reported by the renderer for one fixed-SPP frame. */
export type GpuFixedSppTimingStatus =
  | "not-requested"
  | "available"
  | "fallback"
  | "unavailable"
  | "failed";

/** Timestamp-query availability reported by the renderer. */
export type GpuFixedSppTimestampQueryStatus =
  | "not-recorded"
  | "available"
  | "unsupported"
  | "failed";

/** Exact, structurally compatible ray-count evidence from a renderer frame. */
export interface GpuFixedSppRayCountTelemetry {
  readonly status: GpuFixedSppRayCountStatus;
  readonly source: "gpu-active-queue-readback" | null;
  readonly expectedPrimaryRays: number | null;
  readonly observedPrimaryRays: number | null;
  readonly secondaryRays: number | null;
  readonly totalPathSegments: number | null;
  readonly bounceHistogram: readonly number[];
  readonly capturedRayCounts: number;
  readonly expectedRayCounts: number;
  readonly reason: string | null;
}

/** Timing evidence from a fixed-SPP renderer frame. */
export interface GpuFixedSppFrameTimingTelemetry {
  readonly status: GpuFixedSppTimingStatus;
  readonly source: "timestamp-query" | "queue-completion" | "cpu-submit" | null;
  readonly timestampQueryStatus: GpuFixedSppTimestampQueryStatus;
  readonly totalGpuTimeMs: number | null;
  readonly totalRenderJobTimeMs: number;
  readonly classificationTimeMs: number | null;
  readonly compactionTimeMs: number | null;
  readonly samplingTimeMs: number | null;
  readonly reason: string | null;
}

/**
 * Caller-reported fixed-SPP frame evidence. Recording this sample never starts a
 * readback; callers pass an already-resolved renderer statistics snapshot.
 */
export interface GpuFixedSppTelemetrySample {
  owner: string;
  queueClass: GpuDebugQueueClass;
  frameId?: string;
  samplesPerPixel: number;
  renderedSamplesPerPixel: number;
  primaryRays: number;
  secondaryRays: number | null;
  totalPathSegments: number | null;
  rayCounts: GpuFixedSppRayCountTelemetry;
  timings: GpuFixedSppFrameTimingTelemetry;
  telemetryMemoryBytes: number;
  signal?: AbortSignal;
}

export interface GpuDebugMemorySnapshot {
  totalTrackedBytes: number;
  peakTrackedBytes: number;
  allocationCount: number;
  trackedUsageRatio?: number;
  byOwner: readonly { owner: string; bytes: number }[];
  byCategory: readonly { category: GpuResourceCategory; bytes: number }[];
}

export interface GpuDebugDispatchSnapshot {
  sampleCount: number;
  totalDurationMs: number;
  averageDurationMs?: number;
  estimatedWorkgroups: number;
  estimatedInvocations: number;
  averageBytesRead?: number;
  averageBytesWritten?: number;
  busyRatio?: number;
  byQueueClass: readonly {
    queueClass: GpuDebugQueueClass;
    dispatches: number;
    totalDurationMs: number;
    estimatedInvocations: number;
  }[];
}

export interface GpuDebugQueueSnapshot {
  sampleCount: number;
  averageDepth: number;
  peakDepth: number;
  peakUtilizationRatio?: number;
  hottestQueues: readonly {
    owner: string;
    queueClass: GpuDebugQueueClass;
    depth: number;
    capacity?: number;
    utilizationRatio?: number;
  }[];
}

export interface GpuDebugFrameSnapshot {
  sampleCount: number;
  latestFrameTimeMs?: number;
  averageFrameTimeMs?: number;
  averageTargetFrameTimeMs?: number;
  droppedFrameRatio?: number;
  averageGpuBusyMs?: number;
}

export interface GpuDebugDagSnapshot {
  readyLaneSampleCount: number;
  averageReadyLaneDepth: number;
  peakReadyLaneDepth: number;
  peakReadyLaneUtilizationRatio?: number;
  hottestReadyLanes: readonly {
    owner: string;
    queueClass: GpuDebugQueueClass;
    laneId: string;
    priority?: number;
    depth: number;
    capacity?: number;
    utilizationRatio?: number;
  }[];
  dependencyUnlockSampleCount: number;
  totalUnlockCount: number;
  bySourceJobType: readonly {
    owner: string;
    queueClass: GpuDebugQueueClass;
    sourceJobType: string;
    unlockCount: number;
  }[];
  byUnlockedJobType: readonly {
    owner: string;
    queueClass: GpuDebugQueueClass;
    unlockedJobType: string;
    priority?: number;
    unlockCount: number;
  }[];
}

export interface GpuDebugPipelineSnapshot {
  sampleCount: number;
  totalDurationMs: number;
  averageDurationMs?: number;
  averageSnapshotAgeMs?: number;
  maxSnapshotAgeMs?: number;
  maxSnapshotAgeFrames?: number;
  byPipeline: readonly {
    pipeline: GpuPipelinePhase;
    sampleCount: number;
    totalDurationMs: number;
    averageDurationMs?: number;
    averageSnapshotAgeMs?: number;
    maxSnapshotAgeMs?: number;
    maxSnapshotAgeFrames?: number;
  }[];
  hottestStages: readonly {
    owner: string;
    pipeline: GpuPipelinePhase;
    stage: string;
    frameId?: string;
    durationMs?: number;
    snapshotFrameId?: string;
    snapshotAgeFrames?: number;
    snapshotAgeMs?: number;
  }[];
}

export interface GpuDebugWavefrontSnapshot {
  sampleCount: number;
  averageActiveRayCount: number;
  peakActiveRayCount: number;
  peakQueueUtilizationRatio?: number;
  maxBounceDepth?: number;
  totalOverflowCount: number;
  peakOverflowCount: number;
  averageHitBufferCount?: number;
  peakHitBufferCount?: number;
  byBounceDepth: readonly {
    bounceDepth: number;
    sampleCount: number;
    averageActiveRayCount: number;
    peakActiveRayCount: number;
    averageHitBufferCount?: number;
    peakHitBufferCount?: number;
    totalOverflowCount: number;
  }[];
  byTerminationReason: readonly {
    reason: string;
    count: number;
  }[];
  byHitKind: readonly {
    kind: string;
    count: number;
  }[];
}

/** Aggregated fixed-SPP evidence from the session's bounded local history. */
export interface GpuDebugFixedSppSnapshot {
  sampleCount: number;
  measuredRayCountSampleCount: number;
  measuredGpuTimeSampleCount: number;
  totalPrimaryRays: number;
  totalMeasuredSecondaryRays: number;
  totalMeasuredPathSegments: number;
  averagePrimaryRays?: number;
  averageMeasuredSecondaryRays?: number;
  averageMeasuredPathSegments?: number;
  averageGpuTimeMs?: number;
  averageRenderJobTimeMs?: number;
  averageClassificationTimeMs?: number;
  averageCompactionTimeMs?: number;
  averageSamplingTimeMs?: number;
  peakTelemetryMemoryBytes: number;
  byRayCountStatus: readonly {
    status: GpuFixedSppRayCountStatus;
    count: number;
  }[];
  byTimingStatus: readonly {
    status: GpuFixedSppTimingStatus;
    count: number;
  }[];
  byTimestampQueryStatus: readonly {
    status: GpuFixedSppTimestampQueryStatus;
    count: number;
  }[];
  latest?: Readonly<Omit<GpuFixedSppTelemetrySample, "signal">>;
}

export interface GpuDebugSnapshot {
  enabled: boolean;
  adapter: Readonly<GpuDebugAdapterInfo>;
  memory: GpuDebugMemorySnapshot;
  dispatch: GpuDebugDispatchSnapshot;
  queues: GpuDebugQueueSnapshot;
  frames: GpuDebugFrameSnapshot;
  dag: GpuDebugDagSnapshot;
  pipeline: GpuDebugPipelineSnapshot;
  wavefront: GpuDebugWavefrontSnapshot;
  fixedSpp: GpuDebugFixedSppSnapshot;
  limitations: readonly string[];
}

export interface GpuDebugSession {
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  trackAllocation(allocation: TrackedGpuAllocation): () => void;
  releaseAllocation(id: string): boolean;
  recordQueue(sample: GpuQueueSample): boolean;
  recordReadyLane(sample: GpuReadyLaneSample): boolean;
  recordDispatch(sample: GpuDispatchSample): boolean;
  recordDependencyUnlock(sample: GpuDependencyUnlockSample): boolean;
  recordPipelinePhase(sample: GpuPipelinePhaseSample): boolean;
  recordWavefrontTelemetry(sample: GpuWavefrontTelemetrySample): boolean;
  recordFixedSppTelemetry(sample: GpuFixedSppTelemetrySample): boolean;
  recordFrame(sample: GpuFrameSample): boolean;
  getSnapshot(): GpuDebugSnapshot;
  reset(): void;
}
