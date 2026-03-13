import type {
  GpuDebugDispatchSnapshot,
  GpuDebugQueueSnapshot,
  GpuDebugSession,
  GpuDebugSessionOptions,
  GpuDebugSnapshot,
  GpuDispatchSample,
  GpuFrameSample,
  GpuQueueSample,
  GpuResourceCategory,
  TrackedGpuAllocation,
} from "./types.js";
import {
  assertEnumValue,
  assertIdentifier,
  gpuDebugQueueClasses,
  gpuResourceCategories,
  isAbortSignalLike,
  normalizeAdapterInfo,
  normalizeVector,
  readNonNegativeNumber,
  readPositiveInteger,
  readPositiveNumber,
} from "./validation.js";

const DEFAULT_OPTIONS = Object.freeze({
  enabled: false,
  maxRetainedDispatches: 240,
  maxRetainedQueueSamples: 240,
  maxRetainedFrameSamples: 240,
  maxTrackedAllocations: 512,
});

const LIMITATIONS = Object.freeze([
  "Tracked memory reflects only allocations reported to this debug session.",
  "Portable WebGPU does not expose authoritative live GPU core-count or total-memory counters.",
  "Hardware hints are optional caller-supplied metadata and may be platform-specific.",
]);

interface NormalizedAllocation extends Omit<TrackedGpuAllocation, "signal"> {
  label?: string;
}

type NormalizedQueueSample = Omit<GpuQueueSample, "signal">;

interface NormalizedDispatchSample extends Omit<GpuDispatchSample, "signal"> {
  workgroups: { x: number; y: number; z: number };
  workgroupSize: { x: number; y: number; z: number };
}

type NormalizedFrameSample = Omit<GpuFrameSample, "signal">;

function clampCount(value: number | undefined, fallback: number): number {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.min(Math.round(value), 4096);
}

function trimHistory<T>(items: T[], maxEntries: number): void {
  while (items.length > maxEntries) {
    items.shift();
  }
}

function average(values: readonly number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function pushAggregate<T extends string | number>(
  map: Map<T, number>,
  key: T,
  value: number
): void {
  map.set(key, (map.get(key) ?? 0) + value);
}

function normalizeAllocation(allocation: TrackedGpuAllocation): NormalizedAllocation {
  if (allocation.signal !== undefined && !isAbortSignalLike(allocation.signal)) {
    throw new Error("allocation.signal must be an AbortSignal when provided.");
  }

  return {
    id: assertIdentifier("allocation.id", allocation.id),
    owner: assertIdentifier("allocation.owner", allocation.owner),
    category: assertEnumValue(
      "allocation.category",
      allocation.category,
      gpuResourceCategories
    ),
    sizeBytes: readPositiveInteger("allocation.sizeBytes", allocation.sizeBytes) ?? 1,
    label:
      allocation.label === undefined
        ? undefined
        : String(allocation.label).trim().slice(0, 120),
  };
}

function normalizeQueueSample(sample: GpuQueueSample): NormalizedQueueSample {
  if (sample.signal !== undefined && !isAbortSignalLike(sample.signal)) {
    throw new Error("queue.signal must be an AbortSignal when provided.");
  }

  const capacity = readPositiveInteger("queue.capacity", sample.capacity);
  const depth = readNonNegativeNumber("queue.depth", sample.depth) ?? 0;

  if (capacity !== undefined && depth > capacity) {
    throw new Error("queue.depth cannot exceed queue.capacity.");
  }

  return {
    owner: assertIdentifier("queue.owner", sample.owner),
    queueClass: assertEnumValue(
      "queue.queueClass",
      sample.queueClass,
      gpuDebugQueueClasses
    ),
    depth,
    capacity,
    frameId:
      sample.frameId === undefined
        ? undefined
        : assertIdentifier("queue.frameId", sample.frameId),
  };
}

function normalizeDispatchSample(
  sample: GpuDispatchSample
): NormalizedDispatchSample {
  if (sample.signal !== undefined && !isAbortSignalLike(sample.signal)) {
    throw new Error("dispatch.signal must be an AbortSignal when provided.");
  }

  return {
    id:
      sample.id === undefined ? undefined : assertIdentifier("dispatch.id", sample.id),
    owner: assertIdentifier("dispatch.owner", sample.owner),
    queueClass: assertEnumValue(
      "dispatch.queueClass",
      sample.queueClass,
      gpuDebugQueueClasses
    ),
    jobType: assertIdentifier("dispatch.jobType", sample.jobType),
    frameId:
      sample.frameId === undefined
        ? undefined
        : assertIdentifier("dispatch.frameId", sample.frameId),
    durationMs: readNonNegativeNumber("dispatch.durationMs", sample.durationMs),
    workgroups: normalizeVector("dispatch.workgroups", sample.workgroups),
    workgroupSize: normalizeVector(
      "dispatch.workgroupSize",
      sample.workgroupSize ?? { x: 1, y: 1, z: 1 }
    ),
    bytesRead: readNonNegativeNumber("dispatch.bytesRead", sample.bytesRead),
    bytesWritten: readNonNegativeNumber("dispatch.bytesWritten", sample.bytesWritten),
  };
}

function normalizeFrameSample(sample: GpuFrameSample): NormalizedFrameSample {
  if (sample.signal !== undefined && !isAbortSignalLike(sample.signal)) {
    throw new Error("frame.signal must be an AbortSignal when provided.");
  }

  if (sample.dropped !== undefined && typeof sample.dropped !== "boolean") {
    throw new Error("frame.dropped must be a boolean when provided.");
  }

  return {
    frameId:
      sample.frameId === undefined
        ? undefined
        : assertIdentifier("frame.frameId", sample.frameId),
    frameTimeMs: readPositiveNumber("frame.frameTimeMs", sample.frameTimeMs) ?? 0,
    targetFrameTimeMs: readPositiveNumber(
      "frame.targetFrameTimeMs",
      sample.targetFrameTimeMs
    ),
    gpuBusyMs: readNonNegativeNumber("frame.gpuBusyMs", sample.gpuBusyMs),
    dropped: sample.dropped,
  };
}

export function estimateDispatchInvocations(sample: GpuDispatchSample): number {
  const normalized = normalizeDispatchSample(sample);
  return (
    normalized.workgroups.x *
    normalized.workgroups.y *
    normalized.workgroups.z *
    normalized.workgroupSize.x *
    normalized.workgroupSize.y *
    normalized.workgroupSize.z
  );
}

export function createGpuDebugSession(
  options: GpuDebugSessionOptions = {}
): GpuDebugSession {
  const settings = {
    enabled: options.enabled ?? DEFAULT_OPTIONS.enabled,
    maxRetainedDispatches: clampCount(
      options.maxRetainedDispatches,
      DEFAULT_OPTIONS.maxRetainedDispatches
    ),
    maxRetainedQueueSamples: clampCount(
      options.maxRetainedQueueSamples,
      DEFAULT_OPTIONS.maxRetainedQueueSamples
    ),
    maxRetainedFrameSamples: clampCount(
      options.maxRetainedFrameSamples,
      DEFAULT_OPTIONS.maxRetainedFrameSamples
    ),
    maxTrackedAllocations: clampCount(
      options.maxTrackedAllocations,
      DEFAULT_OPTIONS.maxTrackedAllocations
    ),
  };

  const adapter = normalizeAdapterInfo(options.adapter);
  let enabled = settings.enabled;
  const allocations = new Map<string, NormalizedAllocation>();
  const allocationOrder: string[] = [];
  const queueSamples: NormalizedQueueSample[] = [];
  const dispatchSamples: NormalizedDispatchSample[] = [];
  const frameSamples: NormalizedFrameSample[] = [];
  let peakTrackedBytes = 0;

  const totalTrackedBytes = (): number =>
    [...allocations.values()].reduce((total, allocation) => total + allocation.sizeBytes, 0);

  const updatePeakTrackedBytes = (): void => {
    peakTrackedBytes = Math.max(peakTrackedBytes, totalTrackedBytes());
  };

  const ensureAllocationCapacity = (): void => {
    while (allocationOrder.length > settings.maxTrackedAllocations) {
      const oldestId = allocationOrder.shift();
      if (oldestId !== undefined) {
        allocations.delete(oldestId);
      }
    }
  };

  const buildDispatchSnapshot = (): GpuDebugDispatchSnapshot => {
    const durations = dispatchSamples
      .map((sample) => sample.durationMs)
      .filter((value): value is number => value !== undefined);
    const bytesRead = dispatchSamples
      .map((sample) => sample.bytesRead)
      .filter((value): value is number => value !== undefined);
    const bytesWritten = dispatchSamples
      .map((sample) => sample.bytesWritten)
      .filter((value): value is number => value !== undefined);

    const byQueueClass = new Map<
      NormalizedDispatchSample["queueClass"],
      {
        queueClass: NormalizedDispatchSample["queueClass"];
        dispatches: number;
        totalDurationMs: number;
        estimatedInvocations: number;
      }
    >();

    let estimatedWorkgroups = 0;
    let estimatedInvocations = 0;

    for (const sample of dispatchSamples) {
      const workgroupCount =
        sample.workgroups.x * sample.workgroups.y * sample.workgroups.z;
      const invocationCount =
        workgroupCount *
        sample.workgroupSize.x *
        sample.workgroupSize.y *
        sample.workgroupSize.z;
      estimatedWorkgroups += workgroupCount;
      estimatedInvocations += invocationCount;

      const bucket = byQueueClass.get(sample.queueClass) ?? {
        queueClass: sample.queueClass,
        dispatches: 0,
        totalDurationMs: 0,
        estimatedInvocations: 0,
      };
      bucket.dispatches += 1;
      bucket.totalDurationMs += sample.durationMs ?? 0;
      bucket.estimatedInvocations += invocationCount;
      byQueueClass.set(sample.queueClass, bucket);
    }

    const frameTimes = frameSamples.map((sample) => sample.frameTimeMs);
    const totalFrameTimeMs = frameTimes.reduce((total, value) => total + value, 0);
    const totalDurationMs = durations.reduce((total, value) => total + value, 0);

    return {
      sampleCount: dispatchSamples.length,
      totalDurationMs,
      averageDurationMs: average(durations),
      estimatedWorkgroups,
      estimatedInvocations,
      averageBytesRead: average(bytesRead),
      averageBytesWritten: average(bytesWritten),
      busyRatio:
        totalFrameTimeMs > 0 ? Math.min(totalDurationMs / totalFrameTimeMs, 1) : undefined,
      byQueueClass: [...byQueueClass.values()].sort(
        (left, right) => right.totalDurationMs - left.totalDurationMs
      ),
    };
  };

  const buildQueueSnapshot = (): GpuDebugQueueSnapshot => {
    const depths = queueSamples.map((sample) => sample.depth);
    const hottestQueues = queueSamples
      .map((sample) => ({
        owner: sample.owner,
        queueClass: sample.queueClass,
        depth: sample.depth,
        capacity: sample.capacity,
        utilizationRatio:
          sample.capacity !== undefined ? sample.depth / sample.capacity : undefined,
      }))
      .sort((left, right) => {
        const leftScore = left.utilizationRatio ?? left.depth;
        const rightScore = right.utilizationRatio ?? right.depth;
        return rightScore - leftScore;
      })
      .slice(0, 5);

    const peakUtilizationRatio = queueSamples.reduce<number | undefined>(
      (peak, sample) => {
        if (sample.capacity === undefined) {
          return peak;
        }

        const nextRatio = sample.depth / sample.capacity;
        return peak === undefined ? nextRatio : Math.max(peak, nextRatio);
      },
      undefined
    );

    return {
      sampleCount: queueSamples.length,
      averageDepth: average(depths) ?? 0,
      peakDepth: depths.length === 0 ? 0 : Math.max(...depths),
      peakUtilizationRatio,
      hottestQueues,
    };
  };

  return {
    isEnabled() {
      return enabled;
    },
    setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
    },
    trackAllocation(allocation) {
      if (!enabled || allocation.signal?.aborted === true) {
        return () => {};
      }

      const normalized = normalizeAllocation(allocation);
      if (!allocations.has(normalized.id)) {
        allocationOrder.push(normalized.id);
      }
      allocations.set(normalized.id, normalized);
      ensureAllocationCapacity();
      updatePeakTrackedBytes();

      return () => {
        this.releaseAllocation(normalized.id);
      };
    },
    releaseAllocation(id) {
      const normalizedId = assertIdentifier("allocation.id", id);
      const deleted = allocations.delete(normalizedId);
      if (!deleted) {
        return false;
      }

      const index = allocationOrder.indexOf(normalizedId);
      if (index >= 0) {
        allocationOrder.splice(index, 1);
      }

      return true;
    },
    recordQueue(sample) {
      if (!enabled || sample.signal?.aborted === true) {
        return false;
      }

      queueSamples.push(normalizeQueueSample(sample));
      trimHistory(queueSamples, settings.maxRetainedQueueSamples);
      return true;
    },
    recordDispatch(sample) {
      if (!enabled || sample.signal?.aborted === true) {
        return false;
      }

      dispatchSamples.push(normalizeDispatchSample(sample));
      trimHistory(dispatchSamples, settings.maxRetainedDispatches);
      return true;
    },
    recordFrame(sample) {
      if (!enabled || sample.signal?.aborted === true) {
        return false;
      }

      frameSamples.push(normalizeFrameSample(sample));
      trimHistory(frameSamples, settings.maxRetainedFrameSamples);
      return true;
    },
    getSnapshot() {
      const memoryByOwner = new Map<string, number>();
      const memoryByCategory = new Map<GpuResourceCategory, number>();
      for (const allocation of allocations.values()) {
        pushAggregate(memoryByOwner, allocation.owner, allocation.sizeBytes);
        pushAggregate(memoryByCategory, allocation.category, allocation.sizeBytes);
      }

      const totalBytes = totalTrackedBytes();
      const frameTimes = frameSamples.map((sample) => sample.frameTimeMs);
      const targetFrameTimes = frameSamples
        .map((sample) => sample.targetFrameTimeMs)
        .filter((value): value is number => value !== undefined);
      const gpuBusyTimes = frameSamples
        .map((sample) => sample.gpuBusyMs)
        .filter((value): value is number => value !== undefined);

      const snapshot: GpuDebugSnapshot = {
        enabled,
        adapter,
        memory: {
          totalTrackedBytes: totalBytes,
          peakTrackedBytes,
          allocationCount: allocations.size,
          trackedUsageRatio:
            adapter.memoryCapacityHintBytes !== undefined
              ? totalBytes / adapter.memoryCapacityHintBytes
              : undefined,
          byOwner: [...memoryByOwner.entries()]
            .map(([owner, bytes]) => ({ owner, bytes }))
            .sort((left, right) => right.bytes - left.bytes),
          byCategory: [...memoryByCategory.entries()]
            .map(([category, bytes]) => ({ category, bytes }))
            .sort((left, right) => right.bytes - left.bytes),
        },
        dispatch: buildDispatchSnapshot(),
        queues: buildQueueSnapshot(),
        frames: {
          sampleCount: frameSamples.length,
          latestFrameTimeMs: frameSamples[frameSamples.length - 1]?.frameTimeMs,
          averageFrameTimeMs: average(frameTimes),
          averageTargetFrameTimeMs: average(targetFrameTimes),
          droppedFrameRatio:
            frameSamples.length > 0
              ? frameSamples.filter((sample) => sample.dropped === true).length /
                frameSamples.length
              : undefined,
          averageGpuBusyMs: average(gpuBusyTimes),
        },
        limitations: LIMITATIONS,
      };

      return snapshot;
    },
    reset() {
      allocations.clear();
      allocationOrder.splice(0, allocationOrder.length);
      queueSamples.splice(0, queueSamples.length);
      dispatchSamples.splice(0, dispatchSamples.length);
      frameSamples.splice(0, frameSamples.length);
      peakTrackedBytes = 0;
    },
  };
}
