import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createBattlefield,
  DEFAULT_BATTLEFIELD,
  inspectBattlefield,
  shuffleBattlefield,
  layoutDifference,
} from "../public/battlefield.mjs";
import { createWorld, ENEMY_TYPES, BUILDINGS } from "../public/world.mjs";
import { generateTheme, validateTheme } from "../public/theme.mjs";
test("route seeds reproduce roads, fresh sites and a relocated goal", () => {
  const a = createBattlefield(42),
    again = createBattlefield(42),
    b = createBattlefield(43);
  assert.deepEqual(a.ROAD, again.ROAD);
  assert.deepEqual(a.SITES, again.SITES);
  assert.notDeepEqual(a.ROAD, b.ROAD);
  assert.notDeepEqual(a.SITES, b.SITES);
  assert.notDeepEqual(a.goal, b.goal);
  for (const map of [a, b]) {
    const end = map.ROAD.at(-1);
    assert.ok(
      Math.abs(Math.hypot(map.goal.x - end.x, map.goal.z - end.z) - 3) < 1e-8,
    );
  }
  for (const seed of [-1, 1.5, Infinity, 4294967296])
    assert.throws(() => createBattlefield(seed));
});
test("200 generated roads satisfy bounds, coverage, spacing and length constraints", () => {
  const layouts = new Set();
  for (let seed = 0; seed < 200; seed++) {
    const map = createBattlefield(seed);
    assert.deepEqual(inspectBattlefield(map), [], `seed ${seed}`);
    assert.equal(map.SITES.length, 10);
    assert.equal(new Set(map.SITES.map((s) => s.id)).size, 10);
    assert.ok(
      map.ROAD.every(
        (p, i) => i === 0 || p.distance > map.ROAD[i - 1].distance,
      ),
    );
    layouts.add(JSON.stringify(map.ROAD));
    // Continuous centerline segments must not cross, independently of the generator's clearance check.
    const cross = (a, b, c) =>
      (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
    for (let i = 1; i < map.ROAD.length; i++)
      for (let j = i + 2; j < map.ROAD.length; j++) {
        const a = map.ROAD[i - 1],
          b = map.ROAD[i],
          c = map.ROAD[j - 1],
          d = map.ROAD[j];
        assert.ok(
          !(
            cross(a, b, c) * cross(a, b, d) < 0 &&
            cross(c, d, a) * cross(c, d, b) < 0
          ),
          `crossing at seed ${seed}`,
        );
      }
  }
  assert.equal(layouts.size, 200);
});
test("each simulation follows its own generated road at the unchanged speed", () => {
  for (const seed of [1, 42, 987654]) {
    const map = createBattlefield(seed),
      world = createWorld(7391, map);
    world.callWave();
    world.step(0.05);
    const enemy = world.state.enemies[0];
    for (let i = 0; i < 80; i++) world.step(0.05);
    assert.ok(
      Math.abs(enemy.progress - ENEMY_TYPES.crawler.speed * 4.05) < 1e-8,
    );
    const p = map.onRoad(enemy.progress);
    assert.equal(enemy.x, p.x);
    assert.equal(enemy.z, p.z);
    assert.ok(map.nearestRoad(enemy.x, enemy.z).distance < 1e-8);
    const result = world.build("bow", "A");
    assert.equal(result.building.x, map.SITES[0].x);
    assert.equal(result.building.z, map.SITES[0].z);
    assert.equal(world.state.gold, 240 - BUILDINGS.bow.cost);
  }
  assert.equal(DEFAULT_BATTLEFIELD.ROAD[0].x, -23);
});
test("defenders project onto the generated route and escaping enemies still cost lives", () => {
  const map = createBattlefield(78),
    world = createWorld(7391, map),
    point = map.onRoad(20);
  assert.equal(world.rally(point.x, point.z), true);
  assert.equal(world.state.guards.length, 2);
  for (const guard of world.state.guards)
    assert.ok(map.nearestRoad(guard.x, guard.z).distance < 1);
  world.callWave();
  world.step(0.05);
  const enemy = world.state.enemies[0];
  enemy.progress = map.ROAD_LENGTH - 0.01;
  world.step(0.05);
  assert.equal(world.state.lives, 19);
  assert.equal(world.state.enemies.includes(enemy), false);
});
test("route shuffle preserves AI designs and stores the selected layout seed", () => {
  const original = generateTheme("cyberpunk"),
    shuffled = validateTheme({ ...original, routeSeed: 987 });
  assert.equal(shuffled.seed, original.seed);
  assert.equal(shuffled.routeSeed, 987);
  assert.deepEqual(shuffled.towers, original.towers);
  assert.deepEqual(shuffled.palette, original.palette);
  assert.equal(
    validateTheme(JSON.parse(JSON.stringify(shuffled))).routeSeed,
    987,
  );
});

test("shuffle guarantees visibly different roads and build-site arrangements", () => {
  let nextSeed = 0;
  for (let seed = 0; seed < 100; seed++) {
    const a = createBattlefield(seed);
    const b = shuffleBattlefield(a, () => nextSeed++);
    const difference = layoutDifference(a, b);
    assert.ok(difference.road >= 3);
    assert.ok(difference.sites >= 3.5);
  }
});
