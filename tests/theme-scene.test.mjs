import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createBattlefield } from "../public/battlefield.mjs";
import { createThemeScenery } from "../public/theme-scene.mjs";
import {
  generateTheme,
  validateTheme,
  ROLES,
  ENEMIES,
} from "../public/theme.mjs";
function design() {
  const parts = ["box", "sphere", "cone", "cylinder", "torus"].map(
    (shape, i) => ({
      shape,
      material: i % 2 ? "glow" : "body",
      position: [i * 0.7, i, -i * 0.3],
      scale: [1.4, 2.1, 0.7],
      rotation: [0.2, -0.4, 0.1],
    }),
  );
  return validateTheme({
    ...generateTheme("neon cyberpunk"),
    source: "ai",
    models: Object.fromEntries(
      [...ROLES, ...ENEMIES, "guardian", "scenery", "goal"].map((k) => [
        k,
        parts,
      ]),
    ),
  });
}
test("AI primitive recipes render into finite meshes and bounded tower footprints", () => {
  const scene = new THREE.Scene();
  const art = createThemeScenery(scene, design());
  for (const role of ROLES) {
    const tower = art.makeTower(role),
      bounds = new THREE.Box3().setFromObject(tower),
      size = bounds.getSize(new THREE.Vector3());
    assert.ok(size.x <= 2.70001 && size.z <= 2.70001 && size.y <= 3.70001);
    assert.ok(Math.abs(bounds.min.y) < 1e-6);
    assert.equal(tower.children.length, 5);
  }
  for (const role of ENEMIES) {
    const enemy = art.makeEnemy(role);
    assert.ok(enemy.userData.core);
    assert.ok(Array.isArray(enemy.userData.legs));
  }
  assert.ok(art.makeSettler().userData.arm);
  scene.traverse((node) => {
    if (node.isMesh)
      for (const n of node.geometry.attributes.position.array)
        assert.ok(Number.isFinite(n));
  });
});
test("same theme seed recreates the same decorative layout", () => {
  const theme = design();
  const layout = () => {
    const { worldGroup } = createThemeScenery(new THREE.Scene(), theme);
    return worldGroup.children.map((c) => ({
      position: c.position.toArray(),
      rotation: c.rotation.toArray(),
      children: c.children.length,
    }));
  };
  assert.deepEqual(layout(), layout());
});

test("continuous terrain supports distant scenery and the goal follows the shuffled route", () => {
  const battlefield = createBattlefield(53);
  const { worldGroup } = createThemeScenery(
    new THREE.Scene(),
    design(),
    battlefield,
  );
  const ground = worldGroup.getObjectByName("terrain");
  assert.ok(ground);
  const bounds = new THREE.Box3().setFromObject(ground);
  assert.ok(bounds.min.x <= -100 && bounds.max.x >= 100);
  assert.ok(bounds.min.z <= -100 && bounds.max.z >= 100);
  const distant = worldGroup.children.filter(
    (g) => g.name === "distant-scenery",
  );
  assert.ok(distant.length > 0 && distant.length <= 20);
  for (const prop of distant) {
    const feet = new THREE.Box3().setFromObject(prop).min.y;
    assert.ok(Math.abs(feet - bounds.max.y) < 1e-5);
  }
  const goal = worldGroup.getObjectByName("goal");
  assert.equal(goal.position.x, battlefield.goal.x);
  assert.equal(goal.position.z, battlefield.goal.z);
});
