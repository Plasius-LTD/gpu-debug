import type {
  GpuDebugAdapterInfo,
  GpuPipelinePhase,
  GpuDebugQueueClass,
  GpuResourceCategory,
  GpuVector3,
} from "./types.js";

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u;

export const gpuDebugQueueClasses = Object.freeze([
  "render",
  "simulation",
  "lighting",
  "post-processing",
  "voxel",
  "transfer",
  "custom",
]) satisfies readonly GpuDebugQueueClass[];

export const gpuResourceCategories = Object.freeze([
  "buffer",
  "texture",
  "bind-group",
  "pipeline",
  "custom",
]) satisfies readonly GpuResourceCategory[];

export const gpuPipelinePhases = Object.freeze([
  "simulation",
  "secondary-simulation",
  "scene-preparation",
  "render",
]) satisfies readonly GpuPipelinePhase[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertIdentifier(name: string, value: unknown): string {
  if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value)) {
    throw new Error(
      `${name} must match ${IDENTIFIER_PATTERN.toString()} and be at most 64 characters long.`
    );
  }

  return value;
}

export function assertEnumValue<T extends string>(
  name: string,
  value: unknown,
  allowedValues: readonly T[]
): T {
  if (typeof value !== "string" || !allowedValues.includes(value as T)) {
    throw new Error(`${name} must be one of: ${allowedValues.join(", ")}.`);
  }

  return value as T;
}

export function readPositiveNumber(
  name: string,
  value: unknown
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a finite number greater than zero.`);
  }

  return value;
}

export function readNonNegativeNumber(
  name: string,
  value: unknown
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite number greater than or equal to zero.`);
  }

  return value;
}

export function readPositiveInteger(
  name: string,
  value: unknown
): number | undefined {
  const parsed = readPositiveNumber(name, value);
  if (parsed === undefined) {
    return undefined;
  }

  if (!Number.isInteger(parsed)) {
    throw new Error(`${name} must be an integer greater than zero.`);
  }

  return parsed;
}

export function normalizePlainObject(
  name: string,
  value: unknown
): Readonly<Record<string, unknown>> {
  if (value === undefined) {
    return Object.freeze({});
  }

  if (!isRecord(value)) {
    throw new Error(`${name} must be a plain object when provided.`);
  }

  return Object.freeze({ ...value });
}

export function normalizeVector(
  name: string,
  value: GpuVector3
): Required<GpuVector3> {
  const x = readPositiveInteger(`${name}.x`, value.x) ?? 1;
  const y = readPositiveInteger(`${name}.y`, value.y) ?? 1;
  const z = readPositiveInteger(`${name}.z`, value.z) ?? 1;
  return { x, y, z };
}

export function isAbortSignalLike(value: unknown): value is AbortSignal {
  return (
    typeof value === "object" &&
    value !== null &&
    "aborted" in value &&
    typeof (value as AbortSignal).aborted === "boolean"
  );
}

export function normalizeAdapterInfo(
  value: GpuDebugAdapterInfo | undefined
): Readonly<GpuDebugAdapterInfo> {
  if (value === undefined) {
    return Object.freeze({});
  }

  const adapter: GpuDebugAdapterInfo = {};

  if (value.label !== undefined) {
    adapter.label = String(value.label).trim().slice(0, 120);
  }
  if (value.vendor !== undefined) {
    adapter.vendor = String(value.vendor).trim().slice(0, 120);
  }
  if (value.architecture !== undefined) {
    adapter.architecture = String(value.architecture).trim().slice(0, 120);
  }
  if (value.driver !== undefined) {
    adapter.driver = String(value.driver).trim().slice(0, 120);
  }

  adapter.maxBufferSizeBytes = readPositiveInteger(
    "adapter.maxBufferSizeBytes",
    value.maxBufferSizeBytes
  );
  adapter.maxStorageBufferBindingSizeBytes = readPositiveInteger(
    "adapter.maxStorageBufferBindingSizeBytes",
    value.maxStorageBufferBindingSizeBytes
  );
  adapter.maxComputeInvocationsPerWorkgroup = readPositiveInteger(
    "adapter.maxComputeInvocationsPerWorkgroup",
    value.maxComputeInvocationsPerWorkgroup
  );
  adapter.maxComputeWorkgroupsPerDimension = readPositiveInteger(
    "adapter.maxComputeWorkgroupsPerDimension",
    value.maxComputeWorkgroupsPerDimension
  );
  adapter.memoryCapacityHintBytes = readPositiveInteger(
    "adapter.memoryCapacityHintBytes",
    value.memoryCapacityHintBytes
  );
  adapter.coreCountHint = readPositiveInteger(
    "adapter.coreCountHint",
    value.coreCountHint
  );
  adapter.metadata = normalizePlainObject("adapter.metadata", value.metadata);

  return Object.freeze(adapter);
}
