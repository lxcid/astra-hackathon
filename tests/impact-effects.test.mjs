import { test } from "node:test";
import assert from "node:assert/strict";
import { createSplashImpact } from "../public/impact-effects.mjs";
import { generateTheme } from "../public/theme.mjs";
test("splash effects animate finite debris and fully fade on their game clock", () => {
  const effect = createSplashImpact(generateTheme("woodland"), 5, -7, 2.8);
  const original = effect.g.getObjectByName("impact-debris");
  effect.update(0.3);
  const paused = original.instanceMatrix.array.slice();
  effect.update(0.3);
  assert.deepEqual(original.instanceMatrix.array, paused);
  effect.update(0.6);
  assert.notDeepEqual(original.instanceMatrix.array, paused);
  assert.ok(original.instanceMatrix.array.every(Number.isFinite));
  effect.update(effect.max);
  effect.g.traverse((n) => {
    if (n.material) assert.ok(n.material.opacity < 1e-8);
    if (n.isLight) assert.equal(n.intensity, 0);
  });
});
