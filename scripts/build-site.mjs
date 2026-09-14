import { build } from "esbuild";
import { cp, mkdir, rm, readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
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
// Keep the Worker bundle revision tied to its static asset set, including
// deployments that change only HTML, CSS, or client-side code.
const assetHash = createHash("sha256");
async function hashDirectory(relative) {
  const entries = await readdir(path(relative), { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const name = `${relative}${entry.name}`;
    if (entry.isDirectory()) await hashDirectory(`${name}/`);
    else assetHash.update(name).update("\0").update(await readFile(path(name))).update("\0");
  }
}
await hashDirectory("dist/client/");
await build({
  absWorkingDir: root,
  entryPoints: ["worker.mjs"],
  outfile: "dist/server/index.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  banner: { js: `// ALDER static assets: ${assetHash.digest("hex")}` },
});
console.log("Built Sites Worker and bundled local Three.js assets.");
