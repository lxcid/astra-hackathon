import * as THREE from "three";
import { terrainHeight } from "./world.mjs";
import { DEFAULT_BATTLEFIELD } from "./battlefield.mjs";
export function createScenery(scene, theme, battlefield = DEFAULT_BATTLEFIELD) {
  const { nearestRoad, SITES, goal } = battlefield;
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);
  const lanterns = [],
    foliage = [],
    waterMaterials = [];
  let randSeed = theme?.seed ?? 5102;
  function random() {
    randSeed = (Math.imul(randSeed, 1664525) + 1013904223) >>> 0;
    return randSeed / 4294967296;
  }
  function mat(color, extra = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.87,
      flatShading: true,
      ...extra,
    });
  }
  const palette = {
    bark: mat(0x635547),
    barkDark: mat(0x423e36),
    barkLight: mat(0x8d7754),
    wood: mat(0x8d6c47),
    trim: mat(0xd4b787),
    roof: mat(0x487c72),
    roofDark: mat(0x304e4c),
    stone: mat(0x71817a),
    stoneDark: mat(0x344b4c),
    leaf: mat(0x819451),
    leafDark: mat(0x355e48),
    leafGold: mat(0xabb56a),
    moss: mat(0x547654),
    glow: mat(0xffde89, { emissive: 0xffc864, emissiveIntensity: 2.2 }),
    heart: mat(0xd9ecc2, { emissive: 0xb7eeb3, emissiveIntensity: 1.8 }),
    mushroom: mat(0xe9af78, { emissive: 0xdb9454, emissiveIntensity: 0.16 }),
    metal: mat(0x2f524f, { metalness: 0.5 }),
    blight: mat(0x282c35),
    blightGlow: mat(0xff8866, { emissive: 0xff603f, emissiveIntensity: 2.4 }),
  };
  if (theme) {
    const p = theme.palette;
    for (const [key, color] of Object.entries({
      bark: p.body,
      barkDark: p.body,
      barkLight: p.trim,
      wood: p.body,
      trim: p.trim,
      leaf: p.foliage,
      leafDark: p.foliage,
      leafGold: p.glow,
      moss: p.ground,
      roof: p.foliage,
      roofDark: p.body,
    }))
      palette[key].color.set(color);
  }
  function mesh(geometry, material, parent = worldGroup, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(parent, x, y, z, w, h, d, material) {
    return mesh(new THREE.BoxGeometry(w, h, d), material, parent, x, y, z);
  }
  function cylinder(parent, x, y, z, top, bottom, height, material, sides = 8) {
    return mesh(
      new THREE.CylinderGeometry(top, bottom, height, sides),
      material,
      parent,
      x,
      y,
      z,
    );
  }
  function sphere(parent, x, y, z, r, material, detail = 1) {
    return mesh(
      new THREE.IcosahedronGeometry(r, detail),
      material,
      parent,
      x,
      y,
      z,
    );
  }
  function beam(parent, a, b, radius, material, endRadius = radius) {
    const from = new THREE.Vector3(...a),
      to = new THREE.Vector3(...b),
      delta = to.clone().sub(from);
    const m = mesh(
      new THREE.CylinderGeometry(endRadius, radius, delta.length(), 7),
      material,
      parent,
    );
    m.position.copy(from.add(to).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    return m;
  }
  function branch(points, radii, material = palette.bark, parent = worldGroup) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const n = 18;
    const ring = 9;
    const positions = [],
      indices = [],
      frames = curve.computeFrenetFrames(n, false);
    for (let i = 0; i <= n; i++) {
      const p = curve.getPointAt(i / n);
      const f = (i / n) * (radii.length - 1);
      const ix = Math.floor(f);
      const r = THREE.MathUtils.lerp(
        radii[ix],
        radii[Math.min(ix + 1, radii.length - 1)],
        f - ix,
      );
      for (let j = 0; j < ring; j++) {
        const angle = (j / ring) * Math.PI * 2;
        const ripple = 1 + Math.sin(j * 3 + i * 0.8) * 0.1;
        const v = p
          .clone()
          .addScaledVector(frames.normals[i], Math.cos(angle) * r * ripple)
          .addScaledVector(frames.binormals[i], Math.sin(angle) * r * ripple);
        positions.push(v.x, v.y, v.z);
      }
    }
    for (let i = 0; i < n; i++)
      for (let j = 0; j < ring; j++) {
        const a = i * ring + j,
          b = i * ring + ((j + 1) % ring),
          c = a + ring,
          d = b + ring;
        indices.push(a, b, c, b, d, c);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return mesh(g, material, parent);
  }
  function makeTerrain() {
    const ground = new THREE.PlaneGeometry(2000, 2000);
    ground.rotateX(-Math.PI / 2);
    const pos = ground.attributes.position;
    const colors = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i);
      pos.setY(i, terrainHeight(x, z));
      const c = new THREE.Color().lerpColors(
        new THREE.Color(0x3f6959),
        new THREE.Color(0x81916a),
        random(),
      );
      colors.push(c.r, c.g, c.b);
    }
    ground.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    ground.computeVertexNormals();
    const land = mesh(
      ground,
      new THREE.MeshStandardMaterial({
        color: theme?.palette.ground || 0x6d8b62,
        roughness: 1,
      }),
    );
    land.name = "terrain";
    land.castShadow = false;
    // Grass is instanced to keep the detailed grove inexpensive to render.
    const grass = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.16, 0.65, 3),
      palette.moss,
      1700,
    );
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    let count = 0;
    for (let i = 0; i < 2200 && count < 1700; i++) {
      const x = (random() - 0.5) * 46,
        z = (random() - 0.5) * 46;
      if (
        nearestRoad(x, z).distance < 1.7 ||
        SITES.some((s) => Math.hypot(s.x - x, s.z - z) < 2.2) ||
        Math.hypot(x, z) > 22 ||
        Math.abs(x - 11.5 - Math.sin(z * 0.16) * 1.5) < 2 ||
        Math.hypot(x, z + 2) < 4
      )
        continue;
      quaternion.setFromEuler(
        new THREE.Euler(0, random() * 6.28, (random() - 0.5) * 0.3),
      );
      const s = 0.6 + random();
      matrix.compose(
        new THREE.Vector3(x, terrainHeight(x, z) + s * 0.25, z),
        quaternion,
        new THREE.Vector3(s, s, s),
      );
      grass.setMatrixAt(count, matrix);
      grass.setColorAt(
        count++,
        new THREE.Color().lerpColors(
          new THREE.Color(0x3f6d58),
          new THREE.Color(0xa2ab69),
          random(),
        ),
      );
    }
    grass.count = count;
    grass.receiveShadow = true;
    worldGroup.add(grass);
    for (let i = 0; i < 26; i++) {
      const x = (random() - 0.5) * 38,
        z = (random() - 0.5) * 38;
      if (
        Math.hypot(x, z) > 20 ||
        nearestRoad(x, z).distance < 2.5 ||
        SITES.some((s) => Math.hypot(s.x - x, s.z - z) < 3) ||
        Math.hypot(x - goal.x, z - goal.z) < 5
      )
        continue;
      sphere(
        worldGroup,
        x,
        0.5,
        z,
        0.35 + random() * 0.65,
        palette.stone,
        0,
      ).scale.set(1.2, 0.65, 1);
    }
    // Pale forest silhouettes make the grove a place in a much larger world.
    for (let i = 0; i < 45; i++) {
      const a = random() * 6.28,
        r = 26 + random() * 3,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      if (
        z > 10 ||
        nearestRoad(x, z).distance < 3 ||
        SITES.some((s) => Math.hypot(s.x - x, s.z - z) < 3) ||
        Math.hypot(x - goal.x, z - goal.z) < 6
      )
        continue;
      const g = new THREE.Group();
      g.position.set(x, terrainHeight(x, z), z);
      g.name = "distant-scenery";
      worldGroup.add(g);
      const h = 4 + random() * 5;
      cylinder(g, 0, h / 2, 0, 0.25, 0.7, h, palette.stoneDark, 5);
      for (let j = 0; j < 3; j++) {
        const crown = mesh(
          new THREE.ConeGeometry(4 - j * 0.7, h * 0.65, 6),
          mat(0x2b5150),
          g,
          0,
          h * 0.5 + j * 2.6,
          0,
        );
        crown.castShadow = false;
      }
    }
  }
  function lantern(parent, x, y, z, scale = 1) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(scale);
    parent.add(g);
    cylinder(g, 0, 0, 0, 0.19, 0.23, 0.35, palette.glow, 6);
    cylinder(g, 0, 0.23, 0, 0, 0.32, 0.21, palette.metal, 6);
    cylinder(g, 0, -0.21, 0, 0.24, 0.19, 0.1, palette.metal, 6);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      cylinder(
        g,
        Math.cos(a) * 0.21,
        0,
        Math.sin(a) * 0.21,
        0.025,
        0.025,
        0.45,
        palette.metal,
        4,
      );
    }
    lanterns.push(g);
    return g;
  }
  function house(parent, x, y, z, scale = 1, rotation = 0) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotation;
    g.scale.setScalar(scale);
    parent.add(g);
    cylinder(g, 0, -0.18, 0, 1.75, 1.7, 0.28, palette.wood, 10);
    box(g, 0, 0.85, 0, 2.1, 1.7, 1.75, palette.wood);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        box(g, sx * 1.01, 0.9, sz * 0.86, 0.13, 1.95, 0.13, palette.trim);
    const roof = mesh(
      new THREE.ConeGeometry(1.85, 1.4, 4),
      palette.roof,
      g,
      0,
      2.22,
      0,
    );
    roof.rotation.y = Math.PI / 4;
    const roof2 = mesh(
      new THREE.ConeGeometry(1.94, 0.15, 4),
      palette.roofDark,
      g,
      0,
      1.6,
      0,
    );
    roof2.rotation.y = Math.PI / 4;
    box(g, 0, 0.95, 0.889, 0.59, 0.69, 0.04, palette.glow);
    box(g, 0, 0.95, 0.93, 0.055, 0.73, 0.055, palette.trim);
    box(g, 0, 0.95, 0.94, 0.62, 0.05, 0.05, palette.trim);
    box(g, 1.06, 0.95, 0, 0.04, 0.6, 0.55, palette.glow);
    box(g, -0.7, 0.45, 0.9, 0.35, 0.9, 0.09, palette.barkDark);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.28;
      cylinder(
        g,
        Math.cos(a) * 1.55,
        0.35,
        Math.sin(a) * 1.55,
        0.05,
        0.05,
        0.7,
        palette.trim,
        5,
      );
    }
    lantern(g, 1.37, 0.95, 0.95, 0.65);
    return g;
  }
  function bridge(parent, a, b, count = 20) {
    const left = [],
      right = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count,
        x = THREE.MathUtils.lerp(a[0], b[0], t),
        z = THREE.MathUtils.lerp(a[2], b[2], t),
        y = THREE.MathUtils.lerp(a[1], b[1], t) - Math.sin(t * Math.PI) * 0.85;
      const plank = box(parent, x, y, z, 0.48, 0.12, 1.1, palette.wood);
      plank.rotation.y = -Math.atan2(b[2] - a[2], b[0] - a[0]);
      left.push(new THREE.Vector3(x, y + 0.75, z - 0.52));
      right.push(new THREE.Vector3(x, y + 0.75, z + 0.52));
      if (i % 3 === 0) {
        beam(
          parent,
          [x, y, z - 0.52],
          [x, y + 0.85, z - 0.52],
          0.035,
          palette.trim,
        );
        beam(
          parent,
          [x, y, z + 0.52],
          [x, y + 0.85, z + 0.52],
          0.035,
          palette.trim,
        );
      }
    }
    for (const pts of [left, right])
      mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(pts),
          count * 2,
          0.034,
          4,
          false,
        ),
        palette.trim,
        parent,
      );
  }
  function makeTree() {
    branch(
      [
        [0, 0.2, -2],
        [-0.8, 4, -2.3],
        [0.3, 9, -3],
        [-0.6, 14, -3.4],
        [1, 19, -5],
        [0, 23, -6],
      ],
      [3.2, 2.5, 2, 1.4, 0.6, 0.12],
    );
    // Twisting buttress roots carry the silhouette all the way into the terrain.
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2,
        r = 9 + random() * 5;
      branch(
        [
          [Math.cos(a) * 1.1, 6, -2 + Math.sin(a)],
          [Math.cos(a) * 3.2, 1.7, -2 + Math.sin(a) * 3.2],
          [
            Math.cos(a + 0.12) * r * 0.65,
            0.6,
            -2 + Math.sin(a + 0.12) * r * 0.65,
          ],
          [Math.cos(a + 0.2) * r, 0.18, -2 + Math.sin(a + 0.2) * r],
        ],
        [1, 0.8, 0.4, 0.06],
        i % 2 ? palette.bark : palette.barkDark,
      );
    }
    const limbs = [
      [
        [0, 7, -2],
        [-3, 9, -3],
        [-7, 10, -4],
        [-11, 14, -5],
      ],
      [
        [0, 11, -3],
        [3, 12, -3],
        [7, 15, -4],
        [11, 18, -6],
      ],
      [
        [0, 14, -4],
        [-3, 17, -6],
        [-7, 21, -7],
      ],
      [
        [0, 17, -5],
        [4, 21, -7],
        [7, 24, -7],
      ],
      [
        [0, 12, -3],
        [2, 15, -8],
        [0, 22, -11],
      ],
    ];
    limbs.forEach((points) => branch(points, [1.2, 0.9, 0.55, 0.1]));
    for (const limb of limbs) {
      const end = limb.at(-1);
      for (let j = 0; j < 4; j++) {
        const x = end[0] + (random() - 0.5) * 6,
          y = end[1] + random() * 2,
          z = end[2] + (random() - 0.5) * 4;
        const leaf = sphere(
          worldGroup,
          x,
          y,
          z,
          2.8 + random() * 1.8,
          j === 0 ? palette.leafGold : j % 2 ? palette.leafDark : palette.leaf,
          1,
        );
        leaf.scale.set(1.2, 0.65 + random() * 0.22, 1);
        foliage.push({ mesh: leaf, y, phase: random() * 6 });
      }
    }
    for (let j = 0; j < 7; j++) {
      const leaf = sphere(
        worldGroup,
        (random() - 0.5) * 8,
        24 + random() * 2,
        -6 + (random() - 0.5) * 5,
        3 + random() * 2,
        j % 2 ? palette.leafGold : palette.leaf,
        1,
      );
      leaf.scale.y = 0.7;
      foliage.push({ mesh: leaf, y: leaf.position.y, phase: random() * 6 });
    }
    house(worldGroup, -5.9, 9.5, -2.8, 1.1, -0.12);
    house(worldGroup, 5.1, 12.9, -3.4, 1, 0.12);
    house(worldGroup, -1.4, 16.4, -4.5, 0.7, 0.1);
    bridge(worldGroup, [-4.9, 9.5, -1.4], [4.9, 12.9, -2.1], 24);
    // Spiral steps are geometry, not a painted facade.
    for (let i = 0; i < 47; i++) {
      const a = i * 0.12 - 1,
        r = 3.2 - (i / 47) * 0.7;
      const step = box(
        worldGroup,
        Math.cos(a) * r,
        0.4 + i * 0.2,
        -2 + Math.sin(a) * r,
        0.72,
        0.14,
        0.7,
        palette.wood,
      );
      step.rotation.y = -a;
      if (i % 4 === 0) {
        const x = Math.cos(a) * (r + 0.32),
          z = -2 + Math.sin(a) * (r + 0.32);
        cylinder(
          worldGroup,
          x,
          0.85 + i * 0.2,
          z,
          0.04,
          0.04,
          0.85,
          palette.trim,
          4,
        );
      }
    }
    const heart = sphere(worldGroup, 0, 3.1, 0.65, 0.9, palette.heart, 1);
    heart.scale.set(0.62, 1.6, 0.3);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.2;
      sphere(
        worldGroup,
        Math.sin(a) * 0.6,
        2 + i * 0.58,
        0.85,
        0.1,
        palette.heart,
        0,
      );
    }
    // The tap is connected to the actual living trunk.
    beam(worldGroup, [2.3, 2.3, -0.3], [3.7, 2.3, -0.3], 0.13, palette.metal);
    beam(worldGroup, [3.7, 2.3, -0.3], [3.7, 1.3, -0.3], 0.13, palette.metal);
    cylinder(worldGroup, 3.7, 0.6, -0.3, 0.65, 0.5, 1.1, palette.wood, 10);
    cylinder(worldGroup, 3.7, 1.15, -0.3, 0.51, 0.51, 0.04, palette.glow, 12);
    lantern(worldGroup, 3.1, 3, -0.2, 0.9);
    // Little gold lights along the path lead the eye back to the heartwood.
    for (const [x, z] of [
      [-9, 1],
      [-4, 7],
      [4, 7],
      [7, -5],
      [-11, -7],
    ]) {
      beam(worldGroup, [x, 0.3, z], [x, 1.8, z], 0.07, palette.wood);
      lantern(worldGroup, x, 1.7, z, 0.7);
    }
    bridge(worldGroup, [-24, 0.5, -8], [-14, 0.5, -8], 24);
  }
  function makeWard() {
    const g = new THREE.Group();
    cylinder(g, 0, 0.2, 0, 0.65, 1, 0.45, palette.stone, 6);
    cylinder(g, 0, 1.3, 0, 0.2, 0.35, 2.5, palette.wood, 7);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * 6.28;
      beam(
        g,
        [Math.cos(a) * 0.8, 0.1, Math.sin(a) * 0.8],
        [0, 1.8, 0],
        0.1,
        palette.barkLight,
      );
    }
    cylinder(g, 0, 2.55, 0, 0.55, 0.22, 0.35, palette.trim, 6);
    const light = sphere(g, 0, 3.05, 0, 0.47, palette.heart, 1);
    light.scale.set(0.8, 1.4, 0.8);
    g.userData.crystal = light;
    const hoop = mesh(
      new THREE.TorusGeometry(0.8, 0.04, 5, 24),
      palette.trim,
      g,
      0,
      3,
      0,
    );
    hoop.rotation.x = Math.PI / 2.8;
    return g;
  }
  function makeSettler(index) {
    const g = new THREE.Group();
    const coatColors = [
      0xdca969, 0x93aba0, 0x96a965, 0xb57558, 0xc4b895, 0x67999b,
    ];
    const coat = mat(coatColors[index % coatColors.length]);
    const body = cylinder(g, 0, 0.53, 0, 0.18, 0.29, 0.58, coat, 6);
    const head = sphere(g, 0, 0.96, 0, 0.2, palette.trim, 1);
    const hat = mesh(
      new THREE.ConeGeometry(0.28, 0.24, 6),
      coat,
      g,
      0,
      1.14,
      0,
    );
    const left = box(g, -0.12, 0.17, 0, 0.11, 0.35, 0.15, palette.barkDark),
      right = box(g, 0.12, 0.17, 0, 0.11, 0.35, 0.15, palette.barkDark);
    const arm = box(g, 0.25, 0.53, 0.05, 0.1, 0.42, 0.13, coat);
    arm.rotation.z = -0.2;
    const pack = box(g, 0, 0.55, -0.2, 0.34, 0.34, 0.18, palette.wood);
    g.userData = { left, right, body, head, hat, arm, pack };
    return g;
  }
  function makeEnemy() {
    const g = new THREE.Group();
    const body = sphere(g, 0, 0.7, 0, 0.64, palette.blight, 0);
    body.scale.set(0.9, 0.8, 1.3);
    const core = sphere(g, 0, 0.8, 0.25, 0.28, palette.blightGlow, 0);
    const legs = [];
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1;
      const z = -0.45 + Math.floor(i / 2) * 0.42;
      const leg = new THREE.Group();
      leg.position.set(side * 0.3, 0.65, z);
      g.add(leg);
      beam(leg, [0, 0, 0], [side * 0.55, -0.13, 0.1], 0.09, palette.blight);
      beam(
        leg,
        [side * 0.55, -0.13, 0.1],
        [side * 0.75, -0.65, 0.28],
        0.07,
        palette.blight,
      );
      legs.push(leg);
    }
    for (let i = 0; i < 3; i++) {
      const thorn = mesh(
        new THREE.ConeGeometry(0.16, 0.95, 4),
        palette.blight,
        g,
        (i - 1) * 0.28,
        1.18,
        -0.2,
      );
      thorn.rotation.z = (i - 1) * -0.35;
    }
    g.userData = { body, core, legs };
    return g;
  }
  function makeAtmosphere() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.18, "rgba(255,255,255,.45)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(c);
    const geo = new THREE.BufferGeometry();
    const points = [];
    for (let i = 0; i < 160; i++)
      points.push(
        (random() - 0.5) * 46,
        1 + random() * 24,
        (random() - 0.5) * 42,
      );
    geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    const particles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xe1d8a1,
        size: 0.18,
        map: texture,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    worldGroup.add(particles);
    worldGroup.userData.motes = particles;
    for (let i = 0; i < 13; i++) {
      const fog = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          color: 0x87adb0,
          opacity: 0.15,
          transparent: true,
          depthWrite: false,
        }),
      );
      fog.position.set(
        (random() - 0.5) * 70,
        -7 - random() * 7,
        (random() - 0.5) * 65,
      );
      fog.scale.set(24 + random() * 20, 9 + random() * 7, 1);
      scene.add(fog);
    }
    const sunGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        color: 0xffdb9d,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sunGlow.position.set(-33, 29, -43);
    sunGlow.scale.set(40, 40, 1);
    scene.add(sunGlow);
    sphere(
      scene,
      -33,
      29,
      -44,
      3.3,
      new THREE.MeshBasicMaterial({ color: 0xf1d7a0 }),
      2,
    );
  }

  makeTerrain();
  const before = new Set(worldGroup.children);
  makeTree();
  const treeGroup = new THREE.Group();
  for (const child of [...worldGroup.children])
    if (!before.has(child)) treeGroup.add(child);
  treeGroup.position.set(goal.x, terrainHeight(), goal.z);
  treeGroup.name = "goal";
  treeGroup.scale.set(0.52, 0.48 + (theme?.geometry.crown ?? 1) * 0.04, 0.52);
  worldGroup.add(treeGroup);
  makeAtmosphere();
  return {
    worldGroup,
    palette,
    mesh,
    box,
    cylinder,
    sphere,
    beam,
    house,
    makeWard,
    makeSettler,
    makeEnemy,
    foliage,
    waterMaterials,
  };
}
