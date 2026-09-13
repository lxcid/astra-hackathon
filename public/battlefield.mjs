// The simulation and renderer share one sampled road, measured in world distance.
export const WAYPOINTS = [
  [-23, 9],
  [-17, 9],
  [-12, 12],
  [-6, 12],
  [-3, 8],
  [-3, 3],
  [-8, 0],
  [-14, 0],
  [-16, -5],
  [-13, -10],
  [-7, -10],
  [-2, -7],
  [3, -7],
  [7, -11],
];
const BASE_SITES = [
  { id: "A", x: -15, z: 13 },
  { id: "B", x: -8, z: 8 },
  { id: "C", x: 1, z: 9 },
  { id: "D", x: -7, z: 4 },
  { id: "E", x: -11, z: -4 },
  { id: "F", x: -19, z: -5 },
  { id: "G", x: -8, z: -14 },
  { id: "H", x: 0, z: -12 },
  { id: "I", x: 3, z: -2 },
  { id: "J", x: 9, z: -5 },
];

export function sampleRoad(waypoints) {
  const ROAD = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[Math.max(0, i - 1)],
      b = waypoints[i],
      c = waypoints[i + 1],
      d = waypoints[Math.min(waypoints.length - 1, i + 2)];
    for (let j = 0; j < 18; j++) {
      const t = j / 18,
        t2 = t * t,
        t3 = t2 * t;
      const coord = (k) =>
        0.5 *
        (2 * b[k] +
          (-a[k] + c[k]) * t +
          (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 +
          (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3);
      ROAD.push({ x: coord(0), z: coord(1) });
    }
  }
  ROAD.push({ x: waypoints.at(-1)[0], z: waypoints.at(-1)[1] });
  ROAD[0].distance = 0;
  for (let i = 1; i < ROAD.length; i++)
    ROAD[i].distance =
      ROAD[i - 1].distance +
      Math.hypot(ROAD[i].x - ROAD[i - 1].x, ROAD[i].z - ROAD[i - 1].z);
  const ROAD_LENGTH = ROAD.at(-1).distance;
  function onRoad(progress) {
    const p = Math.max(0, Math.min(ROAD_LENGTH, progress));
    let low = 0,
      high = ROAD.length - 1;
    while (low + 1 < high) {
      const mid = (low + high) >> 1;
      if (ROAD[mid].distance <= p) low = mid;
      else high = mid;
    }
    const a = ROAD[low],
      b = ROAD[high],
      t = (p - a.distance) / (b.distance - a.distance || 1);
    return {
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      angle: Math.atan2(b.x - a.x, b.z - a.z),
    };
  }
  function nearestRoad(x, z) {
    let best = { distance: Infinity };
    for (let i = 1; i < ROAD.length; i++) {
      const a = ROAD[i - 1],
        b = ROAD[i],
        dx = b.x - a.x,
        dz = b.z - a.z,
        t = Math.max(
          0,
          Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)),
        ),
        px = a.x + dx * t,
        pz = a.z + dz * t,
        distance = Math.hypot(x - px, z - pz);
      if (distance < best.distance)
        best = {
          x: px,
          z: pz,
          distance,
          progress: a.distance + (b.distance - a.distance) * t,
        };
    }
    return best;
  }
  return { ROAD, ROAD_LENGTH, onRoad, nearestRoad };
}

export const DEFAULT_BATTLEFIELD = Object.freeze({
  ...sampleRoad(WAYPOINTS),
  SITES: BASE_SITES,
  seed: null,
  goal: { x: 9, z: -13 },
});
function coverage(road, site, range = 6.2) {
  let length = 0;
  for (let i = 1; i < road.length; i++) {
    const a = road[i - 1],
      b = road[i];
    if (Math.hypot((a.x + b.x) / 2 - site.x, (a.z + b.z) / 2 - site.z) < range)
      length += b.distance - a.distance;
  }
  return length;
}
// Different route families change the arrangement of lanes, not just bend curvature.
const ROUTES = [
  [
    [-19, 14],
    [-10, 14],
    [0, 14],
    [10, 12],
    [14, 6],
    [10, 0],
    [0, 0],
    [-10, 0],
    [-14, -6],
    [-10, -13],
    [0, -14],
    [12, -14],
  ],
  [
    [-19, 10],
    [-12, 15],
    [-3, 17],
    [8, 14],
    [15, 6],
    [15, -5],
    [8, -13],
    [-2, -15],
    [-11, -10],
    [-12, -2],
    [-5, 3],
    [3, 2],
  ],
  [
    [-18, 15],
    [-18, 5],
    [-16, -7],
    [-10, -14],
    [-3, -12],
    [0, -4],
    [0, 6],
    [6, 12],
    [13, 8],
    [16, 0],
    [16, -12],
  ],
];
export function inspectBattlefield(map) {
  const issues = [];
  const ratio = map.ROAD_LENGTH / DEFAULT_BATTLEFIELD.ROAD_LENGTH;
  if (ratio < 0.95 || ratio > 1.05) issues.push("length");
  if (map.ROAD.some((p) => Math.hypot(p.x, p.z) > 25)) issues.push("bounds");
  outer: for (let i = 0; i < map.ROAD.length; i += 2)
    for (let j = i + 2; j < map.ROAD.length; j += 2) {
      const a = map.ROAD[i],
        b = map.ROAD[j];
      if (b.distance - a.distance > 6 && Math.hypot(a.x - b.x, a.z - b.z) < 3) {
        issues.push("road-clearance");
        break outer;
      }
    }
  for (let i = 1; i < map.ROAD.length - 1; i++) {
    const a = map.ROAD[i - 1],
      b = map.ROAD[i],
      c = map.ROAD[i + 1];
    const u = Math.atan2(b.x - a.x, b.z - a.z),
      v = Math.atan2(c.x - b.x, c.z - b.z);
    if (Math.abs(Math.atan2(Math.sin(v - u), Math.cos(v - u))) > 0.4) {
      issues.push("sharp-bend");
      break;
    }
  }
  if (map.SITES.length !== 10) issues.push("site-count");
  map.SITES.forEach((s, i) => {
    if (map.nearestRoad(s.x, s.z).distance < 3)
      issues.push(`site-${s.id}-clearance`);
    const length = coverage(map.ROAD, s);
    if (length < 5 || length > 24) issues.push(`site-${s.id}-coverage`);
    if (Math.hypot(s.x, s.z) > 26) issues.push(`site-${s.id}-bounds`);
    if (Math.hypot(s.x - map.goal.x, s.z - map.goal.z) < 4.5)
      issues.push(`site-${s.id}-goal`);
    if (
      map.SITES.some(
        (other, j) => j > i && Math.hypot(s.x - other.x, s.z - other.z) < 4,
      )
    )
      issues.push(`site-${s.id}-overlap`);
  });
  return issues;
}
export function createBattlefield(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295)
    throw new Error("A battlefield needs a valid unsigned seed.");
  let rng = seed >>> 0;
  const random = () => {
    let t = (rng += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let attempt = 0; attempt < 256; attempt++) {
    const family = Math.floor(random() * ROUTES.length);
    const angle = random() * Math.PI * 2,
      mirror = random() < 0.5 ? -1 : 1;
    let points = ROUTES[family].map(([x, z]) => [
      x + (random() - 0.5) * 2,
      z + (random() - 0.5) * 2,
    ]);
    const scale =
      DEFAULT_BATTLEFIELD.ROAD_LENGTH / sampleRoad(points).ROAD_LENGTH;
    points = points.map(([x, z]) => [
      scale * (x * mirror * Math.cos(angle) - z * Math.sin(angle)),
      scale * (x * mirror * Math.sin(angle) + z * Math.cos(angle)),
    ]);
    const road = sampleRoad(points),
      end = road.onRoad(road.ROAD_LENGTH);
    const goal = {
      x: end.x + Math.sin(end.angle) * 3,
      z: end.z + Math.cos(end.angle) * 3,
    };
    const sites = [];
    // Distribute sites across the route, then choose clear ground on either bank.
    for (let slot = 0; slot < 10; slot++) {
      for (let trial = 0; trial < 120; trial++) {
        const progress =
          road.ROAD_LENGTH * (0.04 + (slot + random() * 0.9) * 0.09);
        const p = road.onRoad(progress),
          offset = (3.1 + random() * 1.6) * (random() < 0.5 ? -1 : 1);
        const site = {
          id: String.fromCharCode(65 + slot),
          x: p.x + Math.cos(p.angle) * offset,
          z: p.z - Math.sin(p.angle) * offset,
        };
        if (
          road.nearestRoad(site.x, site.z).distance < 3 ||
          Math.hypot(site.x, site.z) > 26 ||
          Math.hypot(site.x - goal.x, site.z - goal.z) < 4.5 ||
          sites.some((s) => Math.hypot(s.x - site.x, s.z - site.z) < 4)
        )
          continue;
        const length = coverage(road.ROAD, site);
        if (length < 5 || length > 24) continue;
        sites.push(site);
        break;
      }
    }
    const result = { ...road, SITES: sites, seed, goal, family };
    if (!inspectBattlefield(result).length) return result;
  }
  throw new Error("Unable to generate a playable battlefield.");
}

// Used by the shuffle control to avoid another visually similar arrangement.
export function layoutDifference(a, b) {
  const road =
    a.ROAD.reduce((sum, p) => sum + b.nearestRoad(p.x, p.z).distance, 0) /
    a.ROAD.length;
  const sites =
    a.SITES.reduce(
      (sum, p) =>
        sum + Math.min(...b.SITES.map((s) => Math.hypot(s.x - p.x, s.z - p.z))),
      0,
    ) / a.SITES.length;
  return { road, sites };
}
export function shuffleBattlefield(current, randomSeed) {
  for (let i = 0; i < 100; i++) {
    const next = createBattlefield(randomSeed());
    const difference = layoutDifference(current, next);
    if (difference.road >= 3 && difference.sites >= 3.5) return next;
  }
  throw new Error("Unable to find a distinct route. Try shuffling again.");
}
