import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  buildNH_L9i,
  buildNF_A9x14,
  buildKVR26,
} from "../src/referenceModels.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { byId } from "../src/data.js";
const helpers = {
  box(g, size, pos, color) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshStandardMaterial({ color }),
    );
    m.position.set(...pos);
    g.add(m);
    return m;
  },
  cylinder(g, r, d, pos, color, axis = "z") {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, d, 32),
      new THREE.MeshStandardMaterial({ color }),
    );
    if (axis === "z") m.rotation.x = Math.PI / 2;
    if (axis === "x") m.rotation.z = Math.PI / 2;
    m.position.set(...pos);
    g.add(m);
    return m;
  },
  textLabel(text, w) {
    return new THREE.Mesh(
      new THREE.PlaneGeometry(w, w / 4),
      new THREE.MeshBasicMaterial(),
    );
  },
};
function count(group, feature) {
  let n = 0;
  group.traverse((o) => {
    if (o.userData.feature === feature) n++;
  });
  return n;
}
function bounds(g) {
  return new THREE.Box3().setFromObject(g);
}
function close(actual, expected, tolerance = 0.00001) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected}`,
  );
}
function dispose(g) {
  g.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
}
test("NH-L9i rendered envelope, base, fins and pipes match published measurements", () => {
  const g = new THREE.Group();
  buildNH_L9i(g, helpers);
  const size = bounds(g).getSize(new THREE.Vector3()).multiplyScalar(100);
  close(size.x, 95);
  close(size.y, 92);
  close(size.z, 23);
  assert.equal(count(g, "fin"), 54);
  assert.equal(count(g, "heatpipe"), 2);
  const base = g.children.find((o) => o.userData.feature === "contact-base");
  const s = bounds(base).getSize(new THREE.Vector3()).multiplyScalar(100);
  close(s.x, 40.8);
  close(s.y, 40);
  for (const pipe of g.children.filter(
    (o) => o.userData.feature === "heatpipe",
  ))
    close(pipe.geometry.parameters.radius * 200, 6);
  dispose(g);
});
test("fan fits 92 x 92 x 14 mm and the assembled cooler is 37 mm tall", () => {
  const heat = new THREE.Group(),
    fan = new THREE.Group();
  buildNH_L9i(heat, helpers);
  const rotor = buildNF_A9x14(fan, helpers);
  assert.equal(count(rotor, "fan-blade"), 9);
  assert.equal(count(rotor, "blade-channel"), 27);
  const impeller = mergeGeometries(
    rotor.children
      .filter((mesh) =>
        ["fan-blade", "blade-channel"].includes(mesh.userData.feature),
      )
      .map((mesh) => mesh.geometry),
  );
  assert.ok(impeller, "blade details must support a single static draw batch");
  impeller.dispose();
  const size = bounds(fan).getSize(new THREE.Vector3()).multiplyScalar(100);
  close(size.x, 92);
  close(size.y, 92);
  close(size.z, 14);
  heat.position.set(...byId.cooler.pos);
  fan.position.set(...byId.cpuFan.pos);
  const b = bounds(heat),
    f = bounds(fan);
  close(b.max.z, f.min.z);
  close((f.max.z - b.min.z) * 100, 37);
  const frame = fan.children.find((o) => o.userData.feature === "fan-frame");
  const holes = frame.geometry.parameters.shapes.holes.slice(1);
  assert.equal(holes.length, 4);
  const centers = holes.map((h) =>
    new THREE.Box2()
      .setFromPoints(h.getPoints())
      .getCenter(new THREE.Vector2()),
  );
  close(
    (Math.max(...centers.map((p) => p.x)) -
      Math.min(...centers.map((p) => p.x))) *
      100,
    82.5,
  );
  dispose(heat);
  dispose(fan);
});
test("Kingston module has the sourced outline, eight packages on one face, and 288 contacts", () => {
  const g = new THREE.Group();
  buildKVR26(g, helpers);
  const size = bounds(g).getSize(new THREE.Vector3()).multiplyScalar(100);
  close(size.y, 133.35);
  close(size.z, 31.25);
  assert.equal(count(g, "gold-contact"), 288);
  assert.equal(count(g, "dram-package"), 8);
  assert.ok(
    g.children
      .filter((o) => o.userData.feature === "dram-package")
      .every((o) => o.position.x > 0),
  );
  const pcb = g.children.find((o) => o.userData.feature === "memory-pcb");
  // A ray through the key opening must miss the PCB, while a ray above it hits.
  g.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(1, 0.041, -0.15625 + 0.018),
    new THREE.Vector3(-1, 0, 0),
  );
  assert.equal(ray.intersectObject(pcb).length, 0);
  ray.ray.origin.z = -0.15625 + 0.07;
  assert.ok(ray.intersectObject(pcb).length > 0);
  dispose(g);
});
