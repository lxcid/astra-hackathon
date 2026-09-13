import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createWorld,
  ROAD_LENGTH,
  onRoad,
  nearestRoad,
  SITES,
  ENEMY_TYPES,
  upgradeCost,
} from "../public/world.mjs";
function advance(w, seconds) {
  for (let i = 0; i < Math.round(seconds / 0.05); i++) w.step(0.05);
}
function enemy(w, type, progress) {
  const def = ENEMY_TYPES[type];
  const e = {
    id: 1000 + w.state.enemies.length,
    type,
    ...def,
    maxHealth: def.health,
    progress,
    ...onRoad(progress),
    slowTime: 0,
    slow: 1,
  };
  w.state.enemies.push(e);
  return e;
}

test("road sampling preserves progress and projects positions back to the same road", () => {
  for (let p = 0; p < ROAD_LENGTH; p += 0.3) {
    const pos = onRoad(p),
      nearest = nearestRoad(pos.x, pos.z);
    assert.ok(nearest.distance < 1e-8);
    assert.ok(Math.abs(nearest.progress - p) < 1e-8);
  }
  assert.ok(ROAD_LENGTH > 70);
});
test("enemies wait for an explicit wave call and spawn in a staggered line", () => {
  const w = createWorld();
  advance(w, 30);
  assert.equal(w.state.enemies.length, 0);
  assert.equal(w.callWave(), true);
  assert.equal(w.callWave(), false);
  advance(w, 0.05);
  assert.equal(w.state.enemies.length, 1);
  advance(w, 1.25);
  assert.equal(w.state.enemies.length, 2);
  assert.ok(w.state.enemies[0].progress > w.state.enemies[1].progress);
});
test("unblocked enemies advance at constant path speed, including corners", () => {
  const w = createWorld(),
    e = enemy(w, "crawler", 8);
  advance(w, 6);
  assert.ok(Math.abs(e.progress - (8 + 6 * e.speed)) < 1e-8);
  const p = onRoad(e.progress);
  assert.equal(e.x, p.x);
  assert.equal(e.z, p.z);
});
test("only designated unoccupied sites can be built and failed orders do not spend amber", () => {
  const w = createWorld();
  assert.equal(w.build("bow", "unknown").ok, false);
  assert.equal(w.state.gold, 240);
  assert.equal(w.build("bow", "B").ok, true);
  assert.equal(w.build("ward", "B").ok, false);
  assert.equal(w.state.gold, 175);
  w.state.gold = 0;
  assert.equal(w.build("ward", "C").ok, false);
});
test("upgrades are capped at three and sales refund 70 percent of actual investment", () => {
  const w = createWorld(),
    b = w.build("bow", "B").building;
  advance(w, 2);
  w.state.gold = 1000;
  const first = upgradeCost(b);
  assert.equal(w.upgrade(b.id), true);
  const second = upgradeCost(b);
  assert.equal(w.upgrade(b.id), true);
  assert.equal(b.level, 3);
  assert.equal(w.upgrade(b.id), false);
  const before = w.state.gold;
  assert.equal(w.sell(b.id), true);
  assert.equal(w.state.gold - before, Math.floor((65 + first + second) * 0.7));
  assert.equal(w.sell(b.id), false);
});
test("sun lanterns bypass armor while arrows are reduced", () => {
  for (const [type, damage] of [
    ["bow", 10 * 0.45],
    ["ward", 23],
  ]) {
    const w = createWorld();
    const b = w.build(type, "B").building;
    b.progress = 1;
    const near = nearestRoad(b.x, b.z);
    const e = enemy(w, "brute", near.progress);
    advance(w, 0.25);
    assert.ok(Math.abs(190 - e.health - damage) < 1e-8);
  }
});
test("frost slows progress and wears off away from the tower", () => {
  const w = createWorld(),
    b = w.build("frost", "B").building;
  b.progress = 1;
  const e = enemy(w, "brute", nearestRoad(b.x, b.z).progress);
  advance(w, 0.25);
  assert.ok(e.slowTime > 0);
  w.state.structures = [];
  const before = e.progress;
  advance(w, 1);
  assert.ok(e.progress - before < e.speed * 0.5);
  advance(w, 3);
  assert.equal(e.slowTime, 0);
});
test("wardens block nearby enemies without diverting them from the road", () => {
  const w = createWorld(),
    p = onRoad(30);
  assert.equal(w.rally(p.x, p.z), true);
  const e = enemy(w, "brute", 30);
  advance(w, 0.5);
  assert.equal(e.progress, 30);
  assert.equal(e.blocked, true);
  assert.equal(w.rally(p.x, p.z), false);
  w.state.guards = [];
  advance(w, 0.5);
  assert.ok(e.progress > 30);
});
test("life bloom damages only its radius and rejects insufficient spirit", () => {
  const w = createWorld(),
    a = enemy(w, "brute", 10),
    b = enemy(w, "brute", 40);
  assert.equal(w.bloom(a.x, a.z), true);
  assert.equal(a.health, 125);
  assert.equal(b.health, 190);
  w.state.spirit = 10;
  assert.equal(w.bloom(a.x, a.z), false);
  assert.equal(w.state.spirit, 10);
});
test("enemies leak once, deduct correct lives, and do not pay a kill bounty", () => {
  const w = createWorld();
  enemy(w, "brute", ROAD_LENGTH - 0.01);
  advance(w, 1);
  assert.equal(w.state.lives, 18);
  assert.equal(w.state.escaped, 1);
  assert.equal(w.state.gold, 240);
  assert.equal(w.state.kills, 0);
  advance(w, 1);
  assert.equal(w.state.lives, 18);
});
test("undefended waves eventually lose and the ended simulation is immutable", () => {
  const w = createWorld();
  for (let i = 0; i < 12000 && !w.state.ended; i++) {
    if (w.state.waiting) w.callWave();
    w.step(0.05);
  }
  assert.equal(w.state.ended, true);
  assert.equal(w.state.won, false);
  const snapshot = structuredClone(w.state);
  advance(w, 5);
  assert.deepEqual(w.state, snapshot);
});
test("a funded defense can complete all waves with no enemies or pending spawns", () => {
  const w = createWorld();
  w.state.gold = 5000;
  for (let i = 0; i < SITES.length; i++) {
    const b = w.build(i % 2 ? "ward" : "bow", SITES[i].id).building;
    b.progress = 1;
    w.upgrade(b.id);
    w.upgrade(b.id);
  }
  for (let i = 0; i < 12000 && !w.state.ended; i++) {
    if (w.state.waiting) w.callWave();
    w.step(0.05);
  }
  assert.equal(w.state.won, true);
  assert.equal(w.state.wave, 6);
  assert.equal(w.state.lives, 20);
  assert.equal(w.state.enemies.length, 0);
  assert.equal(w.state.spawnQueue.length, 0);
});
test("a normal-budget mixed defense can win using only earned amber", () => {
  const w = createWorld(),
    s = w.state,
    plan = [
      ["bow", "A"],
      ["stone", "B"],
      ["bow", "D"],
      ["ward", "E"],
      ["frost", "I"],
      ["ward", "H"],
      ["bow", "C"],
      ["ward", "J"],
    ];
  let placed = 0;
  for (let i = 0; i < 20000 && !s.ended; i++) {
    if (s.waiting) {
      while (placed < plan.length && w.build(...plan[placed]).ok) placed++;
      for (const b of s.structures)
        if (b.progress === 1 && b.level < 3 && s.gold >= upgradeCost(b))
          w.upgrade(b.id);
      w.callWave();
    }
    w.step(0.05);
  }
  assert.equal(s.won, true);
  assert.ok(s.lives > 0);
  assert.ok(s.gold >= 0);
});
test("boulder splash damages clustered enemies but not a distant target", () => {
  const w = createWorld(),
    b = w.build("stone", "B").building;
  b.progress = 1;
  const p = nearestRoad(b.x, b.z).progress,
    a = enemy(w, "crawler", p),
    c = enemy(w, "crawler", p - 1),
    far = enemy(w, "crawler", p - 9);
  advance(w, 0.5);
  assert.equal(a.health, 25);
  assert.equal(c.health, 25);
  assert.equal(far.health, 55);
});

test("lethal boulders keep enemies alive until impact and award one bounty", () => {
  const w = createWorld(),
    b = w.build("stone", "B").building;
  b.progress = 1;
  const e = enemy(w, "crawler", nearestRoad(b.x, b.z).progress);
  e.health = 20;
  const gold = w.state.gold;
  w.step(0.05);
  assert.equal(w.state.projectiles.length, 1);
  assert.equal(e.health, 20);
  advance(w, 0.4);
  assert.ok(w.state.enemies.includes(e));
  assert.equal(e.health, 20);
  assert.equal(w.state.gold, gold);
  w.step(0.05);
  assert.equal(w.state.enemies.length, 0);
  assert.equal(w.state.projectiles.length, 0);
  assert.equal(w.state.kills, 1);
  assert.equal(w.state.gold, gold + e.bounty);
  assert.equal(w.state.effects.filter((e) => e.type === "impact").length, 1);
  advance(w, 1);
  assert.equal(w.state.kills, 1);
});
test("splash resolves at the moving target's impact position with current nearby enemies", () => {
  const w = createWorld(),
    b = w.build("stone", "B").building;
  b.progress = 1;
  const p = nearestRoad(b.x, b.z).progress;
  const target = enemy(w, "crawler", p),
    nearby = enemy(w, "crawler", p - 1),
    incoming = enemy(w, "crawler", p - 10);
  w.step(0.05);
  // One enemy leaves the blast while another enters before impact.
  nearby.progress = p - 12;
  incoming.progress = target.progress - 1;
  advance(w, 0.45);
  assert.equal(target.health, 25);
  assert.equal(nearby.health, 55);
  assert.equal(incoming.health, 25);
  const impact = w.state.effects.find((e) => e.type === "impact");
  assert.equal(impact.x, target.x);
  assert.equal(impact.z, target.z);
});
test("in-flight shots retain fired stats after upgrades and sales", () => {
  const w = createWorld(),
    b = w.build("ward", "B").building;
  b.progress = 1;
  const e = enemy(w, "brute", nearestRoad(b.x, b.z).progress);
  w.step(0.05);
  w.state.gold = 1000;
  w.upgrade(b.id);
  w.sell(b.id);
  advance(w, 0.2);
  assert.equal(e.health, 190 - 23);
});
test("shots cannot reward a dead or escaped target twice and waves wait for flight to finish", () => {
  for (const escaped of [false, true]) {
    const w = createWorld(),
      b = w.build("ward", "B").building;
    b.progress = 1;
    const e = enemy(w, "crawler", nearestRoad(b.x, b.z).progress);
    w.state.waiting = false;
    w.state.wave = 1;
    w.step(0.05);
    if (escaped) e.progress = ROAD_LENGTH;
    else w.bloom(e.x, e.z);
    w.step(0.05);
    assert.equal(w.state.waiting, false);
    assert.equal(w.state.kills, escaped ? 0 : 1);
    const gold = w.state.gold;
    advance(w, 0.15);
    assert.equal(w.state.waiting, true);
    assert.equal(w.state.gold, gold + 30);
    assert.equal(w.state.projectiles.length, 0);
  }
});
