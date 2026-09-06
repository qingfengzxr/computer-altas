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
  assert.equal(byId.ram1.size[1] * 100, 133.35);
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

test("CPU lid and heatsink contact base meet without a floating cooler", () => {
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
test("video receptacles meet the GPU PCB while assembled and during initial disassembly", () => {
  assert.deepEqual(byId.display.explode, byId.gpu.explode);
  const gpu = new THREE.Group(),
    display = new THREE.Group();
  buildDetailedPart(gpu, byId.gpu, helpers);
  buildDetailedPart(display, byId.display, helpers);
  const pcb = gpu.children.find((mesh) => mesh.userData.feature === "gpu-pcb");
  const ports = display.children.filter(
    (mesh) => mesh.userData.feature === "video-receptacle",
  );
  assert.equal(ports.length, 3);
  for (const amount of [0, 0.23, 0.35]) {
    for (const [group, part] of [
      [gpu, byId.gpu],
      [display, byId.display],
    ]) {
      group.position
        .set(...part.pos)
        .addScaledVector(new THREE.Vector3(...part.explode), amount);
      group.updateMatrixWorld(true);
    }
    const board = new THREE.Box3().setFromObject(pcb);
    for (const port of ports) {
      const socket = new THREE.Box3().setFromObject(port);
      assert.ok(
        Math.abs(socket.max.y - board.min.y) < 1e-6,
        "receptacle must sit against the PCB underside",
      );
      assert.ok(
        Math.min(socket.max.x, board.max.x) -
          Math.max(socket.min.x, board.min.x) >
          0.05,
        "receptacle mounting area must overlap the rear PCB",
      );
      assert.ok(socket.min.z >= board.min.z && socket.max.z <= board.max.z);
    }
  }
  for (const group of [gpu, display])
    group.traverse((mesh) => {
      mesh.geometry?.dispose();
      mesh.material?.dispose();
    });
});
test("four USB-A sockets have compact openings and sit on the motherboard face", () => {
  const group = new THREE.Group();
  buildDetailedPart(group, byId.usb, helpers);
  group.position.set(...byId.usb.pos);
  const shells = group.children.filter(
    (mesh) => mesh.userData.feature === "usb-shell",
  );
  assert.equal(shells.length, 4);
  for (const shell of shells) {
    const opening = shell.geometry.parameters.shapes.holes[0];
    const size = new THREE.Box2()
      .setFromPoints(opening.getPoints())
      .getSize(new THREE.Vector2());
    assert.ok(Math.abs(size.x * 100 - 12.5) < 1e-6);
    assert.ok(Math.abs(size.y * 100 - 5.5) < 1e-6);
  }
  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  assert.ok(
    Math.abs(size.z * 100 - 15) < 1e-5,
    "housing width must not return to the old 53 mm block",
  );
  assert.ok(Math.abs(size.y * 100 - 36) < 1e-5);
  assert.ok(
    Math.abs(bounds.min.z - (byId.board.pos[2] + byId.board.size[2] / 2)) <
      1e-6,
  );
  group.traverse((mesh) => {
    mesh.geometry?.dispose();
    mesh.material?.dispose();
  });
});
test("swept fan blades have finite, pitched geometry", () => {
  const geometry = createRotorGeometry(0.46);
  geometry.computeBoundingBox();
  assert.ok(geometry.boundingBox.max.z - geometry.boundingBox.min.z > 0.05);
  assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
  assert.ok([...geometry.attributes.normal.array].every(Number.isFinite));
  geometry.dispose();
});
