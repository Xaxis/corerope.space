// Invention 4, lookup-in-storage. Tokens run along a rail toward the core. Each token's hashed
// N-grams are known the moment it arrives, so beams drop into a 3D NAND stack and light the rows it
// needs while the token is still on its way: the reads are prefetched. A row is a sliver of the
// page around it, which is the open question of how to pack the tables.
//   step 0: every retrieved row crosses the bus to the core, one by one.
//   step 1: the die sums the rows with their gate weights and sends one small vector.
//   step 2: two levels: the static NAND level as in step 1, plus contextual lookups the core makes
//           from its hidden state, which need the DRAM beside it.
import {
  approach,
  type BuildContext,
  type Built,
  dust,
  type Frame,
  hash,
  pulseMaterial,
  rig,
  STAGE,
  sprites,
  THREE,
  uAtX,
} from "../kit";

export const bloom = { strength: 1.05, radius: 0.55, threshold: 0.5 };

const STACK = new THREE.Vector3(-1.5, 0, 0);
const LAYERS = 30;
const GAP = 0.07;
const W = 2.6;
const D = 1.7;
const TOP = LAYERS * GAP;
const SUM = new THREE.Vector3(STACK.x, TOP + 0.42, 0);
const CORE = new THREE.Vector3(3.1, 0.25, 0.2);
const DRAM = new THREE.Vector3(3.1, 0.3, -1.55);
const PERIOD = 2.8; // one token's trip, in seconds
const SPACING = 0.95; // between tokens
const ROWS = 7; // rows each token reads

export function build({ small }: BuildContext): Built {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(STAGE, 10, 22);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  scene.add(new THREE.HemisphereLight("#c4b9ad", "#0b0a09", 0.5));
  const key = new THREE.DirectionalLight("#ffe2c8", 1.9);
  key.position.set(4, 7, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#5a8edc", 2.0);
  rim.position.set(-6, 3, -5);
  scene.add(rim);

  // The 3D NAND stack: thin word-line layers, vertical channels through them, bond lines between.
  const stack = new THREE.Group();
  stack.position.copy(STACK);
  scene.add(stack);
  const layerMat = new THREE.MeshStandardMaterial({
    color: "#1d1b19",
    roughness: 0.55,
    metalness: 0.5,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const layers = new THREE.InstancedMesh(new THREE.BoxGeometry(W, 0.028, D), layerMat, LAYERS);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < LAYERS; i++) {
    m4.makeTranslation(0, i * GAP + 0.04, 0);
    layers.setMatrixAt(i, m4);
  }
  stack.add(layers);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(W + 0.04, TOP + 0.04, D + 0.04)),
    new THREE.LineBasicMaterial({ color: "#7a5a3a", transparent: true, opacity: 0.8 }),
  );
  edges.position.y = TOP / 2 + 0.02;
  stack.add(edges);
  const ch: number[] = [];
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 5; j++) {
      const x = -W / 2 + 0.2 + (i / 8) * (W - 0.4);
      const z = -D / 2 + 0.2 + (j / 4) * (D - 0.4);
      ch.push(x, 0.02, z, x, TOP + 0.02, z);
    }
  const chGeo = new THREE.BufferGeometry();
  chGeo.setAttribute("position", new THREE.Float32BufferAttribute(ch, 3));
  stack.add(
    new THREE.LineSegments(
      chGeo,
      new THREE.LineBasicMaterial({ color: "#3d6fb0", transparent: true, opacity: 0.35 }),
    ),
  );
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.5, 0.12, D + 0.5),
    new THREE.MeshStandardMaterial({ color: "#14211b", roughness: 0.85, metalness: 0.1 }),
  );
  base.position.y = -0.06;
  stack.add(base);

  // The on-die reduction: a ring above the stack where gathered rows are summed.
  const sumMat = new THREE.MeshStandardMaterial({
    color: "#2a2420",
    emissive: new THREE.Color("#ff7a35"),
    emissiveIntensity: 0.2,
    roughness: 0.35,
    metalness: 0.6,
  });
  const sum = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 16, 64), sumMat);
  sum.rotation.x = Math.PI / 2;
  sum.position.copy(SUM);
  scene.add(sum);

  // Pages: when a row lights, the 16 KB page around it shows faintly; most of the page is unused.
  const pageMat = new THREE.MeshBasicMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const PAGES = 4 * ROWS;
  const pages = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.012, 0.36), pageMat, PAGES);
  pages.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < PAGES; i++) pages.setColorAt(i, new THREE.Color(0, 0, 0));
  pages.frustumCulled = false;
  scene.add(pages);

  // The core, and the DRAM beside it.
  const chip = (size: THREE.Vector3, body: string, edge: string) => {
    const g = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshStandardMaterial({ color: body, roughness: 0.32, metalness: 0.7 }),
    );
    const top = new THREE.MeshStandardMaterial({
      color: "#15120f",
      emissive: new THREE.Color(edge),
      emissiveIntensity: 0.3,
      roughness: 0.5,
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 0.82, size.z * 0.82), top);
    face.rotation.x = -Math.PI / 2;
    face.position.y = size.y / 2 + 0.002;
    const line = new THREE.LineSegments(
      new THREE.EdgesGeometry(box.geometry),
      new THREE.LineBasicMaterial({ color: edge, transparent: true }),
    );
    g.add(box, face, line);
    return { g, top, line };
  };
  const core = chip(new THREE.Vector3(1.3, 0.26, 1.3), "#211d1a", "#ff6a28");
  core.g.position.copy(CORE);
  scene.add(core.g);
  const dram = chip(new THREE.Vector3(1.0, 0.36, 0.7), "#1a1d22", "#3d8bff");
  dram.g.position.copy(DRAM);
  scene.add(dram.g);

  // The rail tokens arrive on, and the bus from the stack to the core.
  const rail = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.4, TOP + 1.25, 1.15),
    new THREE.Vector3(-3.0, TOP + 1.25, 1.15),
    new THREE.Vector3(STACK.x, TOP + 1.2, 1.1),
    new THREE.Vector3(1.0, TOP + 0.7, 0.9),
    new THREE.Vector3(2.4, 0.9, 0.55),
    CORE.clone().add(new THREE.Vector3(-0.2, 0.2, 0)),
  ]);
  const railMat = pulseMaterial("#3a2a1e", "#ffd2a8");
  railMat.uniforms.uFade.value = 0.04;
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(rail, 300, 0.012, 6, false), railMat));
  const bus = new THREE.CatmullRomCurve3([
    SUM.clone(),
    new THREE.Vector3(0.4, SUM.y + 0.2, 0.05),
    new THREE.Vector3(2.2, 0.75, 0.15),
    CORE.clone().add(new THREE.Vector3(-0.35, 0.15, 0)),
  ]);
  const busMat = pulseMaterial("#4a2a18", "#ffb37d");
  busMat.uniforms.uFade.value = 0.03;
  busMat.uniforms.uTail.value = 30;
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(bus, 200, 0.05, 10, false), busMat));
  const ctx = new THREE.CatmullRomCurve3([
    CORE.clone().add(new THREE.Vector3(0, 0.15, -0.5)),
    new THREE.Vector3(CORE.x + 0.15, 0.75, (CORE.z + DRAM.z) / 2),
    DRAM.clone().add(new THREE.Vector3(0, 0.2, 0.25)),
  ]);
  const ctxMat = pulseMaterial("#1c2a44", "#9cc4ff");
  ctxMat.uniforms.uFade.value = 0.05;
  const ctxTube = new THREE.Mesh(new THREE.TubeGeometry(ctx, 80, 0.03, 8, false), ctxMat);
  scene.add(ctxTube);

  // One beam per row, for each of the 4 token slots in flight.
  const beamPos: number[] = new Array(4 * ROWS * 6).fill(0);
  const beamCol: number[] = new Array(4 * ROWS * 6).fill(0);
  const beamGeo = new THREE.BufferGeometry();
  const bp = new THREE.Float32BufferAttribute(beamPos, 3);
  const bc = new THREE.Float32BufferAttribute(beamCol, 3);
  bp.setUsage(THREE.DynamicDrawUsage);
  bc.setUsage(THREE.DynamicDrawUsage);
  beamGeo.setAttribute("position", bp);
  beamGeo.setAttribute("color", bc);
  const beams = new THREE.LineSegments(
    beamGeo,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  beams.frustumCulled = false;
  scene.add(beams);

  const fx = sprites(320, small ? 0.26 : 0.22);
  scene.add(fx.points);
  const rows = sprites(ROWS * 4, small ? 0.2 : 0.17);
  scene.add(rows.points);
  scene.add(dust(small ? 90 : 200, new THREE.Vector3(16, 5, 10), 23));

  const TOKEN = new THREE.Color("#fff0de");
  const ROW = new THREE.Color("#ffb070");
  const HOT = new THREE.Color("#ff7a35");
  const CROSS = new THREE.Color("#ffe6c4"); // a row crossing the bus alone: pale against the hot bus
  const SUMC = new THREE.Color("#ffe0b8");
  const BLUE = new THREE.Color("#7fb2ff");
  const PAGE = new THREE.Color("#6a4a2c");
  const OFF = new THREE.Color(0, 0, 0);
  const tint = new THREE.Color();
  const p = new THREE.Vector3();
  const r = new THREE.Vector3();
  const mix = { reduce: 0, ctx: 0 };
  const camera_ = rig(camera, [
    { pos: new THREE.Vector3(0.2, 4.0, 8.0), look: new THREE.Vector3(0.4, 1.0, 0) },
    { pos: new THREE.Vector3(-0.2, 3.8, 7.6), look: new THREE.Vector3(0.3, 1.2, 0) },
    { pos: new THREE.Vector3(1.2, 4.0, 7.4), look: new THREE.Vector3(0.9, 0.8, -0.3) },
  ]);

  /** Where token k's j-th row sits in the stack (fixed for that token). */
  const rowAt = (k: number, j: number, out: THREE.Vector3) =>
    out.set(
      STACK.x + (hash(k, j * 3 + 1) - 0.5) * (W - 0.5),
      Math.floor(hash(k, j * 3 + 2) * (LAYERS - 2)) * GAP + 0.08,
      (hash(k, j * 3 + 3) - 0.5) * (D - 0.4),
    );
  const smooth = (x: number) => x * x * (3 - 2 * x);
  const seg = (x: number, a: number, b: number) => Math.max(0, Math.min(1, (x - a) / (b - a)));
  // A token rides the rail over 0 to ARRIVE of its cycle, eased. OVER is when it is above the
  // stack: its addresses drop from there, and everything after is timed from it.
  const ARRIVE = 0.72;
  const uOver = uAtX(rail, STACK.x);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (smooth(mid) < uOver) lo = mid;
    else hi = mid;
  }
  const OVER = lo * ARRIVE;
  const dropFrom = rail.getPointAt(uOver);

  return {
    scene,
    camera,
    update(frame: Frame) {
      const { t, dt, state } = frame;
      const step = Math.max(0, Math.min(2, Math.round(state.step)));
      mix.reduce = approach(mix.reduce, step >= 1 ? 1 : 0, dt, 2.2);
      mix.ctx = approach(mix.ctx, step >= 2 ? 1 : 0, dt, 2.2);
      ctxTube.visible = mix.ctx > 0.01;
      ctxMat.uniforms.uOpacity.value = mix.ctx;
      dram.g.scale.setScalar(0.4 + 0.6 * mix.ctx);
      dram.line.material.opacity = 0.25 + 0.75 * mix.ctx;

      const heads = [-1, -1, -1, -1];
      const busHeads = [-1, -1, -1, -1];
      const ctxHeads = [-1, -1, -1, -1];
      let sumFlash = 0;
      let coreFlash = 0;
      let dramFlash = 0;
      let busLoad = 0;
      let pg = 0;
      for (let i = 0; i < beamCol.length; i++) beamCol[i] = 0;
      const kNow = Math.floor(t / SPACING);
      for (let k = kNow; k > kNow - 4; k--) {
        const ph = (t - k * SPACING) / PERIOD;
        if (ph < 0 || ph > 1) continue;
        const slot = ((k % 4) + 4) % 4;
        // The token on its rail, reaching the core at ARRIVE.
        const u = smooth(seg(ph, 0, ARRIVE));
        heads[slot] = u;
        if (ph < ARRIVE + 0.06)
          fx.put(rail.getPointAt(u, p), TOKEN, ph < ARRIVE ? 1.2 : 1 - (ph - ARRIVE) / 0.06);
        if (ph >= ARRIVE - 0.02 && ph < ARRIVE + 0.14)
          coreFlash = Math.max(coreFlash, 1 - Math.abs(ph - ARRIVE - 0.04) / 0.1);
        // Address beams drop from the token as it passes over the stack: known on arrival.
        const drop = seg(ph, OVER - 0.06, OVER);
        const fade = 1 - seg(ph, OVER + 0.04, OVER + 0.12);
        for (let j = 0; j < ROWS; j++) {
          rowAt(k, j, r);
          const lit = drop * (1 - seg(ph, ARRIVE - 0.04, ARRIVE + 0.06));
          if (drop > 0 && fade > 0) {
            const at = (slot * ROWS + j) * 6;
            p.lerpVectors(dropFrom, r, drop);
            beamPos.splice(at, 6, dropFrom.x, dropFrom.y, dropFrom.z, p.x, p.y, p.z);
            for (let c = 0; c < 2; c++) {
              beamCol[at + c * 3] = ROW.r * fade * 0.7;
              beamCol[at + c * 3 + 1] = ROW.g * fade * 0.7;
              beamCol[at + c * 3 + 2] = ROW.b * fade * 0.7;
            }
          }
          // The row glows in place; its page shows faintly around it.
          if (lit > 0) {
            rows.put(r, ROW, lit * (ph < OVER + 0.08 ? 1.2 : 0.6));
            if (pg < PAGES) {
              m4.makeTranslation(r.x, r.y + 0.012, r.z);
              pages.setMatrixAt(pg, m4);
              pages.setColorAt(pg, tint.copy(PAGE).multiplyScalar(lit * 0.9));
              pg++;
            }
          }
          // Then the rows travel: each over the bus on its own (step 0), or up to the ring above
          // the stack, where the die sums them (steps 1 and 2).
          const naive = 1 - mix.reduce;
          if (naive > 0.01) {
            const lag = j * 0.03;
            // Each row with a short trail, so a crowded bus looks crowded.
            for (let tr = 0; tr < 3; tr++) {
              const g = seg(ph, OVER + 0.08 + lag + tr * 0.012, OVER + 0.42 + lag + tr * 0.012);
              if (g <= 0 || g >= 1) continue;
              if (g < 0.25) p.lerpVectors(r, SUM, smooth(g / 0.25));
              else bus.getPointAt(smooth((g - 0.25) / 0.75), p);
              fx.put(p, CROSS, (1.5 - tr * 0.45) * naive);
              if (tr === 0) busLoad += naive;
            }
          }
          const rise = seg(ph, OVER + 0.08, OVER + 0.2);
          if (mix.reduce > 0.01 && rise > 0 && rise < 1) {
            p.lerpVectors(r, SUM, smooth(rise));
            fx.put(p, ROW, mix.reduce * 0.9);
          }
        }
        // Summed on the die: the ring flashes and one vector crosses the bus.
        if (mix.reduce > 0.01) {
          const flash = seg(ph, OVER + 0.18, OVER + 0.22) * (1 - seg(ph, OVER + 0.26, OVER + 0.36));
          sumFlash = Math.max(sumFlash, flash * mix.reduce);
          const v = seg(ph, OVER + 0.22, ARRIVE + 0.02);
          if (v > 0 && v < 1) {
            bus.getPointAt(smooth(v), p);
            fx.put(p, SUMC, 1.6 * mix.reduce);
            busHeads[slot] = smooth(v);
          }
        }
        // Contextual lookups: only once the core has the token's hidden state, to the DRAM.
        if (mix.ctx > 0.01) {
          const c = seg(ph, 0.78, 0.98);
          if (c > 0 && c < 1) {
            const there = c < 0.5;
            const s = there ? c / 0.5 : 1 - (c - 0.5) / 0.5;
            ctx.getPointAt(smooth(s), p);
            fx.put(p, BLUE, 1.3 * mix.ctx);
            ctxHeads[slot] = smooth(s);
            if (Math.abs(c - 0.5) < 0.12)
              dramFlash = Math.max(dramFlash, 1 - Math.abs(c - 0.5) / 0.12);
          }
        }
      }
      for (let i = pg; i < PAGES; i++) pages.setColorAt(i, OFF);
      pages.instanceMatrix.needsUpdate = true;
      if (pages.instanceColor) pages.instanceColor.needsUpdate = true;
      bp.array.set(beamPos);
      bc.array.set(beamCol);
      bp.needsUpdate = true;
      bc.needsUpdate = true;
      railMat.uniforms.uHeads.value.set(
        heads[0] ?? -1,
        heads[1] ?? -1,
        heads[2] ?? -1,
        heads[3] ?? -1,
      );
      busMat.uniforms.uHeads.value.set(
        busHeads[0] ?? -1,
        busHeads[1] ?? -1,
        busHeads[2] ?? -1,
        busHeads[3] ?? -1,
      );
      busMat.uniforms.uGain.value = 0.6 + 0.4 * mix.reduce;
      // The crowded bus: it runs hot while every row crosses it.
      busMat.uniforms.uBase.value.set("#4a2a18").lerp(HOT, Math.min(0.55, busLoad * 0.04));
      ctxMat.uniforms.uHeads.value.set(
        ctxHeads[0] ?? -1,
        ctxHeads[1] ?? -1,
        ctxHeads[2] ?? -1,
        ctxHeads[3] ?? -1,
      );
      sumMat.emissiveIntensity = 0.2 + sumFlash * 2.4 * mix.reduce;
      // The ring exists only once the die reduces (steps 1 and 2).
      sum.scale.setScalar(Math.max(0.001, mix.reduce * (1 + sumFlash * 0.15)));
      core.top.emissiveIntensity = 0.3 + coreFlash * 0.9;
      dram.top.emissiveIntensity = 0.15 + dramFlash * 1.4 * mix.ctx;
      fx.flush();
      rows.flush();
      camera_(step, frame);
    },
  };
}
