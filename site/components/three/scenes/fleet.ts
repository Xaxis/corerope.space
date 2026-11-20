// The split mind and the two-tier fleet. Tasks arrive as particles. A small wired core (Tier A)
// reasons; beneath it a vast memory tier answers lookups. A router sends the hard few to a larger
// wired core (Tier B), and the very last to GPUs, which glow with the share of all energy they burn.
//   step 0: split mind: Tier A and the memory tier.   step 1: the fleet: router, Tier A, Tier B.
//   step 2: the GPU fallback. state.param: the share of tasks on GPUs. state.param2: their share
//   of the fleet's energy (the page works it out from the cost model).
import {
  approach,
  type BuildContext,
  type Built,
  dust,
  dynamicAttribute,
  type Frame,
  glowTexture,
  rng,
  STAGE,
  THREE,
} from "../kit";

export const bloom = { strength: 1.0, radius: 0.55, threshold: 0.52 };

const RATE = 14; // tasks per second, for the eye
const LIFE = 2.6;
const TIER_B_SHARE = 0.05;
const SPAWN_X = -6.2;
const ROUTER = new THREE.Vector3(-2.9, 0.3, 0);
const TIER_A = new THREE.Vector3(0, 0.2, 0);
const TIER_B = new THREE.Vector3(2.9, 0.3, -1.6);
const GPU = new THREE.Vector3(3.2, 0.6, 1.8);
const SLAB_Y = -1.4;

const hash = (k: number, s: number) => {
  const v = Math.sin(k * 12.9898 + s * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

function chip(size: THREE.Vector3, body: string, edge: string, glow: number) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: body, roughness: 0.32, metalness: 0.7 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), mat);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(box.geometry),
    new THREE.LineBasicMaterial({
      color: new THREE.Color(edge).multiplyScalar(glow),
      transparent: true,
    }),
  );
  const topMat = new THREE.MeshStandardMaterial({
    color: "#15120f",
    emissive: new THREE.Color(edge),
    emissiveIntensity: 0.25,
    roughness: 0.5,
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 0.82, size.z * 0.82), topMat);
  top.rotation.x = -Math.PI / 2;
  top.position.y = size.y / 2 + 0.002;
  g.add(box, edges, top);
  return { group: g, topMat, edges };
}

export function build({ small }: BuildContext): Built {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(STAGE, 9, 20);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  scene.add(new THREE.HemisphereLight("#c4b9ad", "#0b0a09", 0.55));
  const key = new THREE.DirectionalLight("#ffe4cc", 2);
  key.position.set(3, 7, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#5a8edc", 1.8);
  rim.position.set(-6, 2, -5);
  scene.add(rim);

  const a = chip(new THREE.Vector3(1.4, 0.24, 1.4), "#211d1a", "#ff6a28", 2.2);
  a.group.position.copy(TIER_A);
  scene.add(a.group);
  const b = chip(new THREE.Vector3(2.0, 0.36, 2.0), "#1a1d22", "#3d8bff", 1.8);
  b.group.position.copy(TIER_B);
  scene.add(b.group);

  // GPUs: a hot server, fins stacked, glowing with the energy they take.
  const gpu = new THREE.Group();
  const finMat = new THREE.MeshStandardMaterial({
    color: "#2a2420",
    roughness: 0.4,
    metalness: 0.7,
    emissive: new THREE.Color("#ff3d14"),
    emissiveIntensity: 0,
  });
  for (let i = 0; i < 6; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 1.15), finMat);
    fin.position.y = i * 0.17;
    gpu.add(fin);
  }
  const gpuEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.76, 1.0, 1.2)),
    new THREE.LineBasicMaterial({ color: "#f0a020", transparent: true }),
  );
  gpuEdges.position.y = 0.42;
  gpu.add(gpuEdges);
  const heat = new THREE.PointLight("#ff4a1a", 0, 5, 2);
  heat.position.set(0, 0.5, 0.9);
  gpu.add(heat);
  gpu.position.copy(GPU).add(new THREE.Vector3(0, -0.45, 0));
  scene.add(gpu);

  const ringMat = new THREE.MeshStandardMaterial({
    color: "#d8d2c8",
    emissive: "#fff1e0",
    emissiveIntensity: 0.7,
    roughness: 0.3,
    metalness: 0.4,
  });
  const router = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 16, 64), ringMat);
  router.rotation.y = Math.PI / 2;
  router.position.copy(ROUTER);
  scene.add(router);

  // The memory tier: a wide slab of NAND pages; lookups light a page and a beam up to Tier A.
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(7.6, 0.12, 4.0),
    new THREE.MeshStandardMaterial({ color: "#151412", roughness: 0.7, metalness: 0.3 }),
  );
  slab.position.y = SLAB_Y;
  scene.add(slab);
  const COLS = small ? 22 : 34;
  const ROWS = small ? 11 : 16;
  const tileGeo = new THREE.BoxGeometry(0.16, 0.03, 0.16);
  const tileMat = new THREE.MeshStandardMaterial({
    color: "#2b2723",
    roughness: 0.5,
    metalness: 0.4,
  });
  const tiles = new THREE.InstancedMesh(tileGeo, tileMat, COLS * ROWS);
  const m4 = new THREE.Matrix4();
  const tilePos: THREE.Vector3[] = [];
  for (let i = 0; i < COLS; i++) {
    for (let j = 0; j < ROWS; j++) {
      const v = new THREE.Vector3(
        -3.5 + (i / (COLS - 1)) * 7,
        SLAB_Y + 0.075,
        -1.8 + (j / (ROWS - 1)) * 3.6,
      );
      tilePos.push(v);
      m4.makeTranslation(v.x, v.y, v.z);
      tiles.setMatrixAt(i * ROWS + j, m4);
      tiles.setColorAt(i * ROWS + j, new THREE.Color("#3a342e"));
    }
  }
  scene.add(tiles);
  const BEAMS = 10;
  const beamPos = new Float32Array(BEAMS * 6);
  const beamCol = new Float32Array(BEAMS * 6);
  const beamGeo = new THREE.BufferGeometry();
  const beamPosAttr = dynamicAttribute(beamGeo, "position", beamPos);
  const beamColAttr = dynamicAttribute(beamGeo, "color", beamCol);
  const beams = new THREE.LineSegments(
    beamGeo,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(beams);

  const MAX = Math.ceil(RATE * LIFE) + 4;
  const pos = new Float32Array(MAX * 3);
  const col = new Float32Array(MAX * 3);
  const geo = new THREE.BufferGeometry();
  const posAttr = dynamicAttribute(geo, "position", pos);
  const colAttr = dynamicAttribute(geo, "color", col);
  const tasks = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: small ? 0.28 : 0.24,
      map: glowTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(tasks);
  scene.add(dust(small ? 100 : 220, new THREE.Vector3(16, 5, 10), 41));

  const WHITE = new THREE.Color("#fff0de");
  const ORANGE = new THREE.Color("#ff7a35");
  const BLUE = new THREE.Color("#4c9bff");
  const RED = new THREE.Color("#ff3d14");
  const LOOK = new THREE.Color("#ffb070");
  const tmp = new THREE.Color();
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  const start = new THREE.Vector3();
  const rz = rng(9);
  const lanes = Array.from({ length: 64 }, () => (rz() - 0.5) * 2.4);
  const show = { router: 0, b: 0, gpu: 0, heat: 0 };
  const camPos = new THREE.Vector3(0.6, 2.6, 5.2);
  const camLook = new THREE.Vector3(0, -0.5, 0);
  const VIEWS = [
    { pos: new THREE.Vector3(-0.6, 2.4, 6.0), look: new THREE.Vector3(-0.6, -0.55, 0) },
    { pos: new THREE.Vector3(-0.2, 4.3, 8.4), look: new THREE.Vector3(0, -0.3, 0) },
    { pos: new THREE.Vector3(0.8, 4.0, 8.4), look: new THREE.Vector3(0.5, -0.2, 0.3) },
  ];

  const target = (route: number) => (route === 2 ? GPU : route === 1 ? TIER_B : TIER_A);

  return {
    scene,
    camera,
    update({ t, dt, state, pointer, fit }: Frame) {
      const step = Math.max(0, Math.min(2, Math.round(state.step)));
      show.router = approach(show.router, step >= 1 ? 1 : 0, dt, 2.5);
      show.b = approach(show.b, step >= 1 ? 1 : 0, dt, 2.5);
      show.gpu = approach(show.gpu, step >= 2 ? 1 : 0, dt, 2.5);
      const gShare = step >= 2 ? Math.max(0, Math.min(1, state.param)) : 0;
      const bShare = step >= 1 ? TIER_B_SHARE : 0;
      show.heat = approach(show.heat, step >= 2 ? state.param2 : 0, dt, 2);

      router.scale.setScalar(Math.max(0.001, show.router));
      ringMat.emissiveIntensity = 0.5 + 0.3 * Math.sin(t * 2);
      b.group.scale.setScalar(Math.max(0.001, show.b));
      gpu.scale.setScalar(Math.max(0.001, show.gpu));
      finMat.emissiveIntensity = 0.05 + show.heat * 1.6 * (0.85 + 0.15 * Math.sin(t * 9));
      heat.intensity = show.heat * 14;
      a.topMat.emissiveIntensity = 0.35 + 0.15 * Math.sin(t * 3);

      // Tasks: stateless, each by its index, so a still frame looks like a moving one.
      let n = 0;
      const k1 = Math.floor(t * RATE);
      for (let k = k1; k > k1 - MAX && n < MAX; k--) {
        const age = t - k / RATE;
        if (age < 0 || age > LIFE) continue;
        const u = hash(k, 1);
        const route = u < gShare ? 2 : u < gShare + bShare ? 1 : 0;
        start.set(SPAWN_X, 0.3, lanes[((k % 64) + 64) % 64] ?? 0);
        const dest = target(route);
        let alpha = 1;
        if (age < 1.0) {
          // In through the router (or straight to Tier A before the fleet exists).
          const s = age / 1.0;
          const mid = step >= 1 ? ROUTER : TIER_A;
          if (step >= 1) p.lerpVectors(start, mid, s);
          else p.lerpVectors(start, mid, s * 0.55);
          tmp.copy(WHITE);
          alpha = Math.min(1, age * 4);
        } else {
          const s = Math.min(1, (age - 1.0) / 1.3);
          const from = step >= 1 ? ROUTER : q.lerpVectors(start, TIER_A, 0.55);
          p.lerpVectors(from, dest, s);
          p.y += Math.sin(s * Math.PI) * 0.7;
          tmp.copy(route === 2 ? RED : route === 1 ? BLUE : ORANGE);
          if (s >= 1) alpha = Math.max(0, 1 - (age - 2.3) / 0.3);
        }
        pos[n * 3] = p.x;
        pos[n * 3 + 1] = p.y;
        pos[n * 3 + 2] = p.z;
        col[n * 3] = tmp.r * alpha;
        col[n * 3 + 1] = tmp.g * alpha;
        col[n * 3 + 2] = tmp.b * alpha;
        n++;
      }
      for (let i = n; i < MAX; i++) col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0;
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      // Lookups: a few pages light at a time, each with a beam up to the core.
      const base = new THREE.Color("#3a342e");
      const lit = Math.floor(t * 6);
      for (let i = 0; i < BEAMS; i++) {
        const slot = lit - i;
        const idx = Math.floor(hash(slot, 7) * tilePos.length);
        const from = tilePos[idx] ?? tilePos[0];
        const life = 1 - (t * 6 - slot) / BEAMS;
        const glow = Math.max(0, life) ** 2;
        if (!from) continue;
        beamPos.set(
          [
            from.x,
            from.y,
            from.z,
            TIER_A.x + (from.x - TIER_A.x) * 0.08,
            TIER_A.y - 0.12,
            TIER_A.z + (from.z - TIER_A.z) * 0.08,
          ],
          i * 6,
        );
        for (let c = 0; c < 2; c++) {
          beamCol[i * 6 + c * 3] = LOOK.r * glow * (c ? 0.5 : 1);
          beamCol[i * 6 + c * 3 + 1] = LOOK.g * glow * (c ? 0.5 : 1);
          beamCol[i * 6 + c * 3 + 2] = LOOK.b * glow * (c ? 0.5 : 1);
        }
        tiles.setColorAt(idx, tmp.copy(base).lerp(LOOK, glow * 0.9));
      }
      if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
      // Let lit tiles cool back down.
      if (Math.floor(t * 6) !== Math.floor((t - dt) * 6)) {
        const cool = Math.floor(hash(lit - BEAMS, 7) * tilePos.length);
        tiles.setColorAt(cool, base);
      }
      beamPosAttr.needsUpdate = true;
      beamColAttr.needsUpdate = true;

      const v = VIEWS[step] ?? VIEWS[0];
      if (v) {
        camPos.set(
          approach(camPos.x, v.pos.x, dt, 1.3),
          approach(camPos.y, v.pos.y, dt, 1.3),
          approach(camPos.z, v.pos.z, dt, 1.3),
        );
        camLook.set(
          approach(camLook.x, v.look.x, dt, 1.3),
          approach(camLook.y, v.look.y, dt, 1.3),
          approach(camLook.z, v.look.z, dt, 1.3),
        );
      }
      const zoom = fit;
      camera.position.set(
        (camPos.x + Math.sin(t * 0.1) * 0.3 + pointer.x * 0.6) * zoom,
        (camPos.y - pointer.y * 0.3) * zoom,
        camPos.z * zoom,
      );
      camera.lookAt(camLook);
    },
  };
}
