import { test } from "node:test";
import assert from "node:assert/strict";
import { createThemeAPI } from "../lib/theme-api.mjs";
import { ThemeError } from "../lib/theme-service.mjs";
import worker from "../worker.mjs";
const env = {
  OPENAI_API_KEY: "test-secret",
  OPENAI_THEME_MODEL: "gpt-5.6-terra",
};
const post = (body, headers = {}) =>
  new Request("https://alder.example/api/theme", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://alder.example",
      ...headers,
    },
    body: JSON.stringify(body),
  });
test("hosted API accepts its HTTPS origin, keeps secrets private and caches per model", async () => {
  const calls = [];
  const handle = createThemeAPI(async (...args) => {
    calls.push(args);
    return { title: "Woodland" };
  });
  const request = () => post({ theme: "woodland", variant: 1 });
  assert.equal((await handle(request(), env)).status, 200);
  const cached = await (await handle(request(), env)).json();
  assert.equal(cached.cached, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][2], {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_THEME_MODEL,
  });
  await handle(request(), { ...env, OPENAI_THEME_MODEL: "another-model" });
  assert.equal(calls.length, 2);
  const config = await handle(
    new Request("https://alder.example/api/config"),
    env,
  );
  assert.deepEqual(await config.json(), { aiAvailable: true });
  assert.ok(!JSON.stringify(cached).includes(env.OPENAI_API_KEY));
});
test("hosted API rejects cross-origin and oversized requests before generation", async () => {
  let called = false;
  const handle = createThemeAPI(async () => {
    called = true;
  });
  assert.equal(
    (
      await handle(
        post({ theme: "forest" }, { Origin: "https://evil.example" }),
        env,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handle(
        post({ theme: "forest" }, { "Sec-Fetch-Site": "cross-site" }),
        env,
      )
    ).status,
    403,
  );
  assert.equal(
    (await handle(post({ theme: "x".repeat(3000) }), env)).status,
    413,
  );
  assert.equal(called, false);
});
test("concurrency slots recover after provider failures", async () => {
  let reject;
  const pending = new Promise((_, fail) => {
    reject = fail;
  });
  const handle = createThemeAPI(() => pending);
  const first = handle(post({ theme: "one" }), env),
    second = handle(post({ theme: "two" }), env);
  // Let both request bodies be read before checking the concurrent limit.
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal((await handle(post({ theme: "three" }), env)).status, 429);
  reject(new ThemeError("Try again", 502, "provider_error"));
  assert.equal((await first).status, 502);
  assert.equal((await second).status, 502);
  assert.equal((await handle(post({ theme: "four" }), env)).status, 502);
});
test("Worker delegates only static requests to its asset binding", async () => {
  let assets = 0;
  const runtime = {
    ...env,
    ASSETS: {
      fetch: async (request) => {
        assets++;
        return new Response(new URL(request.url).pathname);
      },
    },
  };
  assert.equal(
    await (
      await worker.fetch(new Request("https://alder.example/"), runtime)
    ).text(),
    "/",
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://alder.example/api/config"),
        runtime,
      )
    ).status,
    200,
  );
  assert.equal(assets, 1);
});

test("reference images are validated and included in cache identity", async () => {
  const images = [
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jNXkAAAAASUVORK5CYII=",
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==",
  ];
  const calls = [];
  const handle = createThemeAPI(async (...args) => {
    calls.push(args);
    return { title: "Inspired" };
  });
  for (const referenceImage of images) {
    const r = await handle(post({ theme: "forest", referenceImage }), env);
    assert.equal(r.status, 200);
    assert.equal((await r.json()).cached, false);
  }
  assert.equal(calls.length, 2);
  assert.equal(calls[0][2].referenceImage, images[0]);
  assert.equal(
    (
      await (
        await handle(post({ theme: "forest", referenceImage: images[0] }), env)
      ).json()
    ).cached,
    true,
  );
  assert.equal(
    (await (await handle(post({ theme: "forest" }), env)).json()).cached,
    false,
  );
  for (const bad of [
    "https://example.com/image.png",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:image/png;base64,YmFkIQ==",
    42,
  ])
    assert.equal(
      (await handle(post({ theme: "forest", referenceImage: bad }), env))
        .status,
      400,
    );
  assert.equal(
    (
      await handle(
        post({ theme: "forest", referenceImage: "x".repeat(1500001) }),
        env,
      )
    ).status,
    413,
  );
  assert.equal(calls.length, 3);
});
