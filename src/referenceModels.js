import * as THREE from "three";
import {
  coolerReference as cooler,
  fanReference as fan,
  memoryReference as memory,
} from "./hardwareReferences.js";

function roundedRect(width, height, radius) {
  const x = -width / 2,
    y = -height / 2,
    r = radius,
    s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + width - r, y);
  s.quadraticCurveTo(x + width, y, x + width, y + r);
  s.lineTo(x + width, y + height - r);
  s.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  s.lineTo(x + r, y + height);
  s.quadraticCurveTo(x, y + height, x, y + height - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function circularHole(shape, x, y, r) {
  const hole = new THREE.Path();
  hole.absarc(x, y, r, 0, Math.PI * 2, true);
  shape.holes.push(hole);
}
function extrude(group, shape, depth, z, color, metalness = 0.2) {
  const mesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 24,
    }),
    new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness: metalness > 0.5 ? 0.34 : 0.57,
    }),
  );
  mesh.position.z = z;
  group.add(mesh);
  return mesh;
}

export function buildNH_L9i(group, { box, cylinder, textLabel }) {
  const bottom = -cooler.heatsinkHeight / 200,
    top = -bottom;
  const base = box(
    group,
    [0.408, 0.4, 0.04],
    [0, 0, bottom + 0.02],
    0xb7b9bb,
    0.86,
  );
  base.userData.feature = "contact-base";
  const finPitch = 0.9 / (cooler.finCount - 1);
  for (let i = 0; i < cooler.finCount; i++) {
    // Fin spacing and thickness are visual approximations; count and outer envelope are sourced.
    const mesh = box(
      group,
      [0.89, 0.003, 0.18],
      [0, -0.45 + i * finPitch, top - 0.09],
      0xb9bec2,
      0.8,
    );
    mesh.userData.feature = "fin";
  }
  for (const side of [-1, 1]) {
    const points = [
      [-0.41, side * 0.24, bottom + 0.09],
      [-0.2, side * 0.24, bottom + 0.08],
      [-0.05, side * 0.14, bottom + 0.06],
      [0.25, side * 0.14, bottom + 0.06],
      [0.38, side * 0.2, bottom + 0.08],
      [0.4, side * 0.36, bottom + 0.09],
      [0.2, side * 0.39, bottom + 0.1],
      [-0.41, side * 0.39, bottom + 0.1],
    ].map((v) => new THREE.Vector3(...v));
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        64,
        cooler.pipeDiameter / 200,
        10,
        false,
      ),
      new THREE.MeshStandardMaterial({
        color: 0xaab0b5,
        metalness: 0.88,
        roughness: 0.28,
      }),
    );
    mesh.userData.feature = "heatpipe";
    group.add(mesh);
  }
  for (const x of [-0.469, 0.469]) {
    box(group, [0.012, 0.92, 0.18], [x, 0, top - 0.09], 0xb2b7bb, 0.8);
    for (const y of [-0.375, 0.375]) {
      const ear = roundedRect(0.18, 0.095, 0.02);
      circularHole(ear, 0, 0, 0.021);
      const mesh = extrude(group, ear, 0.018, bottom + 0.015, 0x9fa6ab, 0.8);
      mesh.position.x = x * 0.78;
      mesh.position.y = y;
    }
    for (const y of [-0.4125, 0.4125])
      cylinder(group, 0.026, 0.012, [x * 0.9, y, top - 0.01], 0x90989c);
  }
  const name = textLabel("NH-L9i", 0.39);
  name.rotation.x = Math.PI / 2;
  name.position.set(0, -0.46, top - 0.09);
  group.add(name);
  group.userData.reference = cooler.model;
}

export function buildNF_A9x14(group, helpers) {
  const { box, cylinder } = helpers,
    w = fan.width / 100,
    d = fan.height / 100;
  const shape = roundedRect(w, w, 0.035);
  circularHole(shape, 0, 0, 0.421);
  for (const x of [-fan.holeSpacing / 200, fan.holeSpacing / 200])
    for (const y of [-fan.holeSpacing / 200, fan.holeSpacing / 200])
      circularHole(shape, x, y, 0.021);
  extrude(group, shape, d, -d / 2, 0xc5b18a, 0.03).userData.feature =
    "fan-frame";
  // Recessed brown corner pads and stepped intake edges are referenced from the product photos.
  for (const x of [-0.4125, 0.4125])
    for (const y of [-0.4125, 0.4125]) {
      const pad = roundedRect(0.073, 0.073, 0.012);
      circularHole(pad, 0, 0, 0.021);
      const mesh = extrude(group, pad, 0.008, d / 2 - 0.008, 0x694c3d, 0.02);
      mesh.position.set(x, y, d / 2 - 0.008);
    }
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.421 + i * 0.004, 0.002, 6, 80),
      new THREE.MeshStandardMaterial({ color: 0xae9770, roughness: 0.65 }),
    );
    ring.position.z = d / 2 - 0.008 - i * 0.012;
    group.add(ring);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.25,
      spoke = box(
        group,
        [0.31, 0.025, 0.018],
        [Math.cos(a) * 0.25, Math.sin(a) * 0.25, -0.055],
        0xb49c77,
      );
    spoke.rotation.z = a;
  }
  const rotor = new THREE.Group();
  group.add(rotor);
  for (let i = 0; i < 9; i++) {
    const profile = new THREE.Shape();
    profile.moveTo(0.1, -0.035);
    profile.bezierCurveTo(0.18, -0.025, 0.28, -0.035, 0.355, -0.14);
    profile.quadraticCurveTo(0.39, -0.12, 0.407, -0.02);
    profile.quadraticCurveTo(0.414, 0.075, 0.381, 0.15);
    profile.bezierCurveTo(0.3, 0.115, 0.185, 0.12, 0.103, 0.065);
    profile.closePath();
    const geometry = new THREE.ExtrudeGeometry(profile, {
      depth: 0.008,
      bevelEnabled: true,
      bevelSize: 0.001,
      bevelThickness: 0.001,
      bevelSegments: 1,
      curveSegments: 18,
    });
    const vertices = geometry.attributes.position;
    for (let j = 0; j < vertices.count; j++)
      vertices.setZ(j, vertices.getZ(j) + vertices.getY(j) * 0.18);
    geometry.computeVertexNormals();
    const blade = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0x694c3e,
        roughness: 0.51,
        metalness: 0.02,
      }),
    );
    blade.rotation.z = (i * Math.PI * 2) / 9;
    blade.position.z = 0.012;
    blade.userData.feature = "fan-blade";
    rotor.add(blade);
    for (let channel = 0; channel < 3; channel++) {
      const y = 0.015 + channel * 0.026;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0.27, y, 0.023 + y * 0.18),
        new THREE.Vector3(0.32, y - 0.012, 0.024 + y * 0.18),
        new THREE.Vector3(0.37, y - 0.03, 0.025 + y * 0.18),
      );
      const ridge = new THREE.Mesh(
        // Match the extruded blades so static batching can merge the whole impeller.
        new THREE.TubeGeometry(curve, 8, 0.002, 4, false).toNonIndexed(),
        blade.material.clone(),
      );
      ridge.rotation.z = blade.rotation.z;
      ridge.userData.feature = "blade-channel";
      rotor.add(ridge);
    }
  }
  cylinder(rotor, 0.113, 0.068, [0, 0, 0.012], 0x70503d);
  cylinder(rotor, 0.109, 0.004, [0, 0, 0.048], 0x765743);
  rotor.userData.spinDirection = 1;
  group.userData.reference = fan.model;
  return rotor;
}

export function buildKVR26(group, { box, textLabel }) {
  const length = memory.length / 100,
    height = memory.height / 100,
    thickness = memory.boardThickness / 100;
  // Draw the manufacturer's module outline in the length/height plane, then stand it on edge.
  const shape = new THREE.Shape();
  const L = length / 2,
    H = height / 2,
    key = 0.055;
  shape.moveTo(-L, -H + 0.005);
  shape.lineTo(-L + 0.0335, -H + 0.005);
  shape.lineTo(key - 0.022, -H);
  shape.lineTo(key - 0.022, -H + 0.039);
  shape.quadraticCurveTo(key - 0.014, -H + 0.05, key - 0.006, -H + 0.039);
  shape.lineTo(key - 0.006, -H);
  shape.lineTo(L - 0.0335, -H + 0.005);
  shape.lineTo(L, -H + 0.005);
  for (const [edge, dir] of [
    [L, 1],
    [-L, -1],
  ]) {
    if (dir === -1) shape.lineTo(-L, H);
    if (dir === 1) {
      shape.lineTo(edge, -H + 0.08);
      shape.lineTo(edge - 0.021, -H + 0.08);
      shape.lineTo(edge - 0.021, -H + 0.11);
      shape.lineTo(edge, -H + 0.11);
      shape.lineTo(edge, -H + 0.146);
      shape.lineTo(edge - 0.021, -H + 0.146);
      shape.lineTo(edge - 0.021, -H + 0.176);
      shape.lineTo(edge, -H + 0.176);
      shape.lineTo(edge, H);
    } else {
      shape.lineTo(edge, -H + 0.176);
      shape.lineTo(edge + 0.021, -H + 0.176);
      shape.lineTo(edge + 0.021, -H + 0.146);
      shape.lineTo(edge, -H + 0.146);
      shape.lineTo(edge, -H + 0.11);
      shape.lineTo(edge + 0.021, -H + 0.11);
      shape.lineTo(edge + 0.021, -H + 0.08);
      shape.lineTo(edge, -H + 0.08);
      shape.lineTo(edge, -H + 0.005);
    }
  }
  shape.closePath();
  circularHole(shape, -L + 0.018, -H + 0.022, 0.007);
  circularHole(shape, L - 0.018, -H + 0.022, 0.007);
  const board = extrude(
    group,
    shape,
    thickness,
    -thickness / 2,
    0x087638,
    0.03,
  );
  // (drawing x,y,z) -> (thickness,length,height).
  board.geometry.applyMatrix4(
    new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1),
  );
  board.position.set(-thickness / 2, 0, 0);
  board.userData.feature = "memory-pcb";
  const centers = [-0.523, -0.38, -0.237, -0.094, 0.119, 0.262, 0.405, 0.548];
  for (const y of centers) {
    const chip = box(
      group,
      [0.012, 0.095, 0.11],
      [thickness / 2 + 0.006, y, 0.017],
      0x242728,
    );
    chip.material.roughness = 0.88;
    chip.userData.feature = "dram-package";
  }
  box(
    group,
    [0.008, 0.027, 0.033],
    [thickness / 2 + 0.004, 0.025, -0.032],
    0x1f2827,
  ).userData.feature = "spd";
  // 76 contacts before the key and 68 after it on each face, 288 in total.
  for (const side of [-1, 1])
    for (const [start, span, count] of [
      [-L + 0.0335, 0.646, 76],
      [L - 0.0335 - 0.561, 0.561, 68],
    ])
      for (let i = 0; i < count; i++) {
        const y = start + ((i + 0.5) * span) / count;
        const finger = box(
          group,
          [0.0004, (span / count) * 0.7, 0.022],
          [side * (thickness / 2 + 0.0002), y, -H + 0.016],
          0xc8ac58,
          0.65,
        );
        finger.userData.feature = "gold-contact";
      }
  const sticker = box(
    group,
    [0.001, 0.38, 0.07],
    [thickness / 2 + 0.013, -0.23, 0.023],
    0xe4e4da,
  );
  sticker.material.roughness = 0.92;
  const label = textLabel("KVR26N19S8/8", 0.34, false, "#263026");
  label.rotation.set(0, Math.PI / 2, Math.PI / 2);
  label.position.set(thickness / 2 + 0.014, -0.23, 0.023);
  group.add(label);
  group.userData.reference = memory.model;
}
