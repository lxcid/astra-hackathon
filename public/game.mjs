import { createSplashImpact } from "./impact-effects.mjs";
import { currentWaveIndex, renderWaveIntel } from "./wave-info.mjs";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createBattlefield } from "./battlefield.mjs";
import { createThemeScenery } from "./theme-scene.mjs";
import { activeTheme as theme, ROLE_COPY } from "./theme.mjs";
import { applyThemeUI, themeText } from "./theme-ui.mjs";
import {
  createWorld,
  BUILDINGS,
  WAVES,
  towerStats,
  upgradeCost,
  terrainHeight,
} from "./world.mjs";
const battlefield = createBattlefield(theme.routeSeed);
const { SITES, ROAD, onRoad, nearestRoad } = battlefield;
applyThemeUI(theme);
const $ = (s) => document.querySelector(s),
  canvas = $("#game");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
const scene = new THREE.Scene();
scene.background = new THREE.Color(theme.palette.sky);
scene.fog = new THREE.FogExp2(theme.palette.sky, 0.008);
const camera = new THREE.PerspectiveCamera(
  43,
  innerWidth / innerHeight,
  0.1,
  220,
);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 4);
camera.position.set(9, 49, 49);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 28;
controls.maxDistance = 85;
controls.minPolarAngle = 0.3;
controls.maxPolarAngle = 1.1;
controls.mouseButtons = {
  LEFT: null,
  MIDDLE: THREE.MOUSE.PAN,
  RIGHT: THREE.MOUSE.ROTATE,
};
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
controls.update();
let cameraFit = Math.max(1, 1.28 / camera.aspect);
camera.position
  .sub(controls.target)
  .multiplyScalar(cameraFit)
  .add(controls.target);
controls.update();
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(
  new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.24, 0.5, 1),
);
composer.addPass(new OutputPass());
scene.add(new THREE.HemisphereLight(0xe3f3d5, 0x304144, 2));
const sun = new THREE.DirectionalLight(0xffe0ab, 3);
sun.position.set(-18, 35, 15);
sun.castShadow = true;
Object.assign(sun.shadow.camera, {
  left: -30,
  right: 30,
  top: 30,
  bottom: -30,
  near: 1,
  far: 100,
});
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.05;
scene.add(sun);
const rim = new THREE.DirectionalLight(0xa4d9d3, 1);
rim.position.set(15, 15, -20);
scene.add(rim);
const {
  worldGroup,
  palette,
  mesh,
  box,
  cylinder,
  sphere,
  beam,
  makeTower,
  makeSettler,
  makeEnemy,
  foliage,
  waterMaterials,
} = createThemeScenery(scene, theme, battlefield);
const dynamic = new THREE.Group();
scene.add(dynamic);
const pads = new Map(),
  towers = new Map(),
  enemies = new Map(),
  guards = new Map(),
  projectiles = new Map(),
  labels = new Map(),
  effects = [];
let world = createWorld(7391, battlefield),
  state = world.state,
  started = false,
  paused = false,
  speed = 1,
  mode = null,
  selectedSite = null,
  selectedEnemy = null,
  elapsed = 0,
  animationTime = 0,
  accumulator = 0,
  lastUI = 0,
  lastEvent = 0,
  endedShown = false,
  audioContext,
  soundOn = true,
  modalPaused = false;
const keys = new Set(),
  raycaster = new THREE.Raycaster(),
  pointer = new THREE.Vector2(),
  groundPoint = new THREE.Vector3(),
  plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
let onGround = false,
  pointerDown;
const roadMat = new THREE.MeshStandardMaterial({
  color: theme.palette.road,
  roughness: 1,
  flatShading: false,
});
function makeRoad() {
  const pos = [],
    uv = [],
    ix = [];
  ROAD.forEach((p, i) => {
    const a = ROAD[Math.max(0, i - 1)],
      b = ROAD[Math.min(ROAD.length - 1, i + 1)],
      dx = b.x - a.x,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz);
    for (const side of [-1, 1]) {
      const x = p.x + (dz / len) * 1.22 * side,
        z = p.z - (dx / len) * 1.22 * side;
      pos.push(x, terrainHeight(x, z) + 0.045, z);
      uv.push(side === 1 ? 1 : 0, p.distance);
    }
    if (i < ROAD.length - 1) {
      const n = i * 2;
      ix.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(ix);
  geo.computeVertexNormals();
  const road = mesh(geo, roadMat);
  road.material.side = THREE.DoubleSide;
  road.castShadow = false;
  for (let i = 3; i < ROAD.length; i += 8) {
    const p = ROAD[i],
      a = ROAD[i - 1],
      angle = Math.atan2(p.x - a.x, p.z - a.z);
    for (const side of [-1, 1]) {
      const x = p.x + Math.cos(angle) * 1.35 * side,
        z = p.z - Math.sin(angle) * 1.35 * side;
      const rock = sphere(
        worldGroup,
        x,
        terrainHeight(x, z) + 0.1,
        z,
        0.17,
        palette.stone,
        0,
      );
      rock.scale.y = 0.6;
    }
  }
  for (let d = 4; d < ROAD.at(-1).distance; d += 8) {
    const p = onRoad(d);
    const g = new THREE.Group();
    g.position.set(p.x, terrainHeight(p.x, p.z) + 0.085, p.z);
    g.rotation.y = p.angle;
    worldGroup.add(g);
    for (const side of [-1, 1]) {
      const m = box(
        g,
        side * 0.18,
        0,
        0,
        0.08,
        0.025,
        0.55,
        new THREE.MeshBasicMaterial({
          color: 0xeee0b3,
          transparent: true,
          opacity: 0.6,
        }),
      );
      m.rotation.y = side * -0.7;
      m.castShadow = false;
    }
  }
  for (const site of SITES) {
    const g = new THREE.Group();
    g.position.set(site.x, terrainHeight(site.x, site.z), site.z);
    worldGroup.add(g);
    cylinder(g, 0, 0.1, 0, 1.7, 1.85, 0.24, palette.stone, 12);
    cylinder(g, 0, 0.235, 0, 1.47, 1.47, 0.06, palette.wood, 12);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      box(
        g,
        Math.cos(a) * 1.6,
        0.35,
        Math.sin(a) * 1.6,
        0.18,
        0.5,
        0.18,
        palette.trim,
      );
    }
    pads.set(site.id, g);
  }
  const start = ROAD[0],
    end = ROAD.at(-1);
  for (const [p, color] of [
    [start, 0xc97050],
    [end, 0x89b86c],
  ]) {
    const material = new THREE.MeshStandardMaterial({
      color,
      side: THREE.DoubleSide,
    });
    for (const side of [-1, 1]) {
      cylinder(
        worldGroup,
        p.x + side * 1.5,
        1.4,
        p.z,
        0.08,
        0.1,
        2.8,
        palette.wood,
        6,
      );
      const flag = mesh(
        new THREE.PlaneGeometry(0.9, 0.6),
        material,
        worldGroup,
        p.x + side * 1.5 + 0.4,
        2.5,
        p.z,
      );
      flag.rotation.y = 0.3;
    }
  }
}
makeRoad();
const range = mesh(
  new THREE.RingGeometry(0.98, 1, 80),
  new THREE.MeshBasicMaterial({
    color: 0xd8efb8,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  scene,
);
range.rotation.x = -Math.PI / 2;
range.visible = false;
range.castShadow = false;
const cursor = mesh(
  new THREE.RingGeometry(0.95, 1, 64),
  new THREE.MeshBasicMaterial({
    color: 0xd8efb8,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  scene,
);
cursor.rotation.x = -Math.PI / 2;
cursor.visible = false;
cursor.castShadow = false;
function towerModel(b) {
  const g = makeTower(b.type);
  g.userData.level = b.level;
  g.userData.entity = b;
  g.position.set(b.x, terrainHeight(b.x, b.z) + 0.28, b.z);
  g.scale.setScalar(1 + (b.level - 1) * 0.13);
  return g;
}
function enemyModel(type) {
  const g = makeEnemy(type);
  if (type === "brute" || type === "elder") {
    const armor = sphere(g, 0, 1, 0, 0.73, palette.stone, 0);
    armor.scale.set(1, 0.5, 1.4);
  }
  const scale =
    type === "elder"
      ? 1.9
      : type === "brute"
        ? 1.3
        : type === "runner"
          ? 0.7
          : 0.9;
  g.scale.setScalar(scale);
  return g;
}
function sync() {
  for (const b of state.structures) {
    let g = towers.get(b.id);
    if (g && g.userData.level !== b.level) {
      dispose(g);
      towers.delete(b.id);
      g = null;
    }
    if (!g) {
      g = towerModel(b);
      dynamic.add(g);
      towers.set(b.id, g);
    }
    g.scale.y = (1 + (b.level - 1) * 0.13) * Math.max(0.12, b.progress);
    if (g.userData.crystal) g.userData.crystal.rotation.y = animationTime * 0.6;
  }
  for (const [id, g] of towers)
    if (!state.structures.some((b) => b.id === id)) {
      dispose(g);
      towers.delete(id);
    }
  for (const e of state.enemies) {
    let g = enemies.get(e.id);
    if (!g) {
      g = enemyModel(e.type);
      dynamic.add(g);
      enemies.set(e.id, g);
    }
    g.position.set(e.x, terrainHeight(e.x, e.z) + 0.12, e.z);
    g.rotation.y = e.angle;
    g.userData.legs.forEach(
      (leg, i) =>
        (leg.rotation.x = e.blocked
          ? 0
          : Math.sin(animationTime * 11 + e.phase + i * 1.7) * 0.3),
    );
    g.userData.core.scale.setScalar(e.slowTime > 0 ? 0.6 : 1);
  }
  for (const [id, g] of enemies)
    if (!state.enemies.some((e) => e.id === id)) {
      dispose(g);
      enemies.delete(id);
    }
  for (const p of state.projectiles) {
    let g = projectiles.get(p.id);
    if (!g) {
      g = sphere(
        dynamic,
        p.x,
        2,
        p.z,
        p.style === "stone" ? 0.28 : 0.12,
        p.style === "stone"
          ? palette.stoneDark
          : new THREE.MeshBasicMaterial({ color: theme.towers[p.style].color }),
        1,
      );
      g.userData.ownsMaterial = p.style !== "stone";
      projectiles.set(p.id, g);
    }
    const start = new THREE.Vector3(p.x, p.style === "stone" ? 1.9 : 3.1, p.z);
    const end = new THREE.Vector3(p.ex, 0.75, p.ez);
    const mid = start.clone().lerp(end, 0.5);
    mid.y += p.style === "stone" ? 4 : 1;
    const t = Math.min(1, (state.time - p.launchedAt) / p.duration);
    g.position.copy(
      new THREE.QuadraticBezierCurve3(start, mid, end).getPoint(t),
    );
  }
  for (const [id, g] of projectiles) {
    if (!state.projectiles.some((p) => p.id === id)) {
      dispose(g, g.userData.ownsMaterial);
      projectiles.delete(id);
    }
  }
  for (const guard of state.guards) {
    let g = guards.get(guard.id);
    if (!g) {
      g = makeSettler(2);
      g.scale.setScalar(1.25);
      const shield = box(g, -0.28, 0.55, 0.2, 0.12, 0.65, 0.45, palette.metal);
      shield.rotation.y = -0.3;
      beam(g, [0.3, 0.1, 0.2], [0.3, 1.6, 0.2], 0.04, palette.trim);
      dynamic.add(g);
      guards.set(guard.id, g);
    }
    g.position.set(guard.x, terrainHeight(guard.x, guard.z) + 0.08, guard.z);
    g.rotation.y = guard.angle || 0;
    g.userData.arm.rotation.x = Math.sin(animationTime * 8) * 0.45;
  }
  for (const [id, g] of guards)
    if (!state.guards.some((n) => n.id === id)) {
      dispose(g);
      guards.delete(id);
    }
}
function dispose(g, materials = false) {
  g.traverse((n) => {
    if (n.isInstancedMesh) n.dispose();
    n.geometry?.dispose();
    if (materials) n.material?.dispose();
  });
  g.removeFromParent();
}
function sound(freq, duration = 0.2, volume = 0.035) {
  if (!audioContext || !soundOn) return;
  const o = audioContext.createOscillator(),
    gain = audioContext.createGain();
  o.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + duration,
  );
  o.connect(gain).connect(audioContext.destination);
  o.start();
  o.stop(audioContext.currentTime + duration);
}
function burst(x, z, color, size = 3) {
  const g = mesh(
    new THREE.RingGeometry(0.85, 1, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    scene,
    x,
    0.65,
    z,
  );
  g.rotation.x = -Math.PI / 2;
  g.castShadow = false;
  effects.push({ g, life: 0.55, max: 0.55, size });
}
function processEffects() {
  for (const e of state.effects.splice(0)) {
    if (e.type === "shot") {
      sound(e.style === "stone" ? 100 : 800, 0.06, 0.008);
    } else if (e.type === "impact") {
      if (e.style === "stone") {
        const impact = createSplashImpact(theme, e.x, e.z, e.radius);
        scene.add(impact.g);
        effects.push(impact);
        sound(65, 0.22, 0.04);
      } else burst(e.x, e.z, theme.towers[e.style].color, e.radius);
    } else if (e.type === "bloom") {
      burst(e.x, e.z, theme.abilities.bloom.color, 4.5);
      const g = sphere(
        scene,
        e.x,
        1,
        e.z,
        0.6,
        new THREE.MeshBasicMaterial({
          color: theme.abilities.bloom.color,
          transparent: true,
          opacity: 0.35,
          wireframe: true,
        }),
        1,
      );
      effects.push({ g, life: 0.55, max: 0.55, size: 6 });
      sound(350, 0.6, 0.07);
    } else if (e.type === "death") {
      burst(e.x, e.z, 0xffc177, 0.8);
    } else if (e.type === "complete") {
      burst(e.x, e.z, 0xd4f6ae, 2);
      sound(540, 0.25);
    } else if (e.type === "hit") {
      burst(e.x, e.z, 0xffd6a1, 0.5);
    } else if (e.type === "leak") {
      $("#damage-flash").style.opacity = ".4";
      setTimeout(() => ($("#damage-flash").style.opacity = "0"), 240);
      sound(110, 0.3, 0.05);
    } else if (e.type === "wave") {
      sound(150, 0.7, 0.05);
    }
  }
}
function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.life -= dt;
    const t = Math.max(0, 1 - e.life / e.max);
    if (e.update) e.update(e.max - e.life);
    else {
      e.g.material.opacity = 1 - t;
      if (e.size) e.g.scale.setScalar(0.1 + t * e.size);
    }
    if (e.life <= 0) {
      dispose(e.g, true);
      effects.splice(i, 1);
    }
  }
}
function setMode(next) {
  if (!started || paused || state.ended) return;
  mode = mode === next ? null : next;
  selectedEnemy = null;
  if (
    BUILDINGS[mode] &&
    selectedSite &&
    !state.structures.some((b) => b.site === selectedSite)
  ) {
    const result = world.build(mode, selectedSite);
    if (result.ok) {
      mode = null;
      sound(320);
    } else world.event(result.reason, "warn");
  }
  updateHUD();
}
function pick(event) {
  const r = canvas.getBoundingClientRect();
  pointer.set(
    ((event.clientX - r.left) / r.width) * 2 - 1,
    (-(event.clientY - r.top) / r.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  onGround = !!raycaster.ray.intersectPlane(plane, groundPoint);
}
function clickSite(id) {
  if (paused || state.ended) return;
  selectedSite = id;
  selectedEnemy = null;
  if (BUILDINGS[mode]) {
    const result = world.build(mode, id);
    if (result.ok) {
      mode = null;
      sound(320);
    } else world.event(result.reason, "warn");
  }
  updateHUD();
}
canvas.addEventListener("pointerdown", (e) => {
  if (e.button === 0) pointerDown = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener("pointermove", pick);
canvas.addEventListener("pointerleave", () => (onGround = false));
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("pointerup", (e) => {
  if (
    e.button !== 0 ||
    !pointerDown ||
    Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y) > 7
  )
    return;
  pointerDown = null;
  if (!started || paused || state.ended) return;
  pick(e);
  if (!onGround) return;
  if (mode === "bloom") {
    if (!world.bloom(groundPoint.x, groundPoint.z))
      world.event(`${theme.abilities.bloom.name} needs 40 spirit.`, "warn");
  } else if (mode === "rally") {
    if (world.rally(groundPoint.x, groundPoint.z)) mode = null;
    else if (state.rallyCooldown > 0)
      world.event(`${theme.abilities.rally.name} are recovering.`, "warn");
  } else {
    const site = world.siteAt(groundPoint.x, groundPoint.z);
    if (site) clickSite(site.id);
    else {
      selectedSite = null;
      selectedEnemy =
        state.enemies.find(
          (n) => Math.hypot(n.x - groundPoint.x, n.z - groundPoint.z) < 2,
        ) || null;
    }
  }
  updateHUD();
});
for (const b of document.querySelectorAll("[data-action]"))
  b.onclick = () => setMode(b.dataset.action);
$("#next-wave").onclick = () => {
  world.callWave();
  updateHUD();
};
$("#upgrade-button").onclick = () => {
  const b = state.structures.find((b) => b.site === selectedSite);
  if (b) world.upgrade(b.id);
  updateHUD();
};
$("#sell-button").onclick = () => {
  const b = state.structures.find((b) => b.site === selectedSite);
  if (b) world.sell(b.id);
  updateHUD();
};
function pause(value) {
  if (!started || state.ended) return;
  paused = value;
  $("#pause-overlay").classList.toggle("hidden", !paused);
  $("#pause-button").textContent = paused ? "▶" : "Ⅱ";
}
$("#pause-button").onclick = () => pause(!paused);
$("#resume-button").onclick = () => pause(false);
$("#speed-button").onclick = () => {
  speed = speed === 1 ? 2 : 1;
  $("#speed-button").textContent = `${speed}×`;
};
$("#sound-button").onclick = () => {
  soundOn = !soundOn;
  $("#sound-button").textContent = soundOn ? "♫" : "♪";
};
function showModal(id) {
  modalPaused = paused;
  paused = true;
  keys.clear();
  $(id).classList.remove("hidden");
}
function closeModal(id) {
  $(id).classList.add("hidden");
  paused = modalPaused;
}
$("#help-button").onclick = () => showModal("#help");
$("#close-help").onclick = () => closeModal("#help");
$("#seed-title").onclick = $("#seed-game").onclick = () =>
  showModal("#seed-modal");
$("#close-seed").onclick = () => closeModal("#seed-modal");
const portraits = new Map();
function enemyPortrait(type) {
  if (portraits.has(type)) return portraits.get(type);
  const width = 176,
    height = 132,
    target = new THREE.WebGLRenderTarget(width, height);
  target.texture.colorSpace = THREE.SRGBColorSpace;
  const preview = new THREE.Scene();
  preview.background = new THREE.Color(
    getComputedStyle(document.documentElement)
      .getPropertyValue("--ui-panel")
      .trim(),
  );
  preview.add(new THREE.HemisphereLight(0xffffff, theme.palette.body, 2.5));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(2, 4, 5);
  preview.add(light);
  const model = enemyModel(type);
  preview.add(model);
  const bounds = new THREE.Box3().setFromObject(model),
    center = bounds.getCenter(new THREE.Vector3()),
    size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z);
  const portraitCamera = new THREE.PerspectiveCamera(
    35,
    width / height,
    0.01,
    50,
  );
  portraitCamera.position
    .copy(center)
    .add(new THREE.Vector3(1.2, 0.7, 1.6).multiplyScalar(radius));
  portraitCamera.lookAt(center);
  const previous = renderer.getRenderTarget();
  try {
    renderer.setRenderTarget(target);
    renderer.render(preview, portraitCamera);
    const pixels = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d"),
      data = context.createImageData(width, height);
    for (let y = 0; y < height; y++)
      data.data.set(
        pixels.subarray(y * width * 4, (y + 1) * width * 4),
        (height - y - 1) * width * 4,
      );
    context.putImageData(data, 0, 0);
    const url = canvas.toDataURL();
    portraits.set(type, url);
    return url;
  } finally {
    renderer.setRenderTarget(previous);
    target.dispose();
    dispose(model);
  }
}
for (let index = 0; index < WAVES.length; index++) {
  const option = document.createElement("option");
  option.value = index;
  option.textContent = `Wave ${index + 1}`;
  $("#wave-picker").append(option);
}
$("#wave-info-button").onclick = () => {
  $("#wave-picker").value = currentWaveIndex(state);
  renderWaveIntel(theme, state, Number($("#wave-picker").value), enemyPortrait);
  showModal("#wave-info");
  $("#hud").inert = true;
  canvas.inert = true;
  $("#close-wave-info").focus();
};
function closeWaveInfo() {
  $("#hud").inert = false;
  canvas.inert = false;
  closeModal("#wave-info");
  $("#wave-info-button").focus();
}
$("#close-wave-info").onclick = closeWaveInfo;
$("#wave-picker").onchange = () =>
  renderWaveIntel(theme, state, Number($("#wave-picker").value), enemyPortrait);
$("#wave-info").onclick = (event) => {
  if (event.target === $("#wave-info")) closeWaveInfo();
};
function begin() {
  started = true;
  paused = false;
  $("#title-screen").classList.add("hidden");
  $("#hud").classList.remove("hidden");
  camera.position.set(7, 49, 49);
  controls.target.set(0, 0, 4);
  cameraFit = Math.max(1, 1.28 / camera.aspect);
  camera.position
    .sub(controls.target)
    .multiplyScalar(cameraFit)
    .add(controls.target);
  controls.maxDistance = Math.max(85, 90 * cameraFit);
  controls.update();
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  audioContext.resume();
  sound(330, 0.8);
  world.event(
    "Click a build site and choose a tower. Call the first wave when ready.",
    "good",
  );
  updateHUD();
  canvas.focus();
}
$("#begin").onclick = begin;
export { begin };
function reset() {
  for (const map of [towers, enemies, guards]) {
    for (const g of map.values()) dispose(g);
    map.clear();
  }
  for (const g of projectiles.values()) dispose(g, g.userData.ownsMaterial);
  projectiles.clear();
  for (const e of effects.splice(0)) dispose(e.g, true);
  world = createWorld(7391, battlefield);
  state = world.state;
  lastEvent = 0;
  mode = null;
  selectedSite = null;
  selectedEnemy = null;
  endedShown = false;
  paused = false;
  accumulator = 0;
  $("#end-screen").classList.add("hidden");
  $("#announcements").innerHTML = "";
  updateHUD();
}
$("#restart-button").onclick = reset;
window.addEventListener("keydown", (e) => {
  if (!$("#wave-info").classList.contains("hidden")) {
    if (e.code === "Escape") {
      e.preventDefault();
      closeWaveInfo();
    }
    if (e.code === "Tab") {
      const first = $("#close-wave-info"),
        last = $("#wave-picker");
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    return;
  }
  if (e.target.closest("input, textarea, select")) return;
  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.code,
    )
  )
    e.preventDefault();
  if (e.repeat) return;
  if (
    !$("#help").classList.contains("hidden") ||
    !$("#seed-modal").classList.contains("hidden")
  ) {
    if (e.code === "Escape")
      closeModal(
        !$("#help").classList.contains("hidden") ? "#help" : "#seed-modal",
      );
    return;
  }
  keys.add(e.code);
  if (!started) {
    if (e.code === "Enter") begin();
    return;
  }
  const action = {
    Digit1: "bow",
    Digit2: "stone",
    Digit3: "frost",
    Digit4: "ward",
    Digit5: "rally",
    Digit6: "bloom",
    Space: "bloom",
  }[e.code];
  if (action) setMode(action);
  if (e.code === "KeyN" && !paused) world.callWave();
  if (e.code === "KeyU" && !paused) {
    const b = state.structures.find((b) => b.site === selectedSite);
    if (b) world.upgrade(b.id);
  }
  if (e.code === "KeyP") pause(!paused);
  if (e.code === "Escape") {
    if (mode) {
      mode = null;
      updateHUD();
    } else if (selectedSite) {
      selectedSite = null;
      updateHUD();
    } else pause(!paused);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  keys.clear();
  if (started && !paused && !state.ended) pause(true);
});
function updateHUD() {
  $("#lives-value").textContent = state.lives;
  $("#gold-value").textContent = Math.floor(state.gold);
  $("#wave-value").textContent = `${state.wave} / ${WAVES.length}`;
  $("#kills-value").textContent = state.kills;
  $("#spirit-value").textContent = Math.floor(state.spirit);
  $("#spirit-fill").style.width = `${state.spirit}%`;
  $("#rally-status").textContent =
    state.rallyCooldown > 0 ? `${Math.ceil(state.rallyCooldown)}s` : "Ready";
  $("#wave-info-button").textContent =
    `${state.waiting && !state.ended ? "Next wave" : "Wave"} intel ⓘ`;
  const next = WAVES[state.wave];
  $("#next-wave").disabled = !state.waiting || state.ended;
  $("#next-wave").innerHTML = state.waiting
    ? `<span>N</span> Call wave ${state.wave + 1} <b>↗</b>`
    : `<span>${state.wave}/6</span> Wave in progress`;
  $("#wave-preview").textContent =
    state.waiting && next
      ? `${next.enemies.length} enemies · Wave ${state.wave + 1}`
      : `${state.enemies.length} on road · ${state.spawnQueue.length} approaching`;
  $("#objective-text").textContent = state.waiting
    ? "Build and upgrade. Start the next wave when you are ready."
    : `Defend ${theme.goal}. Enemies reaching it cost lives.`;
  $("#action-hint").textContent = BUILDINGS[mode]
    ? `${theme.towers[mode].name.toUpperCase()} · Click a marked site · ${BUILDINGS[mode].cost} amber`
    : mode === "bloom"
      ? `${theme.abilities.bloom.name.toUpperCase()} · Click a cluster · 40 spirit · Esc cancel`
      : mode === "rally"
        ? `${theme.abilities.rally.name.toUpperCase()} · Click the road to hold a choke point`
        : "Click a site to build · click a tower to upgrade · N next wave";
  for (const b of document.querySelectorAll("[data-action]")) {
    b.classList.toggle("active", b.dataset.action === mode);
    b.setAttribute("aria-pressed", String(b.dataset.action === mode));
  }
  const tower = state.structures.find((b) => b.site === selectedSite),
    site = SITES.find((s) => s.id === selectedSite);
  $("#selection").classList.toggle("hidden", !site && !selectedEnemy);
  $("#tower-commands").classList.toggle("hidden", !tower);
  range.visible = !!site;
  if (site) {
    const stats = tower ? towerStats(tower) : BUILDINGS[mode] || BUILDINGS.bow;
    range.position.set(site.x, terrainHeight(site.x, site.z) + 0.1, site.z);
    range.scale.setScalar(stats.range);
    range.material.color.set(
      theme.towers[tower?.type || mode || "bow"]?.color || theme.palette.glow,
    );
    $("#selection-type").textContent =
      `SITE ${site.id}${tower ? ` · LEVEL ${tower.level}` : " · EMPTY"}`;
    $("#selection-name").textContent = tower
      ? theme.towers[tower.type].name
      : "Raise a defense";
    $("#selection-info").textContent = tower
      ? `${Math.round(stats.damage)} damage · ${stats.interval}s attack · ${stats.range.toFixed(1)} range. ${ROLE_COPY[tower.type]}`
      : "Choose a tower below. This site covers the nearby bends of the road.";
    if (tower) {
      const cost = upgradeCost(tower);
      $("#upgrade-button").textContent =
        cost === null ? "Maximum level" : `U · Upgrade · ${cost} ◈`;
      $("#upgrade-button").disabled =
        cost === null || state.gold < cost || tower.progress < 1;
      $("#sell-button").textContent =
        `Sell · +${Math.floor(tower.spent * 0.7)} ◈`;
    }
  } else if (selectedEnemy) {
    if (!state.enemies.some((e) => e.id === selectedEnemy.id))
      selectedEnemy = null;
    else {
      $("#selection-type").textContent = "ON THE ROAD";
      $("#selection-name").textContent = theme.enemies[selectedEnemy.type].name;
      $("#selection-info").textContent =
        `${Math.ceil(selectedEnemy.health)} life · ${Math.round(selectedEnemy.armor * 100)}% armor · ${selectedEnemy.leak} lives if it escapes.`;
    }
  }
  for (const e of state.events.filter((e) => e.id > lastEvent)) {
    const n = document.createElement("div");
    n.className = `announcement ${e.tone}`;
    n.textContent = themeText(e.text, theme);
    n.dataset.time = e.time;
    $("#announcements").append(n);
    lastEvent = e.id;
  }
  const notes = [...$("#announcements").children];
  notes.forEach((n, i) => {
    if (state.time - Number(n.dataset.time) > 9 || i < notes.length - 2)
      n.remove();
  });
  if (state.ended && !endedShown) {
    endedShown = true;
    mode = null;
    $("#end-kicker").textContent = state.won
      ? "YOUR WORLD IS SAFE"
      : "THE ROAD WAS OVERRUN";
    $("#end-title").textContent = state.won
      ? `${theme.goal} stands.`
      : "The defenses have fallen.";
    $("#end-copy").textContent = state.won
      ? `Your defenses held. ${theme.goal} lives to see another dawn.`
      : "Use rapid towers against runners, piercing towers against armor, and defenders to hold enemies within range.";
    $("#end-stats").textContent =
      `${state.lives} lives · ${state.kills} defeated · ${state.stats.upgrades} upgrades`;
    $("#end-screen").classList.remove("hidden");
  }
}
function screenLabel(id, x, y, z, text, kind = "label", click) {
  let el = labels.get(id);
  if (!el) {
    el = document.createElement(click ? "button" : "div");
    el.className = `world-label ${kind}`;
    if (click) el.onclick = click;
    $("#world-labels").append(el);
    labels.set(id, el);
  }
  const p = new THREE.Vector3(x, y, z).project(camera);
  el.style.left = `${(p.x * 0.5 + 0.5) * innerWidth}px`;
  el.style.top = `${(-p.y * 0.5 + 0.5) * innerHeight}px`;
  el.style.display = p.z > 1 || p.z < -1 ? "none" : "";
  el.textContent = text;
  return el;
}
function updateLabels() {
  const used = new Set();
  for (const s of SITES) {
    const b = state.structures.find((b) => b.site === s.id),
      id = `site-${s.id}`;
    used.add(id);
    const el = screenLabel(
      id,
      s.x,
      b ? 4 : 1,
      s.z,
      b ? `${s.id} · ${"★".repeat(b.level)}` : `${s.id}  +`,
      "site",
      () => clickSite(s.id),
    );
    el.classList.toggle("chosen", selectedSite === s.id);
    el.setAttribute(
      "aria-label",
      b
        ? `Site ${s.id}: ${theme.towers[b.type].name}, level ${b.level}`
        : `Build site ${s.id}`,
    );
  }
  for (const e of state.enemies) {
    const id = `enemy-${e.id}`;
    used.add(id);
    if (e.health < e.maxHealth || e.type === "elder")
      screenLabel(
        id,
        e.x,
        e.type === "elder" ? 4 : 2.1,
        e.z,
        `${e.blocked ? "⚔ " : e.slowTime > 0 ? "❄ " : ""}${Math.ceil(e.health)}`,
        "enemy",
      );
  }
  used.add("entry");
  used.add("exit");
  for (const [id, el] of labels)
    if (!used.has(id)) {
      el.remove();
      labels.delete(id);
    }
  screenLabel("entry", ROAD[0].x, 2, ROAD[0].z, "ENTRANCE", "route");
  screenLabel(
    "exit",
    ROAD.at(-1).x,
    2,
    ROAD.at(-1).z,
    theme.goal.toUpperCase(),
    "route",
  );
}
function updateCursor() {
  cursor.visible = started && !paused && !state.ended && onGround && !!mode;
  if (!cursor.visible) return;
  let x = groundPoint.x,
    z = groundPoint.z,
    r = mode === "bloom" ? 4.5 : mode === "rally" ? 2.3 : 1.9,
    valid = true;
  if (BUILDINGS[mode]) {
    const site = world.siteAt(x, z);
    valid =
      !!site &&
      !state.structures.some((b) => b.site === site.id) &&
      state.gold >= BUILDINGS[mode].cost;
    if (site) {
      x = site.x;
      z = site.z;
    }
  } else if (mode === "rally") {
    const p = nearestRoad(x, z);
    valid = p.distance < 4 && state.rallyCooldown === 0;
    x = p.x;
    z = p.z;
  } else valid = state.spirit >= 40;
  cursor.position.set(x, terrainHeight(x, z) + 0.13, z);
  cursor.scale.setScalar(r);
  cursor.material.color.setHex(valid ? 0xd8f7b7 : 0xff8977);
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (frame.last || now)) / 1000);
  frame.last = now;
  elapsed += dt;
  const running = !paused && !state.ended;
  if (running) animationTime += dt * speed;
  if (started && running) {
    accumulator += dt * speed;
    while (accumulator >= 0.05) {
      world.step(0.05);
      accumulator -= 0.05;
    }
    processEffects();
  }
  sync();
  updateEffects(running ? dt * speed : 0);
  if (!started) {
    camera.position.x = (9 + Math.sin(elapsed * 0.06) * 2) * cameraFit;
    camera.lookAt(-2, 0, 0);
  } else if (!paused) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(
        dir,
        new THREE.Vector3(0, 1, 0),
      ),
      move = new THREE.Vector3();
    if (keys.has("KeyW")) move.add(dir);
    if (keys.has("KeyS")) move.sub(dir);
    if (keys.has("KeyD")) move.add(right);
    if (keys.has("KeyA")) move.sub(right);
    move.multiplyScalar(dt * 14);
    const next = controls.target.clone().add(move);
    if (Math.hypot(next.x, next.z) < 22) {
      camera.position.add(move);
      controls.target.add(move);
    }
    controls.update();
  }
  for (const f of foliage)
    f.mesh.rotation.z = Math.sin(elapsed * 0.6 + f.phase) * 0.015;
  for (const m of waterMaterials) m.uniforms.time.value = elapsed;
  worldGroup.userData.motes.rotation.y = Math.sin(elapsed * 0.03) * 0.1;
  updateCursor();
  if (started) {
    updateLabels();
    if (now - lastUI > 120) {
      updateHUD();
      lastUI = now;
    }
  }
  composer.render();
}
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  const fit = Math.max(1, 1.28 / camera.aspect);
  camera.position
    .sub(controls.target)
    .multiplyScalar(fit / cameraFit)
    .add(controls.target);
  cameraFit = fit;
  controls.maxDistance = Math.max(85, 90 * fit);
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
$("#loading").classList.add("hidden");
$("#title-screen").classList.remove("hidden");
requestAnimationFrame(frame);
