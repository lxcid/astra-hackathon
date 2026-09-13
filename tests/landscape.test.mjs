import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createMountains, mountainProfile } from "../public/landscape.mjs";
import { generateTheme } from "../public/theme.mjs";
import { createBattlefield } from "../public/battlefield.mjs";

test("mountain valley leaves every generated road, site and goal flat", () => {
  for (let seed = 0; seed < 200; seed++) {
    const map = createBattlefield(seed),
      { height } = mountainProfile(seed);
    for (const p of [...map.ROAD, ...map.SITES, map.goal])
      assert.equal(height(p.x, p.z), 0.12);
    for (let a = 0; a < Math.PI * 2; a += 0.1)
      assert.ok(height(Math.cos(a) * 45, Math.sin(a) * 45) > 1);
  }
});
test("mountains have deterministic themed geometry with lower foreground foothills", () => {
  const theme = generateTheme("enchanted woodland fantasy");
  const a = createMountains(new THREE.Group(), theme);
  const b = createMountains(new THREE.Group(), theme);
  assert.deepEqual(
    a.geometry.attributes.position.array,
    b.geometry.attributes.position.array,
  );
  assert.ok(a.geometry.attributes.position.array.every(Number.isFinite));
  const { height } = mountainProfile(theme.seed);
  assert.ok(height(0, -45) > height(0, 45));
  const changed = createMountains(new THREE.Group(), {
    ...theme,
    seed: theme.seed + 1,
  });
  assert.notDeepEqual(
    a.geometry.attributes.position.array,
    changed.geometry.attributes.position.array,
  );
});
