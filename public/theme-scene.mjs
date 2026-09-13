import { createMountains } from "./landscape.mjs";
import * as THREE from "three";
import { createScenery } from "./scenery.mjs";
import { terrainHeight } from "./world.mjs";
import { DEFAULT_BATTLEFIELD } from "./battlefield.mjs";
import { seededRandom } from "./theme.mjs";

// Geometry lives entirely in the renderer; no mesh is a simulation collider.
export function createThemeScenery(
  scene,
  theme,
  battlefield = DEFAULT_BATTLEFIELD,
) {
  const { nearestRoad, SITES, goal: goalPoint } = battlefield;
  const random = seededRandom(theme.seed),
    p = theme.palette,
    shape = theme.geometry;
  const woodland = theme.motif === "tree" && !theme.models;
  const original = woodland ? createScenery(scene, theme, battlefield) : null;
  const worldGroup = original?.worldGroup || new THREE.Group();
  if (!original) scene.add(worldGroup);
  createMountains(worldGroup, theme);
  function mat(color, glow = false) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: theme.motif === "city" ? 0.5 : 0.86,
      flatShading: true,
      ...(glow ? { emissive: color, emissiveIntensity: 0.8 } : {}),
    });
  }
  const palette = {
    wood: mat(p.body),
    bark: mat(p.body),
    barkDark: mat(p.enemy),
    barkLight: mat(p.trim),
    trim: mat(p.trim),
    stone: mat(p.road),
    stoneDark: mat(p.body),
    metal: mat(p.body),
    leaf: mat(p.foliage),
    leafDark: mat(p.foliage),
    moss: mat(p.ground),
    heart: mat(p.glow, true),
    glow: mat(p.glow, true),
    blight: mat(p.enemy),
    blightGlow: mat(p.danger, true),
  };
  function mesh(geometry, material, parent = worldGroup, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  const box = (parent, x, y, z, w, h, d, material) =>
    mesh(new THREE.BoxGeometry(w, h, d), material, parent, x, y, z);
  const cylinder = (
    parent,
    x,
    y,
    z,
    top,
    bottom,
    height,
    material,
    sides = shape.sides,
  ) =>
    mesh(
      new THREE.CylinderGeometry(top, bottom, height, sides),
      material,
      parent,
      x,
      y,
      z,
    );
  const sphere = (parent, x, y, z, r, material, detail = 0) =>
    mesh(new THREE.IcosahedronGeometry(r, detail), material, parent, x, y, z);
  function beam(parent, a, b, radius, material) {
    const from = new THREE.Vector3(...a),
      to = new THREE.Vector3(...b),
      delta = to.clone().sub(from);
    const object = cylinder(
      parent,
      0,
      0,
      0,
      radius,
      radius,
      delta.length(),
      material,
      6,
    );
    object.position.copy(from.add(to).multiplyScalar(0.5));
    object.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    return object;
  }
  const foliage = original?.foliage || [],
    waterMaterials = original?.waterMaterials || [];
  const recipeMaterials = Object.fromEntries(
    Object.entries(p).map(([key, color]) => [
      key,
      mat(color, key === "glow" || key === "danger"),
    ]),
  );
  function buildRecipe(parts, maxWidth = 2.7, maxHeight = 3.7) {
    const group = new THREE.Group();
    for (const part of parts) {
      const geo =
        part.shape === "box"
          ? new THREE.BoxGeometry(1, 1, 1)
          : part.shape === "sphere"
            ? new THREE.IcosahedronGeometry(0.5, 1)
            : part.shape === "cone"
              ? new THREE.ConeGeometry(0.5, 1, shape.sides)
              : part.shape === "cylinder"
                ? new THREE.CylinderGeometry(0.5, 0.5, 1, shape.sides)
                : new THREE.TorusGeometry(0.4, 0.1, 6, shape.sides * 3);
      const object = mesh(geo, recipeMaterials[part.material], group);
      object.position.fromArray(part.position);
      object.scale.fromArray(part.scale);
      object.rotation.set(...part.rotation);
    }
    // Normalize generated art to a readable envelope, independent of combat range.
    const bounds = new THREE.Box3().setFromObject(group),
      size = bounds.getSize(new THREE.Vector3()),
      center = bounds.getCenter(new THREE.Vector3());
    const scale = Math.min(
      maxWidth / Math.max(size.x, size.z, 0.01),
      maxHeight / Math.max(size.y, 0.01),
    );
    for (const child of group.children) {
      child.position
        .sub(new THREE.Vector3(center.x, bounds.min.y, center.z))
        .multiplyScalar(scale);
      child.scale.multiplyScalar(scale);
    }
    return group;
  }
  function prop(parent, height = 4) {
    if (theme.models) {
      const model = buildRecipe(theme.models.scenery, 2.5, height);
      parent.add(model);
      return model;
    }
    const group = new THREE.Group();
    parent.add(group);
    const { motif } = theme;
    if (motif === "city") {
      box(group, 0, height / 2, 0, 1.4, height, 1.3, palette.wood);
      for (let j = 1; j <= shape.tiers; j++) {
        box(
          group,
          0,
          (height * j) / (shape.tiers + 1),
          0.67,
          1.12,
          0.14,
          0.04,
          palette.glow,
        );
        box(
          group,
          0.72,
          (height * j) / (shape.tiers + 1),
          0,
          0.04,
          0.14,
          1.1,
          palette.glow,
        );
      }
      cylinder(group, 0, height + 0.4, 0, 0.035, 0.035, 0.8, palette.trim);
    } else if (motif === "candy") {
      cylinder(
        group,
        0,
        height * 0.4,
        0,
        0.12,
        0.15,
        height * 0.8,
        palette.trim,
      );
      sphere(
        group,
        0,
        height * 0.8,
        0,
        height * 0.3,
        palette.leaf,
        1,
      ).scale.set(1, shape.crown, 1);
      const hoop = mesh(
        new THREE.TorusGeometry(height * 0.23, 0.13, 6, 16),
        palette.trim,
        group,
        0,
        height * 0.8,
        0,
      );
      hoop.rotation.y = shape.twist;
    } else if (motif === "coral") {
      for (let j = 0; j < shape.tiers + 1; j++) {
        const a = j * 2.4 + shape.twist;
        const top = [
          Math.cos(a) * 0.9,
          height * (0.5 + j * 0.12),
          Math.sin(a) * 0.9,
        ];
        beam(group, [0, 0, 0], top, 0.2, palette.leaf);
        sphere(group, ...top, 0.35, palette.heart, 1);
      }
    } else if (motif === "desert") {
      cylinder(
        group,
        0,
        height / 2,
        0,
        0.14,
        0.85,
        height,
        palette.stone,
        4,
      ).rotation.y = shape.twist;
      cylinder(group, 0, 0.15, 0, 1.05, 1.2, 0.3, palette.trim, 4);
      sphere(group, 0, height, 0, 0.22, palette.heart);
    } else if (motif === "tree") {
      cylinder(
        group,
        0,
        height * 0.35,
        0,
        0.15,
        0.35,
        height * 0.7,
        palette.wood,
      );
      for (let j = 0; j < shape.tiers; j++) {
        sphere(
          group,
          Math.sin(j * 2) * 0.35,
          height * 0.55 + j * 0.55,
          0,
          1.2 * shape.crown - j * 0.12,
          palette.leaf,
          1,
        );
      }
    } else {
      for (let j = 0; j < 3; j++) {
        const shard = sphere(
          group,
          (j - 1) * 0.6,
          height * (j === 1 ? 0.5 : 0.3),
          0,
          1,
          palette.leaf,
        );
        shard.scale.set(0.6, height * (j === 1 ? 0.62 : 0.4), 0.7);
        shard.rotation.z = (j - 1) * -0.22;
      }
      sphere(group, 0, height * 0.7, 0, 0.25, palette.heart);
    }
    return group;
  }
  if (!original) {
    const ground = new THREE.PlaneGeometry(2000, 2000);
    ground.rotateX(-Math.PI / 2);
    const positions = ground.attributes.position;
    for (let i = 0; i < positions.count; i++)
      positions.setY(i, terrainHeight(positions.getX(i), positions.getZ(i)));
    ground.computeVertexNormals();
    const land = mesh(ground, palette.moss);
    land.name = "terrain";
    land.castShadow = false;
    // Visual scatter respects the same road, goal, and build-site clearances.
    for (let i = 0, placed = 0; i < 800 && placed < shape.scatter; i++) {
      const x = (random() - 0.5) * 44,
        z = (random() - 0.5) * 44;
      if (
        Math.hypot(x, z) > 21 ||
        nearestRoad(x, z).distance < 3 ||
        SITES.some((s) => Math.hypot(s.x - x, s.z - z) < 3.3) ||
        Math.hypot(x - goalPoint.x, z - goalPoint.z) < 5
      )
        continue;
      const g = prop(worldGroup, 1.8 + random() * 3.4);
      g.position.set(x, terrainHeight(x, z), z);
      g.rotation.y = random() * 6.28;
      placed++;
    }
    // A fringe of scenery connects the clearing to the surrounding foothills.
    for (let i = 0; i < 20; i++) {
      const a = Math.PI + random() * Math.PI,
        r = 25 + random() * 4;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      if (
        nearestRoad(x, z).distance < 3 ||
        SITES.some((s) => Math.hypot(s.x - x, s.z - z) < 3.3) ||
        Math.hypot(x - goalPoint.x, z - goalPoint.z) < 5
      )
        continue;
      const g = prop(worldGroup, 3 + random() * 4);
      g.position.set(x, terrainHeight(), z);
      g.name = "distant-scenery";
    }
    const goal = new THREE.Group();
    worldGroup.add(goal);
    goal.position.set(goalPoint.x, terrainHeight(), goalPoint.z);
    goal.name = "goal";
    cylinder(goal, 0, 0.3, 0, 2.4, 2.7, 0.6, palette.stone, shape.sides);
    const monument = theme.models
      ? buildRecipe(theme.models.goal, 5, 9)
      : prop(goal, 8);
    if (theme.models) goal.add(monument);
    else monument.scale.set(1.5, 1, 1.5);
    const ring = mesh(
      new THREE.TorusGeometry(2.1, 0.065, 6, 48),
      palette.heart,
      goal,
      0,
      4,
      0,
    );
    ring.rotation.x = Math.PI / 2;
    const positionsArray = [];
    for (let i = 0; i < 100; i++)
      positionsArray.push(
        (random() - 0.5) * 46,
        1 + random() * 14,
        (random() - 0.5) * 44,
      );
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positionsArray, 3),
    );
    const motes = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: p.glow,
        size: 0.09,
        transparent: true,
        opacity: 0.6,
      }),
    );
    worldGroup.add(motes);
    worldGroup.userData.motes = motes;
  }
  function makeTower(role) {
    if (theme.models) return buildRecipe(theme.models[role]);
    const group = new THREE.Group(),
      accent = mat(theme.towers[role].color, true);
    cylinder(group, 0, 0.18, 0, 1.2, 1.4, 0.36, palette.stone, shape.sides);
    if (role === "bow") {
      if (theme.motif === "city")
        box(group, 0, 1.4, 0, 1.1, 2.5, 1.1, palette.wood);
      else
        for (const x of [-0.65, 0.65])
          for (const z of [-0.65, 0.65])
            cylinder(group, x, 1.35, z, 0.1, 0.17, 2.5, palette.wood);
      cylinder(group, 0, 2.55, 0, 1.15, 1.15, 0.24, palette.trim, shape.sides);
      cylinder(
        group,
        0,
        3.35,
        0,
        theme.motif === "city" ? 0.8 : 0,
        1.3,
        1,
        palette.leaf,
        shape.sides,
      );
      beam(group, [-0.55, 2.9, 0.7], [0.55, 2.9, 0.7], 0.09, accent);
      beam(group, [0, 2.9, 0], [0, 2.9, 1.25], 0.13, palette.trim);
    } else if (role === "stone") {
      cylinder(group, 0, 0.85, 0, 0.95, 1.1, 1.3, palette.wood, shape.sides);
      const barrel = cylinder(
        group,
        0,
        1.85,
        0.2,
        0.42,
        0.6,
        1.7,
        palette.stone,
        shape.sides,
      );
      barrel.rotation.x = 0.7;
      const muzzle = cylinder(
        group,
        0,
        2.47,
        0.72,
        0.43,
        0.43,
        0.16,
        accent,
        shape.sides,
      );
      muzzle.rotation.x = 0.7;
      for (const x of [-0.95, 0.95])
        sphere(group, x, 0.55, 0, 0.4, palette.trim);
    } else {
      cylinder(group, 0, 1.25, 0, 0.25, 0.7, 2.1, palette.wood, shape.sides);
      const crystal = sphere(
        group,
        0,
        2.65,
        0,
        0.6,
        accent,
        theme.unit === "blob" ? 1 : 0,
      );
      crystal.scale.set(0.8, role === "frost" ? 1.7 : 1, 0.8);
      group.userData.crystal = crystal;
      for (let i = 0; i < (role === "frost" ? 3 : 2); i++) {
        const ring = mesh(
          new THREE.TorusGeometry(0.65 + i * 0.2, 0.05, 5, shape.sides * 4),
          palette.trim,
          group,
          0,
          2.5,
          0,
        );
        ring.rotation.set(Math.PI / (2 + i), shape.twist + i, 0);
      }
    }
    // Theme-seeded fins change the silhouette without changing the footprint.
    for (let i = 0; i < shape.tiers; i++) {
      const a = (i / shape.tiers) * Math.PI * 2 + shape.twist;
      const fin = sphere(
        group,
        Math.cos(a) * 0.8,
        0.55,
        Math.sin(a) * 0.8,
        0.22,
        palette.leaf,
      );
      fin.scale.y = shape.crown * 2;
    }
    return group;
  }
  function makeEnemy(type = "crawler") {
    if (theme.models) {
      const group = buildRecipe(theme.models[type], 1.6, 1.5);
      const core = sphere(group, 0, 0.85, 0.45, 0.13, palette.blightGlow);
      group.userData = { legs: [], core };
      return group;
    }
    const group = new THREE.Group(),
      legs = [];
    const body =
      theme.unit === "robot"
        ? box(group, 0, 0.7, 0, 0.85, 0.8, 1.05, palette.blight)
        : sphere(
            group,
            0,
            0.7,
            0,
            0.64,
            palette.blight,
            theme.unit === "blob" ? 1 : 0,
          );
    body.scale.set(0.9, 0.8, 1.25);
    const core = sphere(group, 0, 0.9, 0.4, 0.23, palette.blightGlow);
    const count = theme.unit === "beetle" ? 6 : 2;
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? 1 : -1,
        leg = new THREE.Group();
      leg.position.set(
        side * 0.3,
        0.6,
        count === 6 ? -0.4 + Math.floor(i / 2) * 0.4 : 0,
      );
      group.add(leg);
      if (theme.unit === "beetle") {
        beam(leg, [0, 0, 0], [side * 0.5, -0.15, 0.1], 0.08, palette.blight);
        beam(
          leg,
          [side * 0.5, -0.15, 0.1],
          [side * 0.7, -0.6, 0.25],
          0.07,
          palette.blight,
        );
      } else box(leg, side * 0.16, -0.3, 0, 0.22, 0.6, 0.3, palette.blight);
      legs.push(leg);
    }
    if (theme.unit === "blob") {
      for (const x of [-0.3, 0.3])
        sphere(group, x, 1.12, 0.32, 0.13, palette.trim, 1);
    } else
      for (let i = 0; i < shape.tiers; i++) {
        const spike = cylinder(
          group,
          (i - (shape.tiers - 1) / 2) * 0.22,
          1.3,
          -0.1,
          0,
          0.13,
          0.6,
          palette.trim,
          4,
        );
        spike.rotation.z = (i - 1) * -0.2;
      }
    group.userData = { body, core, legs };
    return group;
  }
  function makeSettler() {
    if (theme.models) {
      const group = buildRecipe(theme.models.guardian, 0.7, 1.3),
        arm = new THREE.Group();
      group.add(arm);
      group.userData = { arm };
      return group;
    }
    const group = new THREE.Group();
    const body =
      theme.unit === "robot"
        ? box(group, 0, 0.6, 0, 0.42, 0.58, 0.32, palette.leaf)
        : cylinder(group, 0, 0.6, 0, 0.18, 0.3, 0.6, palette.leaf);
    sphere(
      group,
      0,
      1.03,
      0,
      0.21,
      palette.trim,
      theme.unit === "blob" ? 1 : 0,
    );
    const arm = box(group, 0.28, 0.6, 0, 0.13, 0.45, 0.14, palette.leaf);
    for (const x of [-0.12, 0.12])
      box(group, x, 0.2, 0, 0.12, 0.4, 0.15, palette.wood);
    group.userData = { arm, body };
    return group;
  }
  return {
    worldGroup,
    palette,
    mesh,
    box,
    cylinder,
    sphere,
    beam,
    makeTower,
    makeEnemy,
    makeSettler,
    foliage,
    waterMaterials,
  };
}
