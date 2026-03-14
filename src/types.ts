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

export interface GpuDebugSnapshot {
  enabled: boolean;
  adapter: Readonly<GpuDebugAdapterInfo>;
  memory: GpuDebugMemorySnapshot;
  dispatch: GpuDebugDispatchSnapshot;
  queues: GpuDebugQueueSnapshot;
  frames: GpuDebugFrameSnapshot;
  dag: GpuDebugDagSnapshot;
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
  recordFrame(sample: GpuFrameSample): boolean;
  getSnapshot(): GpuDebugSnapshot;
  reset(): void;
}
