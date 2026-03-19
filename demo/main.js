import { mountGpuShowcase } from "../../gpu-demo-viewer/shared/showcase-runtime.js";

const root = globalThis.document?.getElementById("app");
if (!root) {
  throw new Error("Debug demo root element was not found.");
}

await mountGpuShowcase({
  root,
  focus: "debug",
  packageName: "@plasius/gpu-debug",
  title: "3D Debug Telemetry Surface",
  subtitle:
    "Queue depth, dependency unlocks, frame timing, and pipeline samples are now shown against the same live 3D harbor scene they describe.",
});
