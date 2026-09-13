// Presentation-only contract. This module never imports or modifies the simulation.
export const DEFAULT_THEME = "enchanted woodland fantasy";
export const ROLES = ["bow", "stone", "frost", "ward"];
export const ENEMIES = ["crawler", "runner", "brute", "elder"];
export const ROLE_COPY = {
  bow: "Rapid physical shots. Armor reduces damage.",
  stone: "Slow physical shots with area damage.",
  frost: "Slows targets by 58% for 2.4 seconds.",
  ward: "Focused shots that ignore armor.",
  rally: "Two defenders block the road for 13 seconds. 20-second cooldown.",
  bloom: "65 area damage, ignoring armor. Costs 40 spirit.",
};
export function hash(text) {
  let h = 2166136261;
  for (const char of text) h = Math.imul(h ^ char.codePointAt(0), 16777619);
  return h >>> 0;
}
export function seededRandom(seed) {
  let value = seed >>> 0;
  return () =>
    (value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const families = [
  {
    id: "woodland",
    words: [
      "woodland",
      "forest",
      "enchanted",
      "tree",
      "nature",
      "fairy",
      "jungle",
    ],
    title: "The Winding Hollow",
    goal: "Ancient tree",
    motif: "tree",
    unit: "beetle",
    colors: [
      "#416872",
      "#63845b",
      "#c5a878",
      "#635547",
      "#355e48",
      "#d4b787",
      "#bceaa1",
      "#282c35",
      "#ff8866",
    ],
    towers: ["Briar watch", "Boulder lodge", "Frost spire", "Sun lantern"],
    enemies: ["Hollowling", "Skitter", "Ironback", "Hollow elder"],
    abilities: ["Root wardens", "Life bloom"],
  },
  {
    id: "cyber",
    words: [
      "cyber",
      "cyberpunk",
      "neon",
      "robot",
      "city",
      "future",
      "digital",
      "sci-fi",
      "scifi",
      "technology",
    ],
    title: "Neon Circuit",
    goal: "Central core",
    motif: "city",
    unit: "robot",
    colors: [
      "#101a36",
      "#28354b",
      "#586581",
      "#28344e",
      "#43537d",
      "#b1c8f4",
      "#47ffe3",
      "#30253f",
      "#ff528b",
    ],
    towers: ["Pulse sentry", "Siege array", "Stasis relay", "Ion lance"],
    enemies: ["Rogue drone", "Dash bot", "Bulwark", "Overseer"],
    abilities: ["Mech patrol", "Plasma surge"],
  },
  {
    id: "candy",
    words: [
      "candy",
      "sweet",
      "sugar",
      "dessert",
      "chocolate",
      "cake",
      "ice cream",
    ],
    title: "Sugarbend Valley",
    goal: "Candy palace",
    motif: "candy",
    unit: "blob",
    colors: [
      "#826b9c",
      "#c39fb6",
      "#f4d1a2",
      "#956282",
      "#e891b1",
      "#fff0d8",
      "#a9f5e6",
      "#824d83",
      "#ff9f70",
    ],
    towers: [
      "Sprinkle sentry",
      "Gumdrop mortar",
      "Syrup spinner",
      "Sugar prism",
    ],
    enemies: ["Sour bite", "Jelly sprinter", "Rock candy", "Licorice king"],
    abilities: ["Cookie guards", "Sugar rush"],
  },
  {
    id: "desert",
    words: ["desert", "sand", "egypt", "pharaoh", "oasis", "ancient", "dune"],
    title: "The Amber Passage",
    goal: "Sun temple",
    motif: "desert",
    unit: "beetle",
    colors: [
      "#9b8274",
      "#c6a073",
      "#e4c294",
      "#a17b53",
      "#866b4a",
      "#ffe2a7",
      "#61e4d6",
      "#63525b",
      "#ffb05c",
    ],
    towers: ["Dune watch", "Obelisk mortar", "Quicksand pillar", "Solar lens"],
    enemies: ["Scarab", "Sandstrider", "Stoneback", "Dune sovereign"],
    abilities: ["Temple guardians", "Sunburst"],
  },
  {
    id: "ocean",
    words: [
      "ocean",
      "underwater",
      "sea",
      "coral",
      "atlantis",
      "aquatic",
      "pirate",
    ],
    title: "The Coral Crossing",
    goal: "Pearl sanctuary",
    motif: "coral",
    unit: "blob",
    colors: [
      "#174e69",
      "#4b8589",
      "#a6bdb0",
      "#526782",
      "#aa7ea0",
      "#cbe8d4",
      "#6dffe1",
      "#384b79",
      "#ff967e",
    ],
    towers: ["Harpoon perch", "Shell mortar", "Tide anchor", "Pearl ray"],
    enemies: ["Deep lurker", "Reef dart", "Shellback", "Abyss monarch"],
    abilities: ["Reef guardians", "Tidal pulse"],
  },
  {
    id: "volcanic",
    words: [
      "lava",
      "volcano",
      "volcanic",
      "fire",
      "inferno",
      "hell",
      "demon",
      "dragon",
    ],
    title: "Cinderfall Reach",
    goal: "Ember heart",
    motif: "crystal",
    unit: "beetle",
    colors: [
      "#46313e",
      "#55434a",
      "#a07769",
      "#4f3941",
      "#8c4c43",
      "#e5b593",
      "#ffbb50",
      "#2b2635",
      "#ff5f3b",
    ],
    towers: ["Cinder watch", "Magma mortar", "Ash binder", "Flare prism"],
    enemies: ["Ashling", "Spark runner", "Basalt brute", "Cinder titan"],
    abilities: ["Ash sentinels", "Eruption"],
  },
  {
    id: "space",
    words: [
      "space",
      "alien",
      "galaxy",
      "cosmic",
      "moon",
      "lunar",
      "planet",
      "star",
    ],
    title: "Astral Frontier",
    goal: "Beacon",
    motif: "crystal",
    unit: "robot",
    colors: [
      "#191d39",
      "#6b6986",
      "#a2a0b8",
      "#514d73",
      "#8271ae",
      "#d3c5f1",
      "#97eaff",
      "#342d59",
      "#ff8fbb",
    ],
    towers: ["Orbital sentry", "Meteor driver", "Gravity well", "Photon lance"],
    enemies: ["Voidling", "Comet scout", "Hullbreaker", "Void colossus"],
    abilities: ["Star marines", "Nova pulse"],
  },
  {
    id: "winter",
    words: ["winter", "snow", "ice", "frozen", "arctic", "frost"],
    title: "The Glass Pass",
    goal: "Aurora shrine",
    motif: "crystal",
    unit: "beetle",
    colors: [
      "#658d9f",
      "#acc3cb",
      "#dce2dc",
      "#657f92",
      "#7aabba",
      "#e6f3ed",
      "#99ffe7",
      "#49657d",
      "#ee97bc",
    ],
    towers: ["Snow watch", "Glacier mortar", "Rime needle", "Aurora lens"],
    enemies: ["Snowling", "Ice runner", "Glacierback", "Winter giant"],
    abilities: ["Frost guardians", "Aurora burst"],
  },
];
function titleCase(value) {
  return value.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}
function colorFromHue(h, saturation, lightness) {
  const a = saturation * Math.min(lightness, 1 - lightness);
  const channel = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round(
      255 * (lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))),
    )
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}
export function generateTheme(input, variant = 0) {
  if (typeof input !== "string" || !input.trim() || input.trim().length > 160)
    throw new Error("Describe your theme in 1–160 characters.");
  const prompt = input.trim().replace(/\s+/g, " ");
  const text = prompt.toLowerCase();
  const ranked = families
    .map((f) => ({
      f,
      score: f.words.reduce(
        (sum, word) => sum + (text.includes(word) ? 1 : 0),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score);
  const known = ranked[0].score > 0;
  const base = known ? ranked[0].f : families[hash(text) % families.length];
  const seed = hash(`${text}:${variant}`),
    random = seededRandom(seed);
  const colors = [...base.colors];
  if (!known) {
    const hue = hash(text) % 360;
    [colors[0], colors[1], colors[4], colors[6]] = [
      colorFromHue(hue, 0.3, 0.24),
      colorFromHue(hue, 0.25, 0.42),
      colorFromHue((hue + 35) % 360, 0.4, 0.45),
      colorFromHue((hue + 140) % 360, 0.8, 0.78),
    ];
  }
  const prefix = titleCase(prompt.split(" ").slice(0, 2).join(" "));
  const names = known
    ? base.towers
    : ["Sentry", "Mortar", "Binder", "Prism"].map((n) => `${prefix} ${n}`);
  return validateTheme({
    version: 1,
    prompt,
    seed,
    source: "procedural",
    family: known ? base.id : "abstract",
    title: known ? base.title : `${prefix} Crossing`,
    interpretation: known
      ? `${titleCase(base.id)} forms, composed for your theme.`
      : "An abstract interpretation using your words to seed colors and forms.",
    goal: known ? base.goal : `${prefix} Heart`,
    motif: base.motif,
    unit: base.unit,
    palette: Object.fromEntries(
      [
        "sky",
        "ground",
        "road",
        "body",
        "foliage",
        "trim",
        "glow",
        "enemy",
        "danger",
      ].map((k, i) => [k, colors[i]]),
    ),
    geometry: {
      sides: 5 + Math.floor(random() * 4),
      crown: 0.8 + random() * 0.5,
      tiers: 2 + Math.floor(random() * 3),
      twist: random() * Math.PI,
      scatter: 44 + Math.floor(random() * 18),
    },
    towers: Object.fromEntries(
      ROLES.map((role, i) => [
        role,
        {
          name: names[i],
          color: [colors[6], colors[5], colors[4], colors[6]][i],
        },
      ]),
    ),
    enemies: Object.fromEntries(
      ENEMIES.map((role, i) => [
        role,
        {
          name: known
            ? base.enemies[i]
            : `${prefix} ${["Drifter", "Runner", "Brute", "Titan"][i]}`,
        },
      ]),
    ),
    abilities: {
      rally: { name: known ? base.abilities[0] : `${prefix} Guardians` },
      bloom: {
        name: known ? base.abilities[1] : `${prefix} Burst`,
        color: colors[6],
      },
    },
  });
}
// Rebuild an allowlisted object; external generators cannot supply combat fields,
// executable code, URLs, or arbitrary/unbounded polygon counts.
export function validateTheme(value) {
  if (!value || value.version !== 1)
    throw new Error("Unsupported theme version.");
  const string = (v, max = 80) => {
    if (typeof v !== "string" || !v.trim() || v.length > max)
      throw new Error("Invalid theme text.");
    return v.trim();
  };
  const color = (v) => {
    if (typeof v !== "string" || !/^#[0-9a-f]{6}$/i.test(v))
      throw new Error("Invalid theme color.");
    return v;
  };
  const choice = (v, options) => {
    if (!options.includes(v)) throw new Error("Invalid theme shape.");
    return v;
  };
  const number = (v, min, max) => {
    if (!Number.isFinite(v) || v < min || v > max)
      throw new Error("Invalid geometry bounds.");
    return v;
  };
  const g = value.geometry;
  if (!g) throw new Error("Missing theme geometry.");
  const vector = (v, min, max) => {
    if (!Array.isArray(v) || v.length !== 3)
      throw new Error("Invalid mesh vector.");
    return v.map((n) => number(n, min, max));
  };
  const model = (parts) => {
    if (!Array.isArray(parts) || parts.length < 1 || parts.length > 24)
      throw new Error("Models need 1–24 parts.");
    return parts.map((part) => ({
      shape: choice(part.shape, ["box", "sphere", "cone", "cylinder", "torus"]),
      material: choice(part.material, [
        "body",
        "foliage",
        "trim",
        "glow",
        "enemy",
        "danger",
        "road",
      ]),
      position: vector(part.position, -3, 5),
      scale: vector(part.scale, 0.03, 4),
      rotation: vector(part.rotation, -Math.PI, Math.PI),
    }));
  };
  const result = {
    version: 1,
    prompt: string(value.prompt, 160),
    seed: number(value.seed, 0, 4294967295),
    routeSeed: Math.floor(number(value.routeSeed ?? value.seed, 0, 4294967295)),
    source: choice(value.source, ["procedural", "ai"]),
    family: string(value.family),
    title: string(value.title),
    goal: string(value.goal),
    interpretation: string(value.interpretation, 200),
    motif: choice(value.motif, [
      "tree",
      "city",
      "candy",
      "desert",
      "coral",
      "crystal",
    ]),
    unit: choice(value.unit, ["beetle", "robot", "blob"]),
    palette: Object.fromEntries(
      [
        "sky",
        "ground",
        "road",
        "body",
        "foliage",
        "trim",
        "glow",
        "enemy",
        "danger",
      ].map((k) => [k, color(value.palette?.[k])]),
    ),
    geometry: {
      sides: Math.floor(number(g.sides, 3, 12)),
      crown: number(g.crown, 0.6, 1.5),
      tiers: Math.floor(number(g.tiers, 1, 4)),
      twist: number(g.twist, 0, Math.PI * 2),
      scatter: Math.floor(number(g.scatter, 20, 70)),
    },
    towers: Object.fromEntries(
      ROLES.map((k) => [
        k,
        {
          name: string(value.towers?.[k]?.name),
          color: color(value.towers?.[k]?.color),
        },
      ]),
    ),
    enemies: Object.fromEntries(
      ENEMIES.map((k) => [k, { name: string(value.enemies?.[k]?.name) }]),
    ),
    abilities: {
      rally: { name: string(value.abilities?.rally?.name) },
      bloom: {
        name: string(value.abilities?.bloom?.name),
        color: color(value.abilities?.bloom?.color),
      },
    },
  };
  if (value.source === "ai" && !value.models)
    throw new Error("AI themes require polygon designs.");
  if (value.models)
    result.models = Object.fromEntries(
      [...ROLES, ...ENEMIES, "guardian", "scenery", "goal"].map((k) => [
        k,
        model(value.models[k]),
      ]),
    );
  const freeze = (object) => {
    Object.values(object).forEach((v) => {
      if (v && typeof v === "object") freeze(v);
    });
    return Object.freeze(object);
  };
  return freeze(result);
}
export let activeTheme = generateTheme(DEFAULT_THEME);
export function setActiveTheme(theme) {
  activeTheme = validateTheme(theme);
}
