import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { parts, byId } from "../src/data.js";
import {
  buildDetailedPart,
  createRotorGeometry,
} from "../src/hardwareGeometry.js";

test("standard form factors retain their nominal dimensions in millimeters", () => {
  assert.deepEqual(
    byId.board.size.map((x) => Math.round(x * 1000) / 10),
    [244, 305, 1.6],
  );
  assert.deepEqual(
    byId.ssd.size.slice(0, 2).map((x) => x * 100),
    [80, 22],
  );
  assert.equal(byId.ram1.size[1] * 100, 134);
  assert.equal(byId.pcie.size[0] * 100, 89);
  assert.equal(parts.length, 29);
});
test("rear-facing I/O and PSU faces align with the chassis rear", () => {
  const rear = byId.case.pos[0] - byId.case.size[0] / 2;
  for (const id of ["psu", "usb", "network", "display"])
    assert.ok(
      Math.abs(byId[id].pos[0] - byId[id].size[0] / 2 - rear) < 1e-6,
      id,
    );
  for (const id of ["ram1", "ram2", "hdd", "gpu"]) {
    const p = byId[id];
    assert.ok(p.pos[0] + p.size[0] / 2 < byId.case.size[0] / 2, id);
  }
});
test("CPU lid and heatsink contact base meet without a floating cooler", () => {
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
        new THREE.CylinderGeometry(r, r, d, 16),
        new THREE.MeshStandardMaterial({ color }),
      );
      if (axis === "z") m.rotation.x = Math.PI / 2;
      if (axis === "x") m.rotation.z = Math.PI / 2;
      m.position.set(...pos);
      g.add(m);
      return m;
    },
    textLabel() {
      return new THREE.Mesh(
        new THREE.PlaneGeometry(0.01, 0.01),
        new THREE.MeshBasicMaterial(),
      );
    },
  };
  const bounds = {};
  for (const id of ["cpu", "cooler"]) {
    const g = new THREE.Group();
    buildDetailedPart(g, byId[id], helpers);
    g.position.set(...byId[id].pos);
    bounds[id] = new THREE.Box3().setFromObject(g);
    g.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
  }
  const gap = bounds.cooler.min.z - bounds.cpu.max.z;
  assert.ok(gap >= -0.005 && gap <= 0.015, `Contact gap ${gap}`);
});
test("swept fan blades have finite, pitched geometry", () => {
  const geometry = createRotorGeometry(0.46);
  geometry.computeBoundingBox();
  assert.ok(geometry.boundingBox.max.z - geometry.boundingBox.min.z > 0.05);
  assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
  assert.ok([...geometry.attributes.normal.array].every(Number.isFinite));
  geometry.dispose();
});
