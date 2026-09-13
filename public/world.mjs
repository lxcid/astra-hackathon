import { DEFAULT_BATTLEFIELD } from "./battlefield.mjs";
export const { ROAD, ROAD_LENGTH, onRoad, nearestRoad, SITES } =
  DEFAULT_BATTLEFIELD;
export const BUILDINGS = {
  bow: {
    name: "Briar watch",
    cost: 65,
    range: 6.5,
    damage: 10,
    interval: 0.65,
    color: 0xb5d878,
    description:
      "Fast arrows. Excellent against runners. Armor reduces arrow damage.",
  },
  stone: {
    name: "Boulder lodge",
    cost: 90,
    range: 6.7,
    damage: 30,
    interval: 2.1,
    splash: 2.8,
    color: 0xe3b377,
    description: "Lobs boulders into clusters. Splash damage in a wide area.",
  },
  frost: {
    name: "Frost spire",
    cost: 80,
    range: 6.2,
    damage: 5,
    interval: 1,
    slow: 0.42,
    color: 0x91def2,
    description:
      "Slows a target by 58% for 2.4 seconds. Gives neighboring towers more time.",
  },
  ward: {
    name: "Sun lantern",
    cost: 100,
    range: 6.4,
    damage: 23,
    interval: 1.2,
    pierce: true,
    color: 0xffdc91,
    description:
      "Focused light ignores armor. Best against ironbacks and the elder.",
  },
};
export const ENEMY_TYPES = {
  crawler: {
    name: "Hollowling",
    health: 55,
    speed: 2.3,
    armor: 0,
    bounty: 8,
    leak: 1,
  },
  runner: {
    name: "Skitter",
    health: 38,
    speed: 3.6,
    armor: 0,
    bounty: 7,
    leak: 1,
  },
  brute: {
    name: "Ironback",
    health: 190,
    speed: 1.65,
    armor: 0.55,
    bounty: 20,
    leak: 2,
  },
  elder: {
    name: "Hollow elder",
    health: 850,
    speed: 1.25,
    armor: 0.3,
    bounty: 100,
    leak: 6,
  },
};
const repeat = (type, n) => Array(n).fill(type);
export const WAVES = [
  { name: "A rustle in the roots", enemies: repeat("crawler", 8), gap: 1.25 },
  {
    name: "Quick little shadows",
    enemies: [...repeat("runner", 9), ...repeat("crawler", 5)],
    gap: 0.85,
  },
  {
    name: "Iron in the bark",
    enemies: [
      "brute",
      "crawler",
      "crawler",
      "brute",
      "runner",
      "runner",
      "brute",
      "crawler",
      "crawler",
      "brute",
      "runner",
      "runner",
    ],
    gap: 1.15,
  },
  {
    name: "The hollow swarms",
    enemies: [...repeat("crawler", 12), ...repeat("runner", 10)],
    gap: 0.55,
  },
  {
    name: "An armored procession",
    enemies: [
      "brute",
      "runner",
      "runner",
      "brute",
      "crawler",
      "brute",
      "runner",
      "runner",
      "brute",
      "crawler",
      "brute",
      "runner",
      "runner",
      "brute",
      "crawler",
      "brute",
    ],
    gap: 0.9,
  },
  {
    name: "The ancient one",
    enemies: [
      ...repeat("crawler", 5),
      ...repeat("brute", 3),
      "elder",
      ...repeat("runner", 12),
      ...repeat("brute", 3),
    ],
    gap: 0.9,
  },
];
export function terrainHeight(x, z) {
  return 0.12;
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function towerStats(b) {
  const base = BUILDINGS[b.type];
  return {
    ...base,
    range: base.range + (b.level - 1) * 0.6,
    damage: base.damage * Math.pow(1.65, b.level - 1),
  };
}
export function upgradeCost(b) {
  return b.level >= 3
    ? null
    : Math.round(BUILDINGS[b.type].cost * (b.level === 1 ? 0.9 : 1.35));
}
export function createWorld(seed = 7391, battlefield = DEFAULT_BATTLEFIELD) {
  const { SITES, ROAD_LENGTH, onRoad, nearestRoad } = battlefield;
  let serial = 1,
    rng = seed >>> 0;
  const random = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 4294967296;
  };
  const state = {
    time: 0,
    lives: 20,
    gold: 240,
    spirit: 100,
    rallyCooldown: 0,
    wave: 0,
    waiting: true,
    spawnQueue: [],
    spawnTimer: 0,
    kills: 0,
    escaped: 0,
    ended: false,
    won: false,
    structures: [],
    enemies: [],
    guards: [],
    projectiles: [],
    events: [],
    effects: [],
    stats: { built: 0, blooms: 0, upgrades: 0 },
  };
  function event(text, tone = "info") {
    state.events.push({ id: serial++, text, tone, time: state.time });
  }
  function siteAt(x, z) {
    return SITES.find((s) => Math.hypot(s.x - x, s.z - z) < 2.1);
  }
  function build(type, siteId) {
    const site = SITES.find((s) => s.id === siteId);
    if (state.ended || !site || !BUILDINGS[type])
      return { ok: false, reason: "Choose a marked build site." };
    if (state.structures.some((b) => b.site === siteId))
      return { ok: false, reason: "This site already has a tower." };
    if (state.gold < BUILDINGS[type].cost)
      return {
        ok: false,
        reason: "Not enough amber. Defeat enemies to earn more.",
      };
    state.gold -= BUILDINGS[type].cost;
    const b = {
      id: serial++,
      type,
      site: siteId,
      x: site.x,
      z: site.z,
      level: 1,
      progress: 0,
      cooldown: 0,
      spent: BUILDINGS[type].cost,
    };
    state.structures.push(b);
    state.stats.built++;
    state.effects.push({ type: "complete", x: b.x, z: b.z });
    event(`${BUILDINGS[type].name} rising at site ${siteId}.`, "good");
    return { ok: true, building: b };
  }
  function upgrade(id) {
    const b = state.structures.find((b) => b.id === id),
      cost = b && upgradeCost(b);
    if (state.ended || !b || b.progress < 1 || cost === null) return false;
    if (state.gold < cost) {
      event(`Upgrade needs ${cost} amber.`, "warn");
      return false;
    }
    state.gold -= cost;
    b.spent += cost;
    b.level++;
    state.stats.upgrades++;
    state.effects.push({ type: "complete", x: b.x, z: b.z });
    event(`${BUILDINGS[b.type].name} upgraded to level ${b.level}.`, "good");
    return true;
  }
  function sell(id) {
    const b = state.structures.find((b) => b.id === id);
    if (!b || state.ended) return false;
    state.gold += Math.floor(b.spent * 0.7);
    state.structures = state.structures.filter((n) => n.id !== id);
    event("Tower reclaimed. 70% of amber returned.");
    return true;
  }
  function callWave() {
    if (!state.waiting || state.ended || state.wave >= WAVES.length)
      return false;
    const wave = WAVES[state.wave++];
    state.waiting = false;
    state.spawnQueue = [...wave.enemies];
    state.spawnTimer = 0;
    event(`Wave ${state.wave}: ${wave.name}.`, "danger");
    state.effects.push({ type: "wave" });
    return true;
  }
  function bloom(x, z) {
    if (state.ended || state.spirit < 40 || Math.hypot(x, z) > 27) return false;
    state.spirit -= 40;
    state.stats.blooms++;
    for (const e of state.enemies)
      if (distance(e, { x, z }) < 4.5) e.health -= 65;
    state.effects.push({ type: "bloom", x, z });
    return true;
  }
  function rally(x, z) {
    if (state.ended || state.rallyCooldown > 0) return false;
    const p = nearestRoad(x, z);
    if (p.distance > 4) {
      event("Rally your wardens directly on the road.", "warn");
      return false;
    }
    state.rallyCooldown = 20;
    for (let i = 0; i < 2; i++)
      state.guards.push({
        id: serial++,
        x: p.x + (i ? 0.45 : -0.45),
        z: p.z,
        health: 85,
        life: 13,
        cooldown: 0,
        phase: i * 2,
      });
    state.effects.push({ type: "complete", x: p.x, z: p.z });
    event("Root wardens will hold this bend for 13 seconds.", "good");
    return true;
  }
  function step(dt) {
    if (state.ended) return;
    state.time += dt;
    state.spirit = Math.min(100, state.spirit + dt * 3.5);
    state.rallyCooldown = Math.max(0, state.rallyCooldown - dt);
    state.spawnTimer -= dt;
    if (state.spawnQueue.length && state.spawnTimer <= 0) {
      const type = state.spawnQueue.shift(),
        def = ENEMY_TYPES[type];
      state.enemies.push({
        id: serial++,
        type,
        ...def,
        maxHealth: def.health,
        progress: 0,
        ...onRoad(0),
        phase: random() * 6,
        slowTime: 0,
        slow: 1,
      });
      state.spawnTimer += WAVES[state.wave - 1].gap;
    }
    for (const b of state.structures) {
      b.progress = Math.min(1, b.progress + dt / 1.5);
      b.cooldown -= dt;
      if (b.progress < 1) continue;
      const stats = towerStats(b),
        target = state.enemies
          .filter((e) => e.health > 0 && distance(b, e) <= stats.range)
          .sort((a, c) => c.progress - a.progress)[0];
      if (!target || b.cooldown > 0) continue;
      b.cooldown = stats.interval;
      state.projectiles.push({
        id: serial++,
        style: b.type,
        targetId: target.id,
        x: b.x,
        z: b.z,
        ex: target.x,
        ez: target.z,
        launchedAt: state.time,
        duration: b.type === "stone" ? 0.45 : 0.2,
        stats: { ...stats },
      });
      state.effects.push({ type: "shot", style: b.type });
    }

    const blocked = new Set();
    for (const g of state.guards) {
      g.life -= dt;
      g.cooldown -= dt;
      if (g.health <= 0 || g.life <= 0) continue;
      const e = state.enemies.find(
        (e) => e.health > 0 && !blocked.has(e.id) && distance(g, e) < 2.3,
      );
      if (e) {
        blocked.add(e.id);
        g.health -=
          dt * (e.type === "elder" ? 30 : e.type === "brute" ? 15 : 8);
        g.angle = Math.atan2(e.x - g.x, e.z - g.z);
        if (g.cooldown <= 0) {
          e.health -= 9 * (1 - e.armor);
          g.cooldown = 0.7;
          state.effects.push({ type: "hit", x: e.x, z: e.z });
        }
      }
    }
    state.guards = state.guards.filter((g) => g.health > 0 && g.life > 0);
    for (const e of state.enemies) {
      if (e.health <= 0) continue;
      e.slowTime = Math.max(0, e.slowTime - dt);
      e.blocked = blocked.has(e.id);
      if (!e.blocked)
        e.progress += dt * e.speed * (e.slowTime > 0 ? e.slow : 1);
      Object.assign(e, onRoad(e.progress));
      if (e.progress >= ROAD_LENGTH) {
        e.escaped = true;
        state.lives = Math.max(0, state.lives - e.leak);
        state.escaped++;
        state.effects.push({ type: "leak", x: e.x, z: e.z });
      }
    }
    // Flight and impacts use the same clock as enemy movement and rendering.
    // Track a living target; if it dies or escapes, finish at its last position.
    for (const p of state.projectiles) {
      const target = state.enemies.find(
        (e) => e.id === p.targetId && e.health > 0 && !e.escaped,
      );
      if (target) {
        p.ex = target.x;
        p.ez = target.z;
      }
      if (state.time - p.launchedAt + 1e-9 < p.duration) continue;
      const targets = p.stats.splash
        ? state.enemies.filter(
            (e) =>
              e.health > 0 &&
              !e.escaped &&
              Math.hypot(e.x - p.ex, e.z - p.ez) < p.stats.splash,
          )
        : target
          ? [target]
          : [];
      for (const e of targets) {
        e.health -= p.stats.damage * (p.stats.pierce ? 1 : 1 - e.armor);
        if (p.stats.slow) {
          e.slow = p.stats.slow;
          e.slowTime = 2.4;
        }
      }
      p.finished = true;
      state.effects.push({
        type: "impact",
        style: p.style,
        x: p.ex,
        z: p.ez,
        radius: p.stats.splash || 0.5,
      });
    }
    state.projectiles = state.projectiles.filter((p) => !p.finished);
    for (const e of state.enemies)
      if (e.health <= 0 && !e.escaped) {
        state.kills++;
        state.gold += e.bounty;
        state.effects.push({ type: "death", x: e.x, z: e.z });
      }
    state.enemies = state.enemies.filter((e) => !e.escaped && e.health > 0);
    if (state.lives <= 0) {
      state.ended = true;
      state.won = false;
      event("The hollow reached Alder.", "danger");
    } else if (
      !state.waiting &&
      !state.spawnQueue.length &&
      !state.enemies.length &&
      !state.projectiles.length
    ) {
      if (state.wave === WAVES.length) {
        state.ended = true;
        state.won = true;
        event("The road is quiet. Alder stands.", "good");
      } else {
        state.waiting = true;
        const reward = 25 + state.wave * 5;
        state.gold += reward;
        event(
          `Wave cleared. +${reward} amber. Prepare, then call the next wave.`,
          "good",
        );
      }
    }
  }
  return {
    state,
    step,
    build,
    upgrade,
    sell,
    callWave,
    bloom,
    rally,
    siteAt,
    event,
    random,
  };
}
