// A wired ternary layer. Inputs run as rails; each output row has a plus bus and a minus bus that
// end in an adder. A weight is a via: rail to plus bus (+1, copper), rail to minus bus (-1, blue),
// or nothing (0). Activations run down the rails, drop through the vias and sum in the adders. No
// weight is fetched and no multiplier exists.
//   step 0: the layer.   step 1: shared partial sums: x1 - x3 + x4 built once, tapped by three rows.
//   step 2: event-driven sparsity: zero activations hold their rails still.
import {
  approach,
  type BuildContext,
  type Built,
  dust,
  dynamicAttribute,
  type Frame,
  glowTexture,
  pulseMaterial,
  rng,
  STAGE,
  THREE,
} from "../kit";

export const bloom = { strength: 0.95, radius: 0.5, threshold: 0.5 };

const IN = 8;
const OUT = 6;
const X0 = -3.35;
const X1 = 2.75;
const Y_BUS = 0.34;
const Z_ADD = 2.55;
const SPEED = 2.3;
const GROUP = [0, 2, 3]; // x1, x3, x4
const SIGNS = [1, -1, 1];
const TAPS = [1, 3, 4];
const X_NODE = -2.95;
const Y_NODE = 0.82;

const railZ = (i: number) => (i - (IN - 1) / 2) * 0.46;
const colX = (j: number) => -2.2 + j * 0.88;
const busX = (j: number, sign: number) => colX(j) + (sign > 0 ? -0.09 : 0.09);
const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

type Path = { pts: THREE.Vector3[]; lens: number[]; total: number };
function path(pts: THREE.Vector3[]): Path {
  const lens = pts.slice(1).map((p, i) => p.distanceTo(pts[i] as THREE.Vector3));
  return { pts, lens, total: lens.reduce((a, b) => a + b, 0) };
}
function along(p: Path, s: number, out: THREE.Vector3): number {
  let rest = s;
  for (let i = 0; i < p.lens.length; i++) {
    const l = p.lens[i] ?? 0;
    if (rest <= l) {
      out.lerpVectors(
        p.pts[i] as THREE.Vector3,
        p.pts[i + 1] as THREE.Vector3,
        l === 0 ? 0 : rest / l,
      );
      return i;
    }
    rest -= l;
  }
  out.copy(p.pts[p.pts.length - 1] as THREE.Vector3);
  return p.lens.length;
}
function tube(a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material) {
  return new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 24, radius, 8, false),
    mat,
  );
}

export function build({ small }: BuildContext): Built {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(STAGE, 8, 17);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  scene.add(new THREE.HemisphereLight("#c9bfb4", "#0b0a09", 0.6));
  const key = new THREE.DirectionalLight("#ffe2c8", 1.8);
  key.position.set(3, 6, 4);
  scene.add(key);

  // The weights. 40% zeros, as in the synthesis test; the three tap rows share x1 - x3 + x4.
  const r = rng(5);
  const W: number[][] = Array.from({ length: IN }, () =>
    Array.from({ length: OUT }, () => (r() < 0.4 ? 0 : r() < 0.5 ? 1 : -1)),
  );
  TAPS.forEach((j) => {
    GROUP.forEach((i, g) => {
      const row = W[i];
      if (row) row[j] = SIGNS[g] ?? 1;
    });
  });

  const railMat = Array.from({ length: IN }, () => {
    const m = pulseMaterial("#3d3935", "#ffd9b8");
    m.uniforms.uFade.value = 0.03;
    m.uniforms.uTail.value = 9;
    return m;
  });
  railMat.forEach((m, i) => {
    scene.add(
      tube(new THREE.Vector3(X0, 0, railZ(i)), new THREE.Vector3(X1, 0, railZ(i)), 0.022, m),
    );
  });
  const plusBus = new THREE.MeshStandardMaterial({
    color: "#6b2f14",
    emissive: "#ff6a28",
    emissiveIntensity: 0.35,
    roughness: 0.5,
  });
  const minusBus = new THREE.MeshStandardMaterial({
    color: "#16294a",
    emissive: "#3d8bff",
    emissiveIntensity: 0.4,
    roughness: 0.5,
  });
  for (let j = 0; j < OUT; j++) {
    for (const s of [1, -1]) {
      scene.add(
        tube(
          new THREE.Vector3(busX(j, s), Y_BUS, railZ(0) - 0.35),
          new THREE.Vector3(busX(j, s), Y_BUS, Z_ADD - 0.12),
          0.016,
          s > 0 ? plusBus : minusBus,
        ),
      );
    }
  }

  // Vias. The ones the shared sum replaces get their own materials, to fade in step 1.
  const viaGeo = new THREE.CylinderGeometry(0.028, 0.028, Y_BUS, 10);
  const viaPlus = new THREE.MeshStandardMaterial({
    color: "#ff7a35",
    emissive: "#ff6a28",
    emissiveIntensity: 1.1,
    transparent: true,
  });
  const viaMinus = new THREE.MeshStandardMaterial({
    color: "#4c9bff",
    emissive: "#3d8bff",
    emissiveIntensity: 1.1,
    transparent: true,
  });
  const viaPlusG = viaPlus.clone();
  const viaMinusG = viaMinus.clone();
  const dotGeo = new THREE.SphereGeometry(0.045, 12, 8);
  const zeroDot = new THREE.MeshStandardMaterial({ color: "#3a3632", roughness: 0.6 });
  W.forEach((row, i) => {
    row.forEach((w, j) => {
      if (w === 0) {
        const d = new THREE.Mesh(dotGeo, zeroDot);
        d.position.set(colX(j), 0, railZ(i));
        d.scale.setScalar(0.6);
        scene.add(d);
        return;
      }
      const grouped = GROUP.includes(i) && TAPS.includes(j);
      const m = w > 0 ? (grouped ? viaPlusG : viaPlus) : grouped ? viaMinusG : viaMinus;
      const v = new THREE.Mesh(viaGeo, m);
      v.position.set(busX(j, w), Y_BUS / 2, railZ(i));
      scene.add(v);
    });
  });

  // Adders: a ring and a core per output row.
  const adders = Array.from({ length: OUT }, (_, j) => {
    const m = new THREE.MeshStandardMaterial({
      color: "#2a2623",
      emissive: new THREE.Color("#ff6a28"),
      emissiveIntensity: 0.1,
      roughness: 0.35,
      metalness: 0.5,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 12, 40), m);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(colX(j), Y_BUS, Z_ADD);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), m);
    core.position.copy(ring.position);
    scene.add(ring, core);
    return { m, value: 0 };
  });

  // The shared sum: drops from x1, x3, x4 to one node, a sum wire, and one tap per row that uses it.
  const zg = GROUP.reduce((a, i) => a + railZ(i), 0) / GROUP.length;
  const node = new THREE.Vector3(X_NODE, Y_NODE, zg);
  const groupMat = new THREE.MeshStandardMaterial({
    color: "#ffd2a8",
    emissive: "#ffb070",
    emissiveIntensity: 1.3,
    transparent: true,
    opacity: 0,
  });
  const group = new THREE.Group();
  for (const i of GROUP)
    group.add(tube(new THREE.Vector3(X_NODE, 0, railZ(i)), node, 0.016, groupMat));
  const xEnd = colX(TAPS[TAPS.length - 1] ?? 4) - 0.09;
  group.add(tube(node, new THREE.Vector3(xEnd, Y_NODE, zg), 0.02, groupMat));
  for (const j of TAPS) {
    group.add(
      tube(
        new THREE.Vector3(busX(j, 1), Y_NODE, zg),
        new THREE.Vector3(busX(j, 1), Y_BUS, zg),
        0.016,
        groupMat,
      ),
    );
  }
  const nodeMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), groupMat);
  nodeMesh.position.copy(node);
  group.add(nodeMesh);
  scene.add(group);

  // Paths the activations travel.
  const railPath = (i: number, j: number, s: number) =>
    path([
      new THREE.Vector3(X0, 0, railZ(i)),
      new THREE.Vector3(busX(j, s), 0, railZ(i)),
      new THREE.Vector3(busX(j, s), Y_BUS, railZ(i)),
      new THREE.Vector3(busX(j, s), Y_BUS, Z_ADD),
    ]);
  const paths = W.map((row, i) => row.map((w, j) => (w === 0 ? null : railPath(i, j, w))));
  const toNode = GROUP.map((i) =>
    path([
      new THREE.Vector3(X0, 0, railZ(i)),
      new THREE.Vector3(X_NODE, 0, railZ(i)),
      node.clone(),
    ]),
  );
  const fromNode = TAPS.map((j) =>
    path([
      node.clone(),
      new THREE.Vector3(busX(j, 1), Y_NODE, zg),
      new THREE.Vector3(busX(j, 1), Y_BUS, zg),
      new THREE.Vector3(busX(j, 1), Y_BUS, Z_ADD),
    ]),
  );

  const MAX = 220;
  const pos = new Float32Array(MAX * 3);
  const col = new Float32Array(MAX * 3);
  const geo = new THREE.BufferGeometry();
  const posAttr = dynamicAttribute(geo, "position", pos);
  const colAttr = dynamicAttribute(geo, "color", col);
  const packets = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: small ? 0.2 : 0.17,
      map: glowTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(packets);
  scene.add(dust(small ? 80 : 180, new THREE.Vector3(12, 4, 9), 31));

  const WHITE = new THREE.Color("#ffe3c8");
  const PLUS = new THREE.Color("#ff7a35");
  const MINUS = new THREE.Color("#4c9bff");
  const GOLD = new THREE.Color("#ffc48a");
  const p = new THREE.Vector3();
  const mix = { group: 0, sparse: 0 };
  const cam = new THREE.Vector3(-0.3, 4.4, 5.8);

  return {
    scene,
    camera,
    update({ t, dt, state, pointer, fit }: Frame) {
      const step = Math.round(state.step);
      mix.group = approach(mix.group, step === 1 ? 1 : 0, dt, 2);
      mix.sparse = approach(mix.sparse, step === 2 ? 1 : 0, dt, 2);
      groupMat.opacity = mix.group;
      group.visible = mix.group > 0.01;
      viaPlusG.opacity = viaMinusG.opacity = 1 - mix.group * 0.85;
      const zeroRate = 0.12 + mix.sparse * 0.5;

      let n = 0;
      const put = (v: THREE.Vector3, c: THREE.Color, a: number) => {
        if (n >= MAX || a <= 0.01) return;
        pos[n * 3] = v.x;
        pos[n * 3 + 1] = v.y;
        pos[n * 3 + 2] = v.z;
        col[n * 3] = c.r * a;
        col[n * 3 + 1] = c.g * a;
        col[n * 3 + 2] = c.b * a;
        n++;
      };
      for (const a of adders) a.value = 0;

      for (let i = 0; i < IN; i++) {
        const P = 2.1 + i * 0.17;
        const ph = i * 0.41;
        const k = Math.floor((t + ph) / P);
        const heads = [-1, -1];
        for (const back of [0, 1]) {
          const cycle = k - back;
          if (hash(i, cycle) < zeroRate) continue; // a zero activation: the rail holds still
          const age = t - (cycle * P - ph);
          const s = age * SPEED;
          heads[back] = s / (X1 - X0);
          const grouped = GROUP.indexOf(i);
          W[i]?.forEach((w, j) => {
            const pa = paths[i]?.[j];
            if (!pa) return;
            const fade = GROUP.includes(i) && TAPS.includes(j) ? 1 - mix.group : 1;
            if (s >= pa.total) {
              const ad = adders[j];
              if (ad) ad.value += w * fade * Math.exp(-(age - pa.total / SPEED) * 2.2);
              return;
            }
            const seg = along(pa, s, p);
            put(p, seg === 0 ? WHITE : w > 0 ? PLUS : MINUS, fade);
          });
          if (grouped >= 0 && mix.group > 0.01) {
            const tn = toNode[grouped];
            if (tn && s < tn.total) {
              along(tn, s, p);
              put(p, WHITE, mix.group);
            }
          }
        }
        railMat[i]?.uniforms.uHeads.value.set(heads[0] ?? -1, heads[1] ?? -1, -1, -1);
      }
      // The shared sum fires once per x1 cycle and feeds every tap row.
      if (mix.group > 0.01) {
        const P = 2.1;
        const k = Math.floor(t / P);
        for (const back of [0, 1]) {
          const age = t - (k - back) * P - 1.1;
          if (age < 0) continue;
          const s = age * SPEED;
          fromNode.forEach((fp, ti) => {
            if (s < fp.total) {
              along(fp, s, p);
              put(p, GOLD, mix.group);
            } else {
              const ad = adders[TAPS[ti] ?? 0];
              if (ad) ad.value += mix.group * Math.exp(-(age - fp.total / SPEED) * 2.2);
            }
          });
        }
        nodeMesh.rotation.y = t * 0.8;
      }
      for (let k = n; k < MAX; k++) {
        col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = 0;
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      for (const a of adders) {
        const v = Math.max(-2, Math.min(2, a.value));
        a.m.emissive.copy(v >= 0 ? PLUS : MINUS);
        a.m.emissiveIntensity = 0.12 + Math.abs(v) * 0.9;
      }

      const zoom = fit;
      camera.position.set(
        (cam.x + Math.sin(t * 0.12) * 0.3 + pointer.x * 0.6) * zoom,
        (cam.y - pointer.y * 0.35) * zoom,
        cam.z * zoom,
      );
      camera.lookAt(-0.15, 0.1, 0.35);
    },
  };
}
