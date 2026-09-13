import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateTheme,
  validateTheme,
  setActiveTheme,
  ROLES,
  ENEMIES,
} from "../public/theme.mjs";
import {
  createWorld,
  BUILDINGS,
  ENEMY_TYPES,
  ROAD,
  SITES,
  WAVES,
} from "../public/world.mjs";
import { interpretTheme } from "../lib/theme-service.mjs";
import { themeText } from "../public/theme-ui.mjs";
const themes = [
  "enchanted woodland fantasy",
  "neon cyberpunk city",
  "pastel candy kingdom",
  "underwater coral civilization",
  "a library of floating dreams",
];
const part = {
  shape: "cone",
  material: "glow",
  position: [0, 1, 0],
  scale: [1, 2, 1],
  rotation: [0, 0, 0],
};
const design = () => ({
  ...structuredClone(generateTheme(themes[0])),
  models: Object.fromEntries(
    [...ROLES, ...ENEMIES, "guardian", "scenery", "goal"].map((k) => [
      k,
      [structuredClone(part)],
    ]),
  ),
});
function replay() {
  const w = createWorld();
  w.build("bow", "B");
  w.build("stone", "A");
  w.build("frost", "D");
  w.callWave();
  for (let i = 0; i < 400; i++) {
    if (i === 100) w.rally(-12, 12);
    if (i === 150) w.bloom(-12, 12);
    w.step(0.05);
  }
  // Enemy phase is animation-only randomness; compare the complete mechanical state.
  return JSON.parse(
    JSON.stringify(w.state, (key, value) => (key === "phase" ? 0 : value)),
  );
}
test("theme generation is reproducible and generates distinct visual designs", () => {
  assert.deepEqual(generateTheme(themes[0], 17), generateTheme(themes[0], 17));
  assert.notDeepEqual(
    generateTheme(themes[0], 17).geometry,
    generateTheme(themes[0], 18).geometry,
  );
  assert.equal(
    new Set(themes.map((t) => generateTheme(t).palette.sky)).size,
    themes.length,
  );
  assert.equal(generateTheme(themes.at(-1)).family, "abstract");
});
test("AI art cannot inject stats, paths, waves, scripts or arbitrary assets", () => {
  const candidate = design();
  candidate.damage = 999;
  candidate.road = [];
  candidate.waves = [];
  candidate.towers.bow = { ...candidate.towers.bow, damage: 999, cost: 0 };
  candidate.models.bow[0].script = "alert(1)";
  const validated = validateTheme(candidate);
  assert.equal(validated.damage, undefined);
  assert.equal(validated.road, undefined);
  assert.equal(validated.waves, undefined);
  assert.equal(validated.towers.bow.damage, undefined);
  assert.equal(validated.towers.bow.cost, undefined);
  assert.equal(validated.models.bow[0].script, undefined);
  assert.ok(Object.isFrozen(validated.models.bow[0].scale));
});
test("theme presentation leaves combat constants and a fixed-layout replay unchanged", () => {
  const before = JSON.stringify({ BUILDINGS, ENEMY_TYPES, ROAD, SITES, WAVES });
  const baseline = replay();
  for (const theme of themes) {
    setActiveTheme(generateTheme(theme));
    assert.deepEqual(replay(), baseline);
  }
  assert.equal(
    JSON.stringify({ BUILDINGS, ENEMY_TYPES, ROAD, SITES, WAVES }),
    before,
  );
});
test("invalid geometry, missing roles, colors and excessive complexity are rejected", () => {
  for (const change of [
    (d) => (d.models.bow[0].scale[0] = Infinity),
    (d) => (d.models.bow[0].position[0] = 100),
    (d) => (d.models.bow[0].shape = "script"),
    (d) => (d.models.bow = Array(25).fill(part)),
    (d) => delete d.enemies.brute,
    (d) => (d.palette.sky = "url(https://example.com)"),
    (d) => (d.geometry.scatter = 999),
  ]) {
    const d = design();
    change(d);
    assert.throws(() => validateTheme(d));
  }
  for (const value of ["", null, "x".repeat(161)])
    assert.throws(() => generateTheme(value));
});
test("theme copy replacement does not recursively rewrite generated names", () => {
  const theme = generateTheme("candy");
  assert.equal(
    themeText("Briar watch rising at site A.", theme),
    "Sprinkle sentry rising at site A.",
  );
  assert.equal(
    themeText("Root wardens will hold this bend for 13 seconds.", theme),
    "Cookie guards will hold this bend for 13 seconds.",
  );
});
const okResponse = (data) => ({
  ok: true,
  json: async () => ({
    status: "completed",
    output: [
      {
        type: "message",
        content: [{ type: "output_text", text: JSON.stringify(data) }],
      },
    ],
  }),
});
test("AI request uses a strict visual schema and returns validated bounded art", async () => {
  const result = await interpretTheme("woodland", 2, {
    apiKey: "test-key",
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      const body = JSON.parse(options.body);
      assert.equal(body.text.format.strict, true);
      assert.equal(body.store, false);
      assert.equal(body.text.format.schema.additionalProperties, false);
      assert.equal(body.text.format.schema.properties.damage, undefined);
      return okResponse(design());
    },
  });
  assert.equal(result.source, "ai");
  assert.equal(result.prompt, "woodland");
  assert.ok(result.models.bow.length);
});
test("AI failures, refusals and incomplete designs are actionable and never silently replaced", async () => {
  await assert.rejects(
    interpretTheme("forest", 0, { apiKey: "" }),
    (e) => e.code === "missing_api_key",
  );
  await assert.rejects(
    interpretTheme("forest", 0, {
      apiKey: "test",
      fetchImpl: async () => ({ ok: false, status: 429 }),
    }),
    (e) => e.code === "upstream_error",
  );
  await assert.rejects(
    interpretTheme("forest", 0, {
      apiKey: "test",
      fetchImpl: async () => {
        throw new Error("secret upstream detail");
      },
    }),
    (e) => e.code === "upstream_unavailable" && !e.message.includes("secret"),
  );
  await assert.rejects(
    interpretTheme("forest", 0, {
      apiKey: "test",
      fetchImpl: async () => okResponse({}),
    }),
    (e) => e.code === "invalid_design",
  );
  await assert.rejects(
    interpretTheme("forest", 0, {
      apiKey: "test",
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          status: "completed",
          output: [{ type: "message", content: [{ type: "refusal" }] }],
        }),
      }),
    }),
    (e) => e.code === "refused",
  );
});
test("provider billing errors are identified without exposing credentials", async () => {
  await assert.rejects(
    interpretTheme("forest", 0, {
      apiKey: "test",
      fetchImpl: async () => ({
        ok: false,
        status: 429,
        json: async () => ({ error: { code: "billing_not_active" } }),
      }),
    }),
    (e) => e.code === "billing_required" && e.status === 503,
  );
});

test("reference images reach the model as image input while output remains visual-only", async () => {
  const referenceImage =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jNXkAAAAASUVORK5CYII=";
  const result = await interpretTheme("a woodland in these colors", 3, {
    apiKey: "test-key",
    referenceImage,
    fetchImpl: async (_, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.input[0].role, "user");
      assert.deepEqual(body.input[0].content[1], {
        type: "input_image",
        image_url: referenceImage,
        detail: "high",
      });
      assert.match(body.input[0].content[0].text, /woodland/);
      assert.equal(body.text.format.strict, true);
      assert.equal(body.store, false);
      return okResponse(design());
    },
  });
  assert.ok(result.models.stone);
  assert.equal(result.referenceImage, undefined);
});
