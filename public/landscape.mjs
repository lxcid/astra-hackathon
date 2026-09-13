import * as THREE from "three";
import { seededRandom } from "./theme.mjs";

// Keep every playable route and build site inside a flat valley floor.
export function mountainProfile(seed) {
  const random = seededRandom(seed ^ 0x7f4a7c15);
  const phases = Array.from({ length: 4 }, () => random() * Math.PI * 2);
  function height(x, z) {
    const angle = Math.atan2(z, x),
      radius = Math.hypot(x, z);
    const edge = 31 + 1.5 * Math.sin(angle * 5 + phases[0]);
    if (radius <= edge || radius >= 94) return 0.12;
    const crest = 45 + 3 * Math.sin(angle * 3 + phases[1]);
    const rise = Math.min(1, (radius - edge) / (crest - edge));
    const fall = Math.max(0, (94 - radius) / (94 - crest));
    // Lower foreground foothills keep the whole clearing visible from the default camera.
    const backdrop = (1 - Math.sin(angle)) / 2;
    const peak =
      6 +
      backdrop * 17 +
      3 * Math.sin(angle * 9 + phases[2]) +
      2 * Math.sin(angle * 17 + phases[3]);
    return 0.12 + Math.max(2, peak) * Math.pow(rise, 1.3) * Math.pow(fall, 1.1);
  }
  return { height };
}

export function createMountains(parent, theme) {
  const { height } = mountainProfile(theme.seed);
  const segments = 144;
  const radii = [29, 32, 35, 39, 43, 47, 52, 60, 72, 84, 94];
  const positions = [],
    colors = [],
    indices = [];
  const ground = new THREE.Color(theme.palette.ground);
  const rock = new THREE.Color(theme.palette.body).lerp(
    new THREE.Color(theme.palette.road),
    0.35,
  );
  const summit = new THREE.Color(theme.palette.trim).lerp(
    new THREE.Color(theme.palette.sky),
    0.6,
  );
  for (let ring = 0; ring < radii.length; ring++) {
    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * Math.PI * 2;
      const radius = radii[ring];
      const x = Math.cos(angle) * radius,
        z = Math.sin(angle) * radius,
        y = height(x, z);
      positions.push(x, y, z);
      const c = ground.clone().lerp(rock, Math.min(1, (y - 0.12) / 7));
      c.lerp(summit, Math.max(0, (y - 12) / 22));
      colors.push(c.r, c.g, c.b);
      if (ring < radii.length - 1 && j < segments) {
        const a = ring * (segments + 1) + j,
          b = a + segments + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  // Omit flat triangles where the existing valley floor already supplies ground.
  const slopes = [];
  for (let i = 0; i < indices.length; i += 3) {
    const face = indices.slice(i, i + 3);
    if (face.some((index) => positions[index * 3 + 1] > 0.12001))
      slopes.push(...face);
  }
  geometry.setIndex(slopes);
  geometry.computeVertexNormals();
  const mountains = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 1,
    }),
  );
  mountains.name = "mountain-ring";
  mountains.receiveShadow = true;
  parent.add(mountains);
  return mountains;
}
