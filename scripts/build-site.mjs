import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const path = (relative) => new URL(relative, new URL("../", import.meta.url));
await rm(path("dist/"), { recursive: true, force: true });
await mkdir(path("dist/server/"), { recursive: true });
await cp(path("public/"), path("dist/client/"), { recursive: true });
await cp(
  path("node_modules/three/build/"),
  path("dist/client/vendor/three/build/"),
  { recursive: true },
);
await cp(
  path("node_modules/three/examples/jsm/"),
  path("dist/client/vendor/three/examples/jsm/"),
  { recursive: true },
);
await cp(
  path("node_modules/three/LICENSE"),
  path("dist/client/vendor/three/LICENSE"),
);
await mkdir(path("dist/.openai/"), { recursive: true });
await cp(path(".openai/hosting.json"), path("dist/.openai/hosting.json"));
await build({
  absWorkingDir: root,
  entryPoints: ["worker.mjs"],
  outfile: "dist/server/index.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
});
console.log("Built Sites Worker and bundled local Three.js assets.");
