import * as THREE from "three";

// Presentation only: damage and hit radius still come from the simulation's impact event.
export function createSplashImpact(theme, x, z, radius = 2.8) {
  const g = new THREE.Group();
  g.position.set(x, 0.2, z);
  const color = new THREE.Color(theme.towers.stone.color).lerp(
    new THREE.Color(theme.palette.glow),
    0.65,
  );
  const hot = color.clone().lerp(new THREE.Color(0xffffff), 0.6);
  const glow = () =>
    new THREE.MeshBasicMaterial({
      color: hot,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  const flash = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), glow());
  flash.position.y = 0.65;
  g.add(flash);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 5, 56), glow());
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.2;
  g.add(ring);
  const spikes = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.22, 1, 4),
    glow(),
    10,
  );
  spikes.frustumCulled = false;
  g.add(spikes);
  const light = new THREE.PointLight(color, 10, radius * 4, 2);
  light.position.y = 1.5;
  g.add(light);
  const dustMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.palette.ground).lerp(color, 0.4),
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const dustGeometry = new THREE.IcosahedronGeometry(1, 1);
  const dust = Array.from({ length: 8 }, (_, i) => {
    const mesh = new THREE.Mesh(dustGeometry, dustMaterial);
    g.add(mesh);
    return { mesh, angle: (i / 8) * Math.PI * 2, size: 0.5 + (i % 3) * 0.15 };
  });
  const debris = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.14, 0),
    new THREE.MeshStandardMaterial({
      color: theme.palette.road,
      emissive: color,
      emissiveIntensity: 0.25,
      roughness: 1,
      transparent: true,
    }),
    18,
  );
  debris.name = "impact-debris";
  debris.frustumCulled = false;
  g.add(debris);
  const dummy = new THREE.Object3D();
  const sparksGeo = new THREE.BufferGeometry();
  const sparksPositions = new Float32Array(30 * 3);
  sparksGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(sparksPositions, 3),
  );
  const sparks = new THREE.Points(
    sparksGeo,
    new THREE.PointsMaterial({
      color: hot,
      size: 0.13,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  sparks.frustumCulled = false;
  g.add(sparks);
  function update(age) {
    const t = Math.max(0, Math.min(1, age / 1.05));
    flash.scale.set(0.35 + t * 6, 0.5 + t * 7, 0.35 + t * 6);
    flash.material.opacity = Math.max(0, 0.95 - age * 3.6);
    ring.scale.setScalar(
      0.15 + radius * (1 - Math.pow(1 - Math.min(1, age / 0.5), 3)),
    );
    ring.material.opacity = Math.max(0, 0.65 * (1 - age / 0.5));
    light.intensity = Math.max(0, 10 * (1 - age / 0.22));
    dustMaterial.opacity = 0.42 * Math.sin(Math.PI * t);
    for (const p of dust) {
      const r = radius * (0.25 + t * 0.75);
      p.mesh.position.set(
        Math.cos(p.angle) * r,
        0.15 + t * 0.45,
        Math.sin(p.angle) * r,
      );
      p.mesh.scale.set(
        p.size * (0.3 + t * 1.7),
        p.size * (0.2 + t * 0.6),
        p.size * (0.3 + t * 1.7),
      );
    }
    for (let i = 0; i < 18; i++) {
      const a = i * 2.39996,
        speed = 1.5 + (i % 5) * 0.55;
      dummy.position.set(
        Math.cos(a) * age * speed,
        Math.max(0.1, 0.4 + age * (3.5 + (i % 4)) - 7 * age * age),
        Math.sin(a) * age * speed,
      );
      dummy.rotation.set(age * (i + 2), a + age * 6, age * 3);
      dummy.scale.setScalar((0.7 + (i % 3) * 0.4) * (1 - t * 0.7));
      dummy.updateMatrix();
      debris.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI * 0.2;
      const direction = new THREE.Vector3(
        Math.cos(a),
        0.7 + (i % 3) * 0.5,
        Math.sin(a),
      ).normalize();
      const length =
        (0.4 + Math.min(1, age / 0.2) * 2.7) * (0.75 + (i % 3) * 0.2);
      dummy.position.copy(direction).multiplyScalar(length * 0.5);
      dummy.position.y += 0.35;
      dummy.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction,
      );
      dummy.scale.set(1, length, 1);
      dummy.updateMatrix();
      spikes.setMatrixAt(i, dummy.matrix);
    }
    spikes.instanceMatrix.needsUpdate = true;
    spikes.material.opacity = Math.max(0, 0.9 * (1 - age / 0.4));
    debris.instanceMatrix.needsUpdate = true;
    debris.material.opacity = Math.min(1, (1 - t) * 3);
    for (let i = 0; i < 30; i++) {
      const a = i * 2.39996,
        speed = 2 + (i % 6);
      sparksPositions[i * 3] = Math.cos(a) * age * speed;
      sparksPositions[i * 3 + 1] = Math.max(
        0.1,
        0.6 + age * (2 + (i % 5)) - age * age * 6,
      );
      sparksPositions[i * 3 + 2] = Math.sin(a) * age * speed;
    }
    sparksGeo.attributes.position.needsUpdate = true;
    sparks.material.opacity = Math.max(0, 1 - age / 0.7);
  }
  update(0);
  return { g, life: 1.05, max: 1.05, update };
}
