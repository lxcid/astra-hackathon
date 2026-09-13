import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { server } from "../server.mjs";
let base;
before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});
test("server serves the landing page, game entry point, and Three.js modules", async () => {
  for (const path of [
    "/",
    "/game.html",
    "/landing.css",
    "/vendor/three/build/three.module.js",
    "/vendor/three/examples/jsm/controls/OrbitControls.js",
    "/theme.mjs",
  ]) {
    const r = await fetch(base + path);
    assert.equal(r.status, 200);
    await r.text();
  }
  const landing = await (await fetch(base)).text();
  assert.match(landing, /youtube-nocookie.com\/embed\/Id9crKlz9Vk/);
  assert.match(landing, /href="\/game.html"/);
  assert.doesNotMatch(landing, /src="\/launcher.mjs"/);
  const page = await (await fetch(base + "/game.html")).text();
  assert.match(page, /theme-form/);
  assert.match(page, /launcher.mjs/);
});
test("config reveals availability only and never credentials", async () => {
  const r = await fetch(base + "/api/config");
  const data = await r.json();
  assert.deepEqual(Object.keys(data), ["aiAvailable"]);
  assert.equal(typeof data.aiAvailable, "boolean");
  assert.equal((await fetch(base + "/.env")).status, 404);
  assert.equal((await fetch(base + "/lib/theme-service.mjs")).status, 404);
});
test("generation rejects invalid input and cross-origin requests before calling AI", async () => {
  const post = (body, headers = {}) =>
    fetch(base + "/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body,
    });
  assert.equal((await post("{}")).status, 400);
  assert.equal((await post("null")).status, 400);
  assert.equal((await post("{")).status, 400);
  assert.equal(
    (await post(JSON.stringify({ theme: "x".repeat(161) }))).status,
    400,
  );
  assert.equal(
    (await post(JSON.stringify({ theme: "forest", variant: -1 }))).status,
    400,
  );
  assert.equal(
    (
      await post(JSON.stringify({ theme: "forest" }), {
        Origin: "https://example.com",
      })
    ).status,
    403,
  );
  assert.equal((await post("x".repeat(3000))).status, 413);
  assert.equal((await fetch(base + "/api/theme")).status, 405);
});
