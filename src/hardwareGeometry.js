import * as THREE from "three";

// One scene unit represents 100 mm. These are generic components, not a vendor CAD model.
export const hardwareDimensions = {
  board: { pos: [0, 0.25, -0.668], size: [2.44, 3.05, 0.016] },
  socket: { pos: [-0.35, 1, -0.615], size: [0.57, 0.57, 0.08] },
  cpu: { pos: [-0.35, 1, -0.55], size: [0.4, 0.4, 0.05] },
  cooler: { pos: [-0.35, 1, -0.08], size: [1, 1, 0.8] },
  cpuFan: { pos: [-0.35, 1, 0.42], size: [1, 1, 0.16] },
  ram1: { pos: [0.68, 0.95, -0.49], size: [0.035, 1.34, 0.32] },
  ram2: { pos: [0.96, 0.95, -0.49], size: [0.035, 1.34, 0.32] },
  atx: { pos: [1.13, 0.54, -0.59], size: [0.1, 0.51, 0.19] },
  eps: { pos: [-1.02, 1.62, -0.59], size: [0.18, 0.1, 0.19] },
  ssd: { pos: [-0.27, 0.04, -0.65], size: [0.8, 0.22, 0.025] },
  hdd: { pos: [0.88, -1.79, 0.1], size: [1.016, 0.261, 1.47] },
  sata: { pos: [1.08, -1.13, -0.6], size: [0.22, 0.22, 0.2] },
  pcie: { pos: [-0.67, -0.35, -0.59], size: [0.89, 0.09, 0.13] },
  psu: { pos: [-0.7, -1.88, -0.05], size: [1.6, 0.8, 1.75] },
  usb: { pos: [-1.335, 0.26, -0.31] },
  network: { pos: [-1.335, 0.88, -0.3] },
  display: { pos: [-1.425, -0.48, 0.05] },
  case: { size: [3, 4.65, 2.5] },
  panel: { size: [2.98, 4.62, 0.04] },
};

export function createRotorGeometry(radius) {
  const s = new THREE.Shape();
  s.moveTo(radius * 0.18, -radius * 0.08);
  s.bezierCurveTo(
    radius * 0.5,
    -radius * 0.32,
    radius * 0.94,
    -radius * 0.15,
    radius * 0.97,
    radius * 0.16,
  );
  s.bezierCurveTo(
    radius * 0.86,
    radius * 0.35,
    radius * 0.54,
    radius * 0.32,
    radius * 0.25,
    radius * 0.17,
  );
  s.closePath();
  const geometry = new THREE.ExtrudeGeometry(s, {
    depth: 0.018,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.004,
    bevelThickness: 0.003,
    curveSegments: 12,
  });
  // A gentle blade pitch makes each swept airfoil visibly three-dimensional.
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++)
    positions.setZ(i, positions.getZ(i) + positions.getY(i) * 0.22);
  geometry.computeVertexNormals();
  return geometry;
}

export function buildFan(group, radius, axis, helpers, framed = true) {
  const { box, cylinder } = helpers;
  const mount = new THREE.Group();
  if (axis === "x") mount.rotation.y = Math.PI / 2;
  if (axis === "y") mount.rotation.x = Math.PI / 2;
  group.add(mount);
  const shape = new THREE.Shape();
  const r = radius * 1.08;
  shape.moveTo(-r, -r);
  shape.lineTo(r, -r);
  shape.lineTo(r, r);
  shape.lineTo(-r, r);
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, radius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const material = new THREE.MeshStandardMaterial({
    color: 0x26292c,
    roughness: 0.7,
    metalness: 0.05,
  });
  const frame = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSize: 0.008,
      bevelThickness: 0.006,
      bevelSegments: 2,
      curveSegments: 40,
    }),
    material,
  );
  frame.position.z = -0.06;
  if (framed) mount.add(frame);
  else {
    frame.geometry.dispose();
    frame.material.dispose();
  }
  if (framed)
    for (const x of [-r * 0.86, r * 0.86])
      for (const y of [-r * 0.86, r * 0.86]) {
        cylinder(mount, 0.023, 0.012, [x, y, 0.073], 0x92979b);
        box(mount, [0.027, 0.007, 0.005], [x, y, 0.082], 0x202326);
      }
  for (let i = 0; i < 4; i++) {
    const spoke = box(
      mount,
      [radius * 0.83, 0.034, 0.025],
      [0, 0, -0.065],
      0x282d30,
    );
    const a = (i * Math.PI) / 2 + 0.3;
    spoke.position.x = Math.cos(a) * radius * 0.54;
    spoke.position.y = Math.sin(a) * radius * 0.54;
    spoke.rotation.z = a;
  }
  const rotor = new THREE.Group();
  mount.add(rotor);
  const bladeGeometry = createRotorGeometry(radius * 0.97);
  for (let i = 0; i < 7; i++) {
    const blade = new THREE.Mesh(
      bladeGeometry.clone(),
      new THREE.MeshStandardMaterial({
        color: 0x42494d,
        roughness: 0.42,
        metalness: 0.1,
      }),
    );
    blade.rotation.z = (i * Math.PI * 2) / 7;
    rotor.add(blade);
  }
  bladeGeometry.dispose();
  cylinder(rotor, radius * 0.23, 0.11, [0, 0, 0.01], 0x30373a);
  cylinder(rotor, radius * 0.16, 0.006, [0, 0, 0.07], 0x777f83);
  return rotor;
}

function boardArtwork() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#203e36";
  ctx.fillRect(0, 0, 1024, 1280);
  // Deterministic etched traces and silkscreen, avoiding random changes between loads.
  for (let i = 0; i < 95; i++) {
    const x = 45 + ((i * 71) % 930),
      y = 40 + ((i * 113) % 1170);
    ctx.strokeStyle = i % 4 === 0 ? "#637b60" : "#365447";
    ctx.lineWidth = i % 3 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 18, y + 18);
    ctx.lineTo(x + 18, y + 70 + (i % 4) * 14);
    ctx.lineTo(x + 35, y + 87 + (i % 4) * 14);
    ctx.stroke();
    ctx.fillStyle = "#bcb185";
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#c3cdc1";
  ctx.font = "16px monospace";
  for (const [text, x, y] of [
    ["ATX / REV 1.0", 60, 1160],
    ["DIMM A", 755, 90],
    ["DIMM B", 865, 90],
    ["PCIEX16", 140, 860],
    ["M.2 2280", 270, 760],
    ["F_PANEL", 780, 1190],
  ])
    ctx.fillText(text, x, y);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function buildDetailedPart(g, p, helpers) {
  const { box, cylinder, textLabel } = helpers;
  const [w, h, d] = p.size;
  const metal = 0xaeb4b8,
    black = 0x24282b,
    gold = 0xc7a65b;
  function screw(x, y, z, r = 0.022) {
    cylinder(g, r, 0.012, [x, y, z], metal);
    box(g, [r * 1.4, 0.007, 0.004], [x, y, z + 0.008], black);
    box(g, [0.007, r * 1.4, 0.004], [x, y, z + 0.008], black);
  }
  function label(text, width, pos, rotation) {
    const mesh = textLabel(text, width);
    mesh.position.set(...pos);
    if (rotation) mesh.rotation.set(...rotation);
    g.add(mesh);
  }
  switch (p.kind) {
    case "board": {
      box(g, p.size, [0, 0, 0], 0x254335);
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({
          map: boardArtwork(),
          roughness: 0.76,
          metalness: 0.12,
        }),
      );
      face.position.z = d / 2 + 0.001;
      g.add(face);
      for (const x of [-1.12, 0, 1.12])
        for (const y of [-1.4, 0, 1.4]) {
          cylinder(g, 0.04, 0.006, [x, y, 0.013], gold);
          screw(x, y, 0.025);
        }
      for (const x of [0.68, 0.96]) {
        box(g, [0.09, 1.44, 0.07], [x, 0.7, 0.055], black);
        box(g, [0.038, 1.34, 0.006], [x, 0.7, 0.094], 0x111514);
        for (const y of [-0.03, 1.43])
          box(g, [0.105, 0.065, 0.115], [x, y, 0.07], 0xd0d0c3);
      }
      for (let i = 0; i < 24; i++) {
        const x = -1.08 + (i % 8) * 0.27,
          y = -1.25 + Math.floor(i / 8) * 0.24;
        box(g, [0.05, 0.027, 0.026], [x, y, 0.025], 0xb2a087);
        box(g, [0.062, 0.014, 0.016], [x, y, 0.026], 0xa1aaa6);
      }
      for (let i = 0; i < 8; i++) {
        const x = -0.85 + i * 0.22;
        cylinder(g, 0.038, 0.1, [x, 1.31, 0.06], 0x9fa8a7);
        cylinder(g, 0.034, 0.006, [x, 1.31, 0.116], 0x555e5d);
      }
      for (let i = 0; i < 3; i++)
        box(g, [0.12, 0.14, 0.04], [-0.74 + i * 0.34, -1.1, 0.036], black);
      return true;
    }
    case "cpu": {
      box(g, [w, h, 0.016], [0, 0, -0.014], 0x2f5846);
      const lid = box(
        g,
        [w * 0.86, h * 0.86, 0.035],
        [0, 0, 0.008],
        0xc3c7ca,
        0.85,
      );
      lid.material.roughness = 0.31;
      label("PROCESSOR", w * 0.65, [0, 0.04, 0.027]);
      label("LGA / 64-BIT", w * 0.62, [0, -0.055, 0.027]);
      for (let x = 0; x < 12; x++)
        for (let y = 0; y < 12; y++)
          if (x < 3 || x > 8 || y < 3 || y > 8)
            box(
              g,
              [0.015, 0.015, 0.004],
              [-w * 0.43 + x * w * 0.078, -h * 0.43 + y * h * 0.078, -0.025],
              gold,
            );
      box(g, [0.022, 0.022, 0.003], [-w * 0.43, -h * 0.43, 0], gold);
      return true;
    }
    case "socket": {
      box(g, [w, h, d * 0.55], [0, 0, -d * 0.2], black);
      box(g, [w * 0.7, h * 0.7, 0.013], [0, 0, 0.01], 0x675f4c);
      for (let i = 0; i < 14; i++)
        for (let j = 0; j < 14; j++)
          box(
            g,
            [0.008, 0.008, 0.008],
            [-w * 0.3 + i * w * 0.046, -h * 0.3 + j * h * 0.046, 0.02],
            gold,
          );
      for (const x of [-w * 0.44, w * 0.44])
        box(g, [w * 0.1, h, 0.023], [x, 0, d * 0.45], metal, 0.8);
      for (const y of [-h * 0.44, h * 0.44])
        box(g, [w, h * 0.1, 0.023], [0, y, d * 0.45], metal, 0.8);
      cylinder(g, 0.012, h * 0.92, [w * 0.52, 0, 0.035], metal, "y");
      screw(-w * 0.43, -h * 0.43, 0.055, 0.018);
      return true;
    }
    case "ram": {
      box(g, p.size, [0, 0, 0], 0x214f39);
      for (const side of [-1, 1]) {
        for (let i = 0; i < 8; i++)
          box(
            g,
            [0.018, 0.105, 0.17],
            [side * (w / 2 + 0.009), -h * 0.41 + i * h * 0.116, 0.03],
            black,
          );
        for (let i = 0; i < 54; i++)
          if (i !== 25 && i !== 26)
            box(
              g,
              [0.003, 0.012, 0.045],
              [side * (w / 2 + 0.002), -h * 0.47 + i * h * 0.0176, -d * 0.43],
              gold,
            );
      }
      box(g, [0.007, h * 0.5, 0.095], [w / 2 + 0.02, 0, 0.04], 0xc9ccc0);
      label(
        "DDR4 / DIMM",
        0.46,
        [w / 2 + 0.025, 0, 0.04],
        [0, Math.PI / 2, Math.PI / 2],
      );
      return true;
    }
    case "cooler": {
      box(g, [0.48, 0.48, 0.075], [0, 0, -d / 2], 0xaf7850, 0.8);
      for (let i = 0; i < 32; i++)
        box(
          g,
          [w, 0.013, d * 0.73],
          [0, -h / 2 + (i * h) / 31, 0.1],
          0xb2b9bc,
          0.82,
        );
      for (const x of [-0.27, -0.09, 0.09, 0.27]) {
        const points = [
          new THREE.Vector3(x, -0.42, 0.4),
          new THREE.Vector3(x, -0.4, -0.25),
          new THREE.Vector3(x, -0.18, -0.38),
          new THREE.Vector3(x, 0.18, -0.38),
          new THREE.Vector3(x, 0.4, -0.25),
          new THREE.Vector3(x, 0.42, 0.4),
        ];
        g.add(
          new THREE.Mesh(
            new THREE.TubeGeometry(
              new THREE.CatmullRomCurve3(points),
              32,
              0.024,
              8,
              false,
            ),
            new THREE.MeshStandardMaterial({
              color: 0xba875e,
              metalness: 0.85,
              roughness: 0.33,
            }),
          ),
        );
      }
      for (const x of [-0.32, 0.32])
        for (const y of [-0.32, 0.32]) {
          box(g, [0.11, 0.11, 0.08], [x, y, -0.34], metal);
          screw(x, y, -0.29);
        }
      return true;
    }
    case "ssd": {
      box(g, p.size, [0, 0, 0], 0x24453b);
      for (let i = 0; i < 3; i++)
        box(g, [0.16, 0.17, 0.023], [-0.2 + i * 0.19, 0, 0.022], black);
      for (let i = 0; i < 18; i++)
        if (i !== 4 && i !== 5)
          box(
            g,
            [0.055, 0.007, 0.003],
            [-w / 2 + 0.027, -h * 0.44 + i * 0.011, 0.014],
            gold,
          );
      box(g, [0.045, h, 0.05], [-w / 2 - 0.018, 0, -0.005], 0x333b38);
      cylinder(g, 0.035, 0.01, [w / 2 - 0.035, 0, 0.016], gold);
      screw(w / 2 - 0.035, 0, 0.028);
      box(g, [0.32, 0.145, 0.003], [0.08, 0, 0.036], 0xd3d5ca);
      label("NVMe / 2280", 0.28, [0.08, 0, 0.04]);
      return true;
    }
    case "gpu": {
      box(g, [w, 0.018, d * 0.91], [0, h / 2 - 0.02, -0.02], 0x26473b);
      box(
        g,
        [w * 0.98, 0.025, d * 0.91],
        [0, h / 2 + 0.012, -0.02],
        0x383f44,
        0.65,
      );
      for (let i = 0; i < 44; i++)
        box(
          g,
          [0.016, h * 0.72, d * 0.82],
          [-w * 0.47 + (i * w * 0.94) / 43, -0.01, 0],
          0xa7aeb1,
          0.82,
        );
      for (const z of [-0.38, 0.34])
        cylinder(g, 0.025, w * 0.89, [0, -0.02, z], 0xb38c61, "x");
      for (const z of [-d * 0.49, d * 0.49])
        box(g, [w, 0.24, 0.045], [0, -0.015, z], black);
      box(g, [0.034, 0.24, d], [w / 2, 0, 0], black);
      const shroud = new THREE.Shape();
      shroud.moveTo(-w / 2, -d / 2);
      shroud.lineTo(w / 2, -d / 2);
      shroud.lineTo(w / 2, d / 2);
      shroud.lineTo(-w / 2, d / 2);
      shroud.closePath();
      for (const x of [-0.58, 0.52]) {
        const cut = new THREE.Path();
        cut.absarc(x, 0.06, 0.4, 0, Math.PI * 2, true);
        shroud.holes.push(cut);
      }
      const shell = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shroud, {
          depth: 0.025,
          bevelEnabled: false,
          curveSegments: 40,
        }),
        new THREE.MeshStandardMaterial({
          color: 0x30373b,
          roughness: 0.58,
          metalness: 0.3,
        }),
      );
      shell.rotation.x = Math.PI / 2;
      shell.position.y = -h / 2;
      g.add(shell);
      for (let i = 0; i < 64; i++)
        if (i !== 12 && i !== 13)
          box(
            g,
            [0.008, 0.022, 0.1],
            [-1.06 + i * 0.013, 0.095, -d / 2 - 0.015],
            gold,
          );
      box(g, [0.23, 0.12, 0.13], [w * 0.35, 0.17, d * 0.4], black);
      for (const x of [-w * 0.42, w * 0.42])
        for (const z of [-d * 0.37, d * 0.37])
          cylinder(g, 0.02, 0.01, [x, h / 2 + 0.032, z], 0x969ea3, "y");
      label("GRAPHICS / PCI EXPRESS", 1.3, [0, 0.01, d / 2 + 0.026]);
      return true;
    }
    case "hdd": {
      box(g, p.size, [0, 0, 0], 0x33383c, 0.6);
      box(g, [w * 0.97, 0.026, d * 0.97], [0, h / 2, 0], 0xb9bdc0, 0.8);
      const platter = cylinder(
        g,
        0.36,
        0.008,
        [0, h / 2 + 0.018, 0.2],
        0xa2a8ac,
        "y",
      );
      platter.material.roughness = 0.29;
      box(g, [w * 0.56, 0.004, d * 0.39], [0, h / 2 + 0.018, -0.3], 0xe2e1d8);
      label(
        "SATA HDD / 3.5",
        0.47,
        [0, h / 2 + 0.022, -0.3],
        [-Math.PI / 2, 0, 0],
      );
      for (const x of [-w * 0.43, w * 0.43])
        for (const z of [-d * 0.43, 0, d * 0.43])
          cylinder(g, 0.023, 0.014, [x, h / 2 + 0.025, z], 0x646e72, "y");
      box(g, [w * 0.72, 0.018, d * 0.32], [0, -h / 2 - 0.012, -0.39], 0x31533d);
      box(g, [0.38, 0.1, 0.045], [-0.14, -0.025, -d / 2 - 0.012], black);
      box(g, [0.17, 0.1, 0.045], [0.23, -0.025, -d / 2 - 0.012], black);
      for (let i = 0; i < 22; i++)
        box(
          g,
          [0.012, 0.035, 0.009],
          [-0.31 + i * 0.026, -0.025, -d / 2 - 0.04],
          gold,
        );
      return true;
    }
    case "connector": {
      if (p.id === "sata") {
        for (const y of [-h * 0.26, h * 0.26]) {
          box(g, [w, h * 0.44, d], [0, y, 0], black);
          box(g, [0.006, h * 0.25, d * 0.75], [w / 2 + 0.003, y, 0], 0x0c1111);
          box(
            g,
            [0.008, 0.015, d * 0.6],
            [w / 2 + 0.008, y - 0.01, 0],
            0x69726c,
          );
          box(
            g,
            [0.008, 0.035, 0.015],
            [w / 2 + 0.008, y + 0.003, -d * 0.3],
            0x69726c,
          );
          for (let i = 0; i < 7; i++)
            box(
              g,
              [0.009, 0.01, 0.008],
              [w / 2 + 0.012, y - 0.001, -d * 0.24 + i * d * 0.08],
              gold,
            );
        }
        return true;
      }
      box(g, p.size, [0, 0, 0], black);
      const columns = p.id === "atx" ? 2 : p.id === "eps" ? 4 : 2,
        rows = p.id === "atx" ? 12 : 2;
      for (let x = 0; x < columns; x++)
        for (let y = 0; y < rows; y++) {
          const px = -w * 0.4 + ((x + 0.5) * w * 0.8) / columns,
            py = -h * 0.43 + ((y + 0.5) * h * 0.86) / rows;
          box(
            g,
            [(w * 0.64) / columns, (h * 0.64) / rows, 0.004],
            [px, py, d / 2 + 0.003],
            0x080c0b,
          );
          box(
            g,
            [(w * 0.2) / columns, (h * 0.22) / rows, 0.005],
            [px, py, d / 2 + 0.006],
            gold,
          );
        }
      box(g, [0.034, h * 0.25, 0.04], [w / 2 + 0.012, 0, d * 0.17], 0x4c5351);
      return true;
    }
    case "vrm": {
      for (let i = 0; i < 5; i++) {
        const y = -h / 2 + 0.12 + i * 0.22;
        box(g, [w * 0.64, 0.16, 0.18], [-0.015, y, -0.03], 0x62696c, 0.45);
        box(g, [0.06, 0.12, 0.035], [-w * 0.46, y, -0.12], black);
        cylinder(g, 0.032, 0.16, [w * 0.42, y, -0.035], 0xb0b6b8);
        cylinder(g, 0.027, 0.008, [w * 0.42, y, 0.05], 0x737d7f);
        label("R22", 0.095, [-0.015, y, 0.064]);
      }
      return true;
    }
    case "slot": {
      box(g, p.size, [0, 0, 0], 0x424846);
      box(g, [w * 0.91, h * 0.4, 0.01], [0, 0, d / 2 + 0.005], 0x101615);
      for (let i = 0; i < 70; i++)
        box(
          g,
          [0.009, 0.024, 0.003],
          [-w * 0.44 + i * w * 0.0127, h * 0.25, d / 2 + 0.01],
          gold,
        );
      box(g, [0.1, h * 1.4, d * 0.7], [w / 2 + 0.03, 0, d * 0.3], 0xc3c7c3);
      return true;
    }
    case "ports":
    case "network": {
      box(g, p.size, [0, 0, 0], metal, 0.8);
      const count = p.id === "usb" ? 4 : p.id === "display" ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const py = p.id === "usb" ? -h * 0.36 + i * h * 0.24 : 0,
          pz = p.id === "display" ? -d * 0.31 + i * d * 0.31 : 0;
        const ph = p.id === "usb" ? h * 0.17 : h * 0.7,
          pd = p.id === "display" ? d * 0.24 : d * 0.77;
        box(g, [0.008, ph, pd], [-w / 2 - 0.006, py, pz], 0x10191c);
        if (p.id === "usb")
          box(
            g,
            [0.009, ph * 0.28, pd * 0.8],
            [-w / 2 - 0.012, py, pz],
            0x356895,
          );
        for (let j = 0; j < (p.kind === "network" ? 8 : 4); j++)
          box(
            g,
            [0.009, 0.014, pd * 0.035],
            [
              -w / 2 - 0.012,
              py - ph * 0.25,
              pz - pd * 0.34 + (j * pd * 0.68) / (p.kind === "network" ? 7 : 3),
            ],
            gold,
          );
        if (p.kind === "network")
          for (const z of [-pd * 0.5, pd * 0.5])
            box(
              g,
              [0.012, 0.035, 0.03],
              [-w / 2 - 0.015, ph * 0.53, z],
              z < 0 ? 0x426c3d : 0xad8241,
            );
      }
      return true;
    }
    case "battery": {
      cylinder(g, w * 0.57, d, [0, 0, -0.015], black);
      cylinder(g, w * 0.5, d, [0, 0, 0.012], 0xc4c7c9);
      box(g, [w * 0.85, 0.035, 0.01], [0, -h * 0.25, d / 2 + 0.02], metal);
      label("CR2032", w * 0.7, [0, 0.05, d / 2 + 0.023]);
      label("+ 3V", w * 0.5, [0, -0.035, d / 2 + 0.023]);
      return true;
    }
    case "chip": {
      box(g, p.size, [0, 0, 0], black);
      for (const y of [-h / 2 - 0.012, h / 2 + 0.012])
        for (let i = 0; i < 4; i++)
          box(
            g,
            [0.027, 0.04, 0.015],
            [-w * 0.35 + i * w * 0.23, y, -d * 0.2],
            metal,
          );
      label("UEFI", w * 0.7, [0, 0, d / 2 + 0.003]);
      return true;
    }
    default:
      return false;
  }
}
