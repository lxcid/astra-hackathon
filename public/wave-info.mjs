import { ENEMY_TYPES, WAVES } from "./world.mjs";
const advice = {
  crawler: "Standard troops. Rapid towers are a cost-effective defense.",
  runner: "Fast but fragile. Use rapid shots and slowing towers.",
  brute: "Heavy armor. Piercing towers ignore its physical resistance.",
  elder:
    "High health and armor. Combine piercing shots, slowing, and defenders.",
};
const labels = {
  crawler: "Standard",
  runner: "Runner",
  brute: "Armored",
  elder: "Boss",
};
export function currentWaveIndex(state) {
  return Math.max(
    0,
    Math.min(
      WAVES.length - 1,
      state.waiting && !state.ended ? state.wave : state.wave - 1,
    ),
  );
}
export function waveIntel(state, index = currentWaveIndex(state)) {
  if (!Number.isInteger(index) || !WAVES[index])
    throw new Error("Invalid wave.");
  const wave = WAVES[index],
    active = state.wave === index + 1 && !state.waiting && !state.ended;
  return {
    index,
    active,
    total: wave.enemies.length,
    gap: wave.gap,
    units: Object.keys(ENEMY_TYPES)
      .filter((type) => wave.enemies.includes(type))
      .map((type) => ({
        type,
        ...ENEMY_TYPES[type],
        role: labels[type],
        advice: advice[type],
        count: wave.enemies.filter((t) => t === type).length,
        onRoad: active
          ? state.enemies.filter((e) => e.type === type).length
          : 0,
        queued: active ? state.spawnQueue.filter((t) => t === type).length : 0,
      })),
  };
}
export function renderWaveIntel(theme, state, index, portrait) {
  const intel = waveIntel(state, index),
    list = document.querySelector("#wave-enemies");
  document.querySelector("#wave-info-title").textContent =
    `Wave ${index + 1} · ${intel.active ? "In progress" : index === currentWaveIndex(state) && state.waiting ? "Up next" : "Enemy roster"}`;
  document.querySelector("#wave-info-summary").textContent =
    `${intel.total} enemies · one arrives every ${intel.gap}s · ${intel.units.length} unit ${intel.units.length === 1 ? "type" : "types"}`;
  list.replaceChildren();
  for (const unit of intel.units) {
    const card = document.createElement("article");
    card.className = "enemy-card";
    const image = document.createElement("img");
    image.src = portrait(unit.type);
    image.alt = theme.enemies[unit.type].name;
    image.width = 176;
    image.height = 132;
    card.append(image);
    const copy = document.createElement("div");
    copy.className = "enemy-card-copy";
    const role = document.createElement("span");
    role.className = "eyebrow";
    role.textContent = `${unit.role} · ×${unit.count}`;
    const title = document.createElement("h3");
    title.textContent = theme.enemies[unit.type].name;
    const stats = document.createElement("dl");
    for (const [name, value] of [
      ["Health", unit.health],
      ["Speed", `${unit.speed} / s`],
      ["Armor", `${Math.round(unit.armor * 100)}%`],
      ["Bounty", `${unit.bounty} amber`],
      ["On escape", `${unit.leak} ${unit.leak === 1 ? "life" : "lives"}`],
    ]) {
      const row = document.createElement("div"),
        term = document.createElement("dt"),
        detail = document.createElement("dd");
      term.textContent = name;
      detail.textContent = value;
      row.append(term, detail);
      stats.append(row);
    }
    const tip = document.createElement("p");
    tip.className = "enemy-counter";
    tip.textContent = unit.advice;
    copy.append(role, title, stats, tip);
    if (intel.active) {
      const remaining = document.createElement("small");
      remaining.textContent = `${unit.onRoad} on the road · ${unit.queued} still approaching`;
      copy.append(remaining);
    }
    card.append(copy);
    list.append(card);
  }
}
