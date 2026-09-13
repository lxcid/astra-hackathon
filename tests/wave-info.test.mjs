import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, WAVES, ENEMY_TYPES } from "../public/world.mjs";
import { currentWaveIndex, waveIntel } from "../public/wave-info.mjs";
test("intel defaults to the upcoming wave in preparation and current wave during combat", () => {
  const world = createWorld();
  assert.equal(currentWaveIndex(world.state), 0);
  world.callWave();
  world.step(0.05);
  assert.equal(currentWaveIndex(world.state), 0);
  const intel = waveIntel(world.state);
  assert.equal(intel.active, true);
  assert.equal(intel.units[0].count, 8);
  assert.equal(intel.units[0].onRoad, 1);
  assert.equal(intel.units[0].queued, 7);
  world.state.waiting = true;
  assert.equal(currentWaveIndex(world.state), 1);
  world.state.ended = true;
  assert.equal(currentWaveIndex(world.state), 0);
});
test("mixed-wave intel uses exact roster counts and simulation stats including the boss", () => {
  const world = createWorld();
  for (let i = 0; i < WAVES.length; i++) {
    const intel = waveIntel(world.state, i);
    assert.equal(
      intel.units.reduce((n, u) => n + u.count, 0),
      WAVES[i].enemies.length,
    );
    for (const unit of intel.units)
      for (const key of ["health", "speed", "armor", "bounty", "leak"])
        assert.equal(unit[key], ENEMY_TYPES[unit.type][key]);
  }
  assert.equal(
    waveIntel(world.state, 5).units.find((u) => u.type === "elder").health,
    850,
  );
  assert.throws(() => waveIntel(world.state, 6));
});
