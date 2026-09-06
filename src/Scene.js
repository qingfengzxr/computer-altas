import * as THREE from "three";
import { translate } from "./i18n";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { parts, byId, flowInfo } from "./data";
import { layoutInventory } from "./inventoryLayout";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { hasMainPower, flowSegments } from "./simulation";

const colors = {
  pcb: 0x245950,
  black: 0x242a2e,
  metal: 0x9eafb5,
  gold: 0xd7b969,
};
export function createScene(host, onSelect, onReady, onAction = () => {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#202728");
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "可旋转和点选的台式电脑三维模型",
  );
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(7.5, 5.1, 10.5);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minDistance = 5;
  controls.maxDistance = 40;
  controls.target.set(0, 0.25, 0.5);
  controls.maxPolarAngle = Math.PI * 0.9;
  scene.add(new THREE.HemisphereLight(0xe7f4ff, 0x465251, 3));
  const key = new THREE.DirectionalLight(0xfff3de, 4);
  key.position.set(3, 8, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x99d5e6, 2);
  rim.position.set(-5, 2, -2);
  scene.add(rim);
  const grid = new THREE.GridHelper(24, 48, 0x52605d, 0x36423f);
  grid.position.y = -3.43;
  grid.material.transparent = true;
  grid.material.opacity = 0.36;
  scene.add(grid);
  const groups = {};
  const fans = [];
  const clickMeshes = [];
  const indicators = [];
  let rocker;
  const labels = {};
  const inventory = {};
  const assembledLabels = new Set([
    "cpu",
    "gpu",
    "ram1",
    "psu",
    "ssd",
    "board",
  ]);
  const inventoryViewDirection = new THREE.Vector3(7.5, 4.85, 10).normalize();
  const frontDirection = new THREE.Vector3(0, 0, 1);
  const identity = new THREE.Quaternion();
  let inventoryPositions = new Map();
  let width = 0,
    height = 0;
  function flattenAmount() {
    return THREE.MathUtils.smoothstep(state.explosion, 0.35, 1);
  }
  function mat(color, metalness = 0.25, roughness = 0.46) {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    return m;
  }
  function mergeStaticMeshes(group) {
    const batches = new Map();
    for (const mesh of group.children) {
      if (
        !mesh.isMesh ||
        mesh.material.map ||
        mesh.material.transparent ||
        mesh.userData.action ||
        mesh.userData.indicator
      )
        continue;
      const material = mesh.material;
      const key = [
        material.color.getHex(),
        material.metalness,
        material.roughness,
      ].join(":");
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(mesh);
    }
    for (const meshes of batches.values()) {
      if (meshes.length < 2) continue;
      const copies = meshes.map((mesh) => {
        mesh.updateMatrix();
        return mesh.geometry.clone().applyMatrix4(mesh.matrix);
      });
      const geometry = mergeGeometries(copies);
      copies.forEach((copy) => copy.dispose());
      if (!geometry) continue;
      const material = meshes[0].material;
      for (const mesh of meshes) {
        group.remove(mesh);
        mesh.geometry.dispose();
        if (mesh.material !== material) mesh.material.dispose();
      }
      group.add(new THREE.Mesh(geometry, material));
    }
  }
  function indicator(group, size, position, type) {
    const mesh = box(group, size, position, 0x17211b);
    mesh.userData.indicator = type;
    indicators.push(mesh);
    return mesh;
  }
  function box(group, size, pos, color, metal = 0.25) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      mat(color, metal),
    );
    mesh.position.set(...pos);
    group.add(mesh);
    return mesh;
  }
  function cylinder(group, r, d, pos, color, axis = "z") {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, d, 32),
      mat(color, 0.65),
    );
    if (axis === "z") mesh.rotation.x = Math.PI / 2;
    if (axis === "x") mesh.rotation.z = Math.PI / 2;
    mesh.position.set(...pos);
    group.add(mesh);
    return mesh;
  }
  function fan(group, r, axis = "z") {
    const spin = new THREE.Group();
    group.add(spin);
    if (axis === "x") spin.rotation.y = Math.PI / 2;
    if (axis === "y") spin.rotation.x = -Math.PI / 2;
    cylinder(spin, r * 0.21, 0.12, [0, 0, 0], 0xa5b2b4);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r * 0.93, 0.035, 8, 48),
      mat(0x889797),
    );
    spin.add(ring);
    const rotor = new THREE.Group();
    spin.add(rotor);
    for (let i = 0; i < 9; i++) {
      const a = (i * Math.PI * 2) / 9;
      const blade = box(
        rotor,
        [r * 0.46, r * 0.7, 0.034],
        [Math.sin(a) * r * 0.53, Math.cos(a) * r * 0.53, 0],
        0x4b5e5d,
      );
      blade.rotation.z = -a + 0.5;
    }
    fans.push(rotor);
    mergeStaticMeshes(rotor);
  }
  function textLabel(text, w = 1.3, compact = false) {
    const canvas = document.createElement("canvas");
    canvas.width = compact ? 96 : 384;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#e8eeee";
    ctx.font = compact ? "700 64px sans-serif" : "600 30px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, canvas.width / 2, compact ? 72 : 57);
    const texture = new THREE.CanvasTexture(canvas);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, compact ? w : w / 4),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      }),
    );
    return mesh;
  }
  parts.forEach((p) => {
    const g = new THREE.Group();
    g.userData.id = p.id;
    g.position.set(...p.pos);
    scene.add(g);
    groups[p.id] = g;
    const [w, h, d] = p.size;
    switch (p.kind) {
      case "board": {
        box(g, p.size, [0, 0, 0], colors.pcb);
        for (let i = 0; i < 34; i++) {
          const x = -1.15 + (i % 12) * 0.205,
            y = -1.5 + Math.floor(i / 12) * 1.1;
          box(
            g,
            [0.012, 0.65, 0.008],
            [x, y, 0.064],
            i % 3 ? 0x397369 : 0xb59c58,
          );
          box(g, [0.12, 0.06, 0.065], [x, y - 0.31, 0.09], colors.black);
        }
        for (const x of [-1.17, 1.17])
          for (const y of [-1.58, 1.58])
            cylinder(g, 0.053, 0.025, [x, y, 0.075], colors.gold);
        const t = textLabel("ATLAS / ATX", 1);
        t.position.set(-0.5, -1.45, 0.07);
        g.add(t);
        indicator(g, [0.09, 0.065, 0.04], [1.1, -1.46, 0.1], "standby");
        break;
      }
      case "cpu": {
        box(g, p.size, [0, 0, 0], 0x8eaaa2);
        box(g, [w * 0.87, h * 0.87, d * 0.6], [0, 0, d * 0.65], 0xd5dcda, 0.8);
        const t = textLabel("CPU", 0.5);
        t.position.set(0, 0, 0.105);
        g.add(t);
        break;
      }
      case "socket":
        box(g, p.size, [0, 0, 0], 0x4c5352);
        box(g, [w * 0.8, h * 0.8, 0.02], [0, 0, 0.08], 0x8f968a);
        break;
      case "cooler":
        box(g, [0.7, 0.7, 0.08], [0, 0, -d / 2], 0xb39776, 0.8);
        for (let i = 0; i < 17; i++)
          box(g, [w, 0.027, d], [0, -h / 2 + (i * h) / 16, 0], 0xa8b6b7, 0.8);
        for (const x of [-0.27, 0.27])
          cylinder(g, 0.065, h, [x, 0, 0], 0xc79262, "y");
        break;
      case "fan":
        for (const x of [-w * 0.46, w * 0.46])
          box(g, [w * 0.08, h, d], [x, 0, 0], colors.black);
        for (const y of [-h * 0.46, h * 0.46])
          box(g, [w, h * 0.08, d], [0, y, 0], colors.black);
        fan(g, w * 0.46);
        break;
      case "sideFan":
        for (const y of [-h * 0.46, h * 0.46])
          box(g, [w, h * 0.08, d], [0, y, 0], colors.black);
        for (const z of [-d * 0.46, d * 0.46])
          box(g, [w, h, d * 0.08], [0, 0, z], colors.black);
        fan(g, h * 0.46, "x");
        break;
      case "gpuFan":
        fan(g, w * 0.49, "y");
        break;
      case "ram": {
        box(g, p.size, [0, 0, 0], 0x2d6e60);
        box(g, [w * 1.1, h * 0.9, 0.09], [0, 0, d * 0.5], 0xa5bcc0);
        for (let i = 0; i < 6; i++)
          box(
            g,
            [0.023, 0.17, 0.24],
            [w * 0.57, -0.63 + i * 0.25, 0],
            colors.black,
          );
        break;
      }
      case "gpu": {
        box(g, p.size, [0, 0, 0], 0x283836);
        box(g, [w, 0.045, d], [0, h / 2 + 0.015, 0], 0x6d8180, 0.7);
        for (let i = 0; i < 26; i++)
          box(
            g,
            [0.032, 0.22, d * 0.8],
            [-w / 2 + 0.1 + (i * (w - 0.2)) / 26, 0, 0],
            0x9aabaa,
            0.8,
          );
        box(g, [w, 0.2, 0.065], [0, 0, d / 2], 0x323b3d);
        const t = textLabel("GRAPHICS", 1.3);
        t.position.set(0, 0, d / 2 + 0.038);
        g.add(t);
        break;
      }
      case "psu": {
        box(g, p.size, [0, 0, 0], 0x333e40);
        for (let i = 0; i < 11; i++)
          box(
            g,
            [w * 0.68, 0.028, 0.02],
            [0, -0.28 + i * 0.05, d / 2 + 0.01],
            0x667471,
          );
        const t = textLabel("POWER / ATX", 1.18);
        t.position.set(0, 0.18, d / 2 + 0.022);
        g.add(t);
        box(g, [0.04, 0.32, 0.46], [-w / 2 - 0.025, -0.12, -0.38], 0x121818);
        for (const [y, z] of [
          [-0.06, -0.49],
          [-0.06, -0.27],
          [-0.21, -0.38],
        ])
          box(g, [0.035, 0.035, 0.075], [-w / 2 - 0.055, y, z], 0xa7b4ad);
        box(g, [0.045, 0.32, 0.3], [-w / 2 - 0.025, 0.13, 0.36], 0x111817);
        rocker = new THREE.Group();
        rocker.position.set(-w / 2 - 0.065, 0.13, 0.36);
        g.add(rocker);
        const lever = box(rocker, [0.045, 0.25, 0.24], [0, 0, 0], 0x768780);
        lever.userData.action = "toggleAc";
        for (const [text, y] of [
          ["I", 0.065],
          ["0", -0.065],
        ]) {
          const label = textLabel(text, 0.1, true);
          label.rotation.y = -Math.PI / 2;
          label.position.set(-0.028, y, 0);
          label.userData.action = "toggleAc";
          rocker.add(label);
        }
        break;
      }
      case "hdd":
        box(g, p.size, [0, 0, 0], 0x7e9093, 0.8);
        box(g, [w * 0.78, h * 0.72, 0.02], [0, 0, d / 2 + 0.01], 0xc6d0cb);
        break;
      case "ssd":
        box(g, p.size, [0, 0, 0], 0x27624f);
        for (let i = 0; i < 3; i++)
          box(g, [0.24, 0.23, 0.04], [-0.34 + i * 0.32, 0, 0.06], 0x252c2d);
        break;
      case "chipset":
        box(g, p.size, [0, 0, 0], 0x6b8581);
        for (let i = 0; i < 6; i++)
          box(g, [w, 0.025, 0.04], [0, -0.24 + i * 0.085, 0.1], 0xadc0b7);
        break;
      case "vrm":
        for (let i = 0; i < 5; i++)
          box(g, [w, 0.16, d], [0, -h / 2 + 0.1 + i * 0.22, 0], 0x849a97);
        break;
      case "battery":
        cylinder(g, w / 2, d, [0, 0, 0], 0xcbd4cd);
        break;
      case "ports":
      case "network":
        box(g, p.size, [0, 0, 0], 0xa0aca8);
        box(
          g,
          [0.03, h * 0.64, d * 0.75],
          [-w / 2 - 0.005, 0, 0],
          p.kind === "network" ? 0x1f332a : 0x243f59,
        );
        break;
      case "connector":
        box(g, p.size, [0, 0, 0], 0x303533);
        for (let i = 0; i < 4; i++)
          box(
            g,
            [w * 0.5, h * 0.1, 0.025],
            [0, -h * 0.34 + i * h * 0.23, d / 2 + 0.01],
            colors.gold,
          );
        break;
      case "button":
        box(g, p.size, [0, 0, 0], 0xb4c9c3).userData.action = "pressCase";
        indicator(
          g,
          [w * 0.38, 0.025, d * 0.3],
          [0, h / 2 + 0.017, 0],
          "power",
        ).userData.action = "pressCase";
        break;
      case "case": {
        for (const x of [-w / 2, w / 2])
          for (const z of [-d / 2, d / 2])
            box(g, [0.065, h, 0.065], [x, 0, z], 0x8b9b9c, 0.75);
        for (const y of [-h / 2, h / 2]) {
          for (const z of [-d / 2, d / 2])
            box(g, [w, 0.065, 0.065], [0, y, z], 0x8b9b9c, 0.75);
          for (const x of [-w / 2, w / 2])
            box(g, [0.065, 0.065, d], [x, y, 0], 0x8b9b9c, 0.75);
        }
        box(g, [w, 0.09, d], [0, -h / 2, 0], 0x596867);
        box(g, [w, h, 0.025], [0, 0, -d / 2], 0x4b5c58);
        break;
      }
      case "panel": {
        const m = box(g, p.size, [0, 0, 0], 0x9bbabd);
        m.material.transparent = true;
        m.material.opacity = 0.13;
        m.material.depthWrite = false;
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(m.geometry),
          new THREE.LineBasicMaterial({ color: 0x88b6bb }),
        );
        g.add(edges);
        break;
      }
      default:
        box(g, p.size, [0, 0, 0], colors.black);
    }
    mergeStaticMeshes(g);
    g.traverse((o) => {
      if (o.isMesh) {
        o.userData.partId = p.id;
        clickMeshes.push(o);
        o.userData.baseEmissive = o.material.emissive?.clone();
      }
    });
  });
  parts.forEach((p) => {
    const group = groups[p.id];
    const rotation = new THREE.Euler();
    if (["gpu", "gpuFan", "hdd"].includes(p.kind)) rotation.x = Math.PI / 2;
    if (["ram", "sideFan"].includes(p.kind)) rotation.y = -Math.PI / 2;
    if (["case", "cooler"].includes(p.kind)) rotation.set(0.12, -0.28, 0);
    if (p.kind === "psu") rotation.set(0.12, 1.2, 0);
    if (p.kind === "ports" || p.kind === "network") rotation.y = Math.PI / 2;
    const quaternion = new THREE.Quaternion().setFromEuler(rotation);
    group.position.set(0, 0, 0);
    group.quaternion.copy(quaternion);
    const bounds = new THREE.Box3().setFromObject(group);
    inventory[p.id] = {
      quaternion,
      center: bounds.getCenter(new THREE.Vector3()),
      size: bounds.getSize(new THREE.Vector3()),
    };
    group.position.set(...p.pos);
    group.quaternion.identity();
  });
  const outline = new THREE.Box3Helper(new THREE.Box3(), 0xf2d269);
  scene.add(outline);
  const relatedOutlines = [];
  let flowGroup = new THREE.Group();
  scene.add(flowGroup);
  let curves = [],
    particles = [];
  let state = {
    selected: "cpu",
    explosion: 0.23,
    visible: ["compute", "storage", "power", "cooling", "io", "structure"],
    panel: false,
    related: false,
    flow: "none",
    playing: false,
    auto: false,
    labels: true,
    device: "running",
    phase: 0,
    runId: 0,
    reducedMotion: false,
    language: "en",
  };
  const labelLayer = document.createElement("div");
  labelLayer.className = "scene-labels";
  host.appendChild(labelLayer);
  parts.forEach(({ id, name }) => {
    const b = document.createElement("button");
    b.className = "part-label";
    b.setAttribute("aria-label", name);
    const caption = document.createElement("span");
    caption.className = "label-name";
    caption.textContent =
      id === "cpu"
        ? "CPU · 中央处理器"
        : id === "gpu"
          ? "GPU · 显卡"
          : byId[id].name;
    b.appendChild(caption);
    b.addEventListener("click", () => onSelect(id));
    labelLayer.appendChild(b);
    labels[id] = b;
  });
  function pos(id) {
    const air = {
      outsideIn: ["intake", [1, 0, 0]],
      intakeAir: ["intake", [-0.25, 0, 0]],
      warmAir: ["cooler", [0, 0, 0.7]],
      exhaustAir: ["exhaust", [0.2, 0, 0]],
      outsideOut: ["exhaust", [-0.9, 0, 0]],
    };
    if (air[id]) {
      const [part, offset] = air[id];
      return groups[part].localToWorld(new THREE.Vector3(...offset));
    }
    return groups[id].getWorldPosition(new THREE.Vector3());
  }
  function clearFlow() {
    flowGroup.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) o.material.dispose();
    });
    scene.remove(flowGroup);
    flowGroup = new THREE.Group();
    scene.add(flowGroup);
    curves = [];
    particles = [];
  }
  function buildFlow() {
    clearFlow();
    const visibleIds = parts
      .filter((p) => groups[p.id].visible)
      .map((p) => p.id);
    const segments = flowSegments(
      state.flow,
      state.phase,
      state.device,
      visibleIds,
    );
    segments.forEach(({ from, to, color }, index) => {
      const start = pos(from),
        end = pos(to),
        middle = start.clone().lerp(end, 0.5);
      middle.z += 0.8;
      const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
      curves.push(curve);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(35)),
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.68,
          depthTest: false,
        }),
      );
      line.renderOrder = 10;
      flowGroup.add(line);
      const direction = curve.getTangent(0.6).normalize();
      const arrow = new THREE.ArrowHelper(
        direction,
        curve.getPoint(0.6),
        0.3,
        color,
        0.14,
        0.075,
      );
      arrow.traverse((object) => {
        if (object.material) {
          object.material.depthTest = false;
          object.renderOrder = 11;
        }
      });
      flowGroup.add(arrow);
      for (let j = 0; j < 3; j++) {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.052, 8, 8),
          new THREE.MeshBasicMaterial({ color, depthTest: false }),
        );
        dot.renderOrder = 12;
        flowGroup.add(dot);
        particles.push({ dot, curve, offset: j / 3 + index * 0.09, from, to });
      }
    });
  }
  function update(next, forceLayout = false) {
    const old = state;
    state = { ...state, ...next };
    const layoutChanged =
      forceLayout ||
      old.explosion !== state.explosion ||
      old.panel !== state.panel ||
      old.visible !== state.visible;
    if (old.explosion <= 0.35 && state.explosion > 0.35) {
      inventoryViewDirection
        .copy(camera.position)
        .sub(controls.target)
        .normalize();
    }
    if (
      forceLayout ||
      old.panel !== state.panel ||
      old.visible !== state.visible ||
      !inventoryPositions.size
    )
      rebuildInventory();
    const blend = flattenAmount();
    const flat = state.explosion === 1;
    renderer.domElement.setAttribute(
      "aria-label",
      translate("可旋转和点选的台式电脑三维模型", state.language),
    );
    for (const p of parts) {
      const label = labels[p.id];
      label.setAttribute("aria-label", translate(p.name, state.language));
      const caption =
        p.id === "cpu"
          ? "CPU · 中央处理器"
          : p.id === "gpu"
            ? "GPU · 显卡"
            : p.name;
      label.firstChild.textContent = translate(caption, state.language);
    }
    parts.forEach((p) => {
      const g = groups[p.id];
      g.visible =
        state.visible.includes(p.system) && (p.id !== "panel" || state.panel);
      g.position
        .set(...p.pos)
        .addScaledVector(new THREE.Vector3(...p.explode), state.explosion);
      const destination = inventoryPositions.get(p.id);
      if (destination) {
        const target = new THREE.Vector3(...destination).sub(
          inventory[p.id].center,
        );
        g.position.lerp(target, blend);
      }
      g.quaternion.copy(identity).slerp(inventory[p.id].quaternion, blend);
      g.traverse((o) => {
        if (o.isMesh && o.material.emissive && !o.userData.indicator) {
          o.material.emissive.set(
            p.id === state.selected
              ? 0x6b5017
              : state.related && byId[state.selected].related.includes(p.id)
                ? 0x14584a
                : 0x000000,
          );
          o.material.emissiveIntensity = p.id === state.selected ? 0.55 : 0.4;
        }
      });
    });
    for (const o of relatedOutlines) {
      scene.remove(o);
      o.geometry.dispose();
      o.material.dispose();
    }
    relatedOutlines.length = 0;
    if (state.related)
      byId[state.selected].related.forEach((id) => {
        if (!groups[id].visible) return;
        const h = new THREE.Box3Helper(
          new THREE.Box3().setFromObject(groups[id]).expandByScalar(0.035),
          0x69bda7,
        );
        scene.add(h);
        relatedOutlines.push(h);
      });
    outline.box.setFromObject(groups[state.selected]).expandByScalar(0.055);
    outline.visible = groups[state.selected].visible;
    if (
      old.flow !== state.flow ||
      old.phase !== state.phase ||
      old.runId !== state.runId
    )
      time = 0;
    if (
      old.flow !== state.flow ||
      old.phase !== state.phase ||
      old.device !== state.device ||
      layoutChanged
    )
      buildFlow();
    if (rocker) rocker.rotation.z = state.device === "off" ? 0.23 : -0.23;
    for (const lamp of indicators) {
      const on =
        lamp.userData.indicator === "standby"
          ? state.device !== "off"
          : hasMainPower(state.device);
      const color = lamp.userData.indicator === "standby" ? 0xe9b951 : 0x79ddab;
      lamp.material.color.set(on ? color : 0x17211b);
      lamp.material.emissive.set(on ? color : 0x000000);
      lamp.material.emissiveIntensity = on ? 1.2 : 0;
    }
    controls.autoRotate = state.auto && !flat && !state.reducedMotion;
    if (layoutChanged) fitView();
    controls.enableRotate = !flat;
    controls.mouseButtons.LEFT = flat ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    controls.touches.ONE = flat ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    controls.autoRotateSpeed = 0.6;
    grid.visible = !flat;
    labelLayer.style.display = state.labels ? "" : "none";
    invalidate();
  }
  function rebuildInventory() {
    const entries = parts
      .filter(
        (p) =>
          state.visible.includes(p.system) && (p.id !== "panel" || state.panel),
      )
      .map((p) => ({
        id: p.id,
        width: inventory[p.id].size.x,
        height: inventory[p.id].size.y,
      }));
    inventoryPositions = layoutInventory(
      entries,
      Math.max(width - 70, 100) / Math.max(height - 240, 100),
    );
  }
  function fitView() {
    if (!width || !height) return;
    const bounds = new THREE.Box3();
    for (const p of parts) {
      if (groups[p.id].visible)
        bounds.union(new THREE.Box3().setFromObject(groups[p.id]));
    }
    if (bounds.isEmpty()) return;
    if (state.explosion === 1) bounds.min.y -= 0.4;
    const blend = flattenAmount();
    const direction =
      blend > 0
        ? inventoryViewDirection.clone().lerp(frontDirection, blend).normalize()
        : camera.position.clone().sub(controls.target).normalize();
    bounds.getCenter(controls.target);
    const corners = [];
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z])
          corners.push(new THREE.Vector3(x, y, z));
    const top = 90,
      bottom = 150,
      left = 18,
      right = 52;
    // Shift the optical center into the area above the teaching controls.
    camera.setViewOffset(
      width,
      height,
      (right - left) / 2,
      (bottom - top) / 2,
      width,
      height,
    );
    for (let distance = 7; distance <= 100; distance *= 1.04) {
      camera.position
        .copy(controls.target)
        .addScaledVector(direction, distance);
      camera.lookAt(controls.target);
      camera.updateMatrixWorld();
      const fits = corners.every((corner) => {
        const p = corner.clone().project(camera);
        const x = ((p.x + 1) * width) / 2,
          y = ((1 - p.y) * height) / 2;
        return (
          p.z < 1 &&
          x >= left &&
          x <= width - right &&
          y >= top &&
          y <= height - bottom
        );
      });
      if (fits) break;
    }
    controls.maxDistance = Math.max(
      40,
      camera.position.distanceTo(controls.target) * 2,
    );
    controls.update();
  }
  const observer = new ResizeObserver(() => {
    width = host.clientWidth;
    height = host.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    update({}, true);
  });
  observer.observe(host);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down = null;
  function pointerDown(e) {
    down = [e.clientX, e.clientY];
  }
  function pointerUp(e) {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5)
      return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(
      clickMeshes.filter((m) => groups[m.userData.partId].visible),
      false,
    );
    if (hits.length) {
      onSelect(hits[0].object.userData.partId);
      if (hits[0].object.userData.action)
        onAction(hits[0].object.userData.action);
    }
    down = null;
  }
  renderer.domElement.addEventListener("pointerdown", pointerDown);
  renderer.domElement.addEventListener("pointerup", pointerUp);
  let frame = 0,
    last = performance.now(),
    time = 0;
  const projected = new THREE.Vector3();
  let disposed = false;
  function invalidate() {
    if (!disposed && !frame && !document.hidden)
      frame = requestAnimationFrame(animate);
  }
  function shown(object) {
    for (let node = object; node; node = node.parent)
      if (!node.visible) return false;
    return true;
  }
  const labelObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const element = entry.target;
      if (
        !element.classList.contains("inventory-label") &&
        entry.borderBoxSize?.[0]?.inlineSize
      )
        element.dataset.measuredWidth = entry.borderBoxSize[0].inlineSize;
    }
    invalidate();
  });
  Object.values(labels).forEach((label) => labelObserver.observe(label));
  controls.addEventListener("change", invalidate);
  const visibilityChange = () => {
    last = performance.now();
    invalidate();
  };
  document.addEventListener("visibilitychange", visibilityChange);
  function animate(now) {
    if (disposed) return;
    frame = 0;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const moving = state.playing && !state.reducedMotion;
    const activeFans =
      moving && hasMainPower(state.device) ? fans.filter(shown) : [];
    if (moving) time += dt;
    activeFans.forEach((f) => (f.rotation.z -= dt * 4));
    for (const { dot, curve, offset } of particles) {
      dot.visible = !state.reducedMotion;
      dot.position.copy(curve.getPoint((time * 0.3 + offset) % 1));
    }
    flowGroup.visible = state.flow !== "none";
    controls.update();
    const occupied = [];
    Object.entries(labels)
      .sort(
        ([a], [b]) =>
          Number(b === state.selected) - Number(a === state.selected),
      )
      .forEach(([id, el]) => {
        const flat = state.explosion === 1;
        el.classList.toggle("inventory-label", flat);
        projected.copy(groups[id].position);
        if (flat) {
          projected.add(inventory[id].center);
          projected.y -= inventory[id].size.y / 2 + 0.18;
        } else {
          projected.y += byId[id].size[1] / 2 + 0.22;
        }
        projected.project(camera);
        const x = (projected.x * 0.5 + 0.5) * width,
          y = (-projected.y * 0.5 + 0.5) * height;
        const labelWidth = flat ? 18 : Number(el.dataset.measuredWidth) || 100;
        const rect = {
          left: x - labelWidth / 2 - 3,
          right: x + labelWidth / 2 + 3,
          top: y - 14,
          bottom: y + 14,
        };
        const overlaps = occupied.some(
          (r) =>
            rect.left < r.right &&
            rect.right > r.left &&
            rect.top < r.bottom &&
            rect.bottom > r.top,
        );
        const shown =
          groups[id].visible &&
          (flat || assembledLabels.has(id)) &&
          (flat || !overlaps) &&
          projected.z < 1 &&
          x > (flat ? 10 : 60) &&
          x < width - (flat ? 10 : 65) &&
          y > 75 &&
          y < height - (flat ? 145 : 155);
        el.style.display = shown ? "" : "none";
        if (shown) occupied.push(rect);
        el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
        el.classList.toggle("selected", id === state.selected);
        el.setAttribute("aria-pressed", String(id === state.selected));
      });
    renderer.render(scene, camera);
    if (
      controls.autoRotate ||
      activeFans.length ||
      (moving && particles.length)
    )
      invalidate();
  }
  update({});
  onReady();
  return {
    update,
    reset() {
      camera.position.set(7.5, 5.1, 10.5);
      controls.target.set(0, 0.25, 0.5);
      inventoryViewDirection
        .copy(camera.position)
        .sub(controls.target)
        .normalize();
      fitView();
    },
    zoom(direction) {
      const offset = camera.position.clone().sub(controls.target);
      const length = THREE.MathUtils.clamp(
        offset.length() * direction,
        controls.minDistance,
        controls.maxDistance,
      );
      camera.position.copy(controls.target).add(offset.setLength(length));
      controls.update();
    },
    focus(id) {
      const target = groups[id].position;
      const delta = target.clone().sub(controls.target);
      controls.target.copy(target);
      camera.position.add(delta);
      controls.update();
    },
    inspectPower() {
      if (state.explosion === 1) {
        const delta = groups.psu.position.clone().sub(controls.target);
        controls.target.copy(groups.psu.position);
        camera.position.add(delta);
      } else {
        controls.target.copy(groups.psu.position);
        camera.position
          .copy(controls.target)
          .add(new THREE.Vector3(-5, 1.8, 2.5));
      }
      controls.update();
      invalidate();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      labelObserver.disconnect();
      controls.removeEventListener("change", invalidate);
      document.removeEventListener("visibilitychange", visibilityChange);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => {
            m.map?.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      labelLayer.remove();
    },
  };
}
