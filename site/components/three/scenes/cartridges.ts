// Invention 6, context cartridges for a frozen core. The core (ice blue) never changes. Around it,
// a ring is the user's context state: the recurrent layers' starting state.
//   step 0: re-reading the corpus: every session streams the whole corpus through the core, token by
//           token, and the state fills slowly; the next session starts again from nothing.
//   step 1: a cartridge: a trained, compact starting state for a corpus, kept in the memory tier,
//           loads in one step. The core is frozen, so a cartridge stays valid for its whole life.
//   step 2: checkpointed prefixes: the core snapshots its state at chunk boundaries, so a session
//           that returns resumes from its last snapshot instead of replaying its tokens.
import {
  approach,
  type BuildContext,
  type Built,
  dust,
  type Frame,
  hash,
  rig,
  STAGE,
  sprites,
  THREE,
} from "../kit";

export const bloom = { strength: 1.0, radius: 0.55, threshold: 0.5 };

const CORE = new THREE.Vector3(0.4, 0.2, 0);
const RING_R = 1.25;
const SEGS = 56;
const CORPUS = new THREE.Vector3(-3.5, 0, 0.4);
const PAGES = 34;
const LABELS = ["#4c9bff", "#3fd0a0", "#ffb070", "#b78cff", "#ff8a7a"];
const RACK_Z = -2.3;
// The slot at the back of the core a cartridge stands in, half inserted.
const SLOT = new THREE.Vector3(CORE.x, CORE.y + 0.05, CORE.z - 0.98);
const DOCK = new THREE.Vector3(CORE.x, SLOT.y + 0.38, SLOT.z);
const TRACK_Z = 2.05;
const CHUNKS = 6;

export function build({ small }: BuildContext): Built {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(STAGE, 9, 21);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  scene.add(new THREE.HemisphereLight("#c4b9ad", "#0b0a09", 0.55));
  const key = new THREE.DirectionalLight("#ffe2c8", 1.8);
  key.position.set(3, 7, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#8fc4ff", 2.2);
  rim.position.set(-5, 3, -5);
  scene.add(rim);

  // The frozen core: an ice-blue lattice on top, fixed for the chip's life.
  const coreBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.3, 1.5),
    new THREE.MeshStandardMaterial({ color: "#1a1f26", roughness: 0.3, metalness: 0.75 }),
  );
  coreBody.position.copy(CORE);
  scene.add(coreBody);
  const coreEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(coreBody.geometry),
    new THREE.LineBasicMaterial({ color: "#bfe3ff" }),
  );
  coreEdges.position.copy(CORE);
  scene.add(coreEdges);
  const glow = { value: 0.4 };
  const lattice = new THREE.ShaderMaterial({
    uniforms: { uGlow: glow },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uGlow;
      varying vec2 vUv;
      void main() {
        vec2 g = abs(fract(vUv * 9.0) - 0.5);
        float line = smoothstep(0.47, 0.5, max(g.x, g.y));
        vec2 d = abs(fract((vUv.x + vUv.y) * 4.5 + vec2(0.0)) - 0.5);
        float diag = smoothstep(0.46, 0.5, d.x) * 0.5;
        vec3 ice = vec3(0.55, 0.8, 1.0);
        gl_FragColor = vec4(vec3(0.04, 0.06, 0.08) + ice * (line + diag) * uGlow, 1.0);
      }`,
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 1.36), lattice);
  top.rotation.x = -Math.PI / 2;
  top.position.set(CORE.x, CORE.y + 0.152, CORE.z);
  scene.add(top);

  // The state ring: segments that light as the state fills.
  const segMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const segs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.06, 0.16), segMat, SEGS);
  const m4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  for (let i = 0; i < SEGS; i++) {
    const a = (i / SEGS) * Math.PI * 2;
    p.set(CORE.x + Math.cos(a) * RING_R, CORE.y + 0.02, CORE.z + Math.sin(a) * RING_R);
    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
    m4.compose(p, quat, one);
    segs.setMatrixAt(i, m4);
    segs.setColorAt(i, new THREE.Color("#000000"));
  }
  scene.add(segs);
  const ringBase = new THREE.Mesh(
    new THREE.TorusGeometry(RING_R, 0.012, 8, 128),
    new THREE.MeshBasicMaterial({ color: "#3a332c" }),
  );
  ringBase.rotation.x = Math.PI / 2;
  ringBase.position.set(CORE.x, CORE.y + 0.02, CORE.z);
  scene.add(ringBase);

  // The corpus: a stack of pages, read top to bottom every session.
  const pageMat = new THREE.MeshStandardMaterial({
    color: "#3b352d",
    roughness: 0.8,
    metalness: 0.05,
  });
  const pages = new THREE.InstancedMesh(new THREE.BoxGeometry(1.05, 0.022, 1.35), pageMat, PAGES);
  pages.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const pageAt = (i: number) =>
    p.set(
      CORPUS.x + (hash(i, 1) - 0.5) * 0.08,
      0.02 + i * 0.034,
      CORPUS.z + (hash(i, 2) - 0.5) * 0.08,
    );
  for (let i = 0; i < PAGES; i++) {
    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (hash(i, 3) - 0.5) * 0.12);
    m4.compose(pageAt(i), quat, one);
    pages.setMatrixAt(i, m4);
    pages.setColorAt(i, new THREE.Color("#ffffff"));
  }
  scene.add(pages);

  // The cartridges, in a rack in the memory tier behind the core.
  const carts = LABELS.map((label, i) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.7, 0.13),
      new THREE.MeshStandardMaterial({ color: "#1f1c19", roughness: 0.45, metalness: 0.5 }),
    );
    const stripeMat = new THREE.MeshStandardMaterial({
      color: "#111",
      emissive: new THREE.Color(label),
      emissiveIntensity: 0.5,
    });
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.16), stripeMat);
    stripe.position.set(0, 0.17, 0.066);
    g.add(body, stripe);
    const home = new THREE.Vector3(-1.4 + i * 0.75, 0.36, RACK_Z);
    g.position.copy(home);
    scene.add(g);
    return { g, stripeMat, home, color: new THREE.Color(label) };
  });
  const slotMat = new THREE.MeshStandardMaterial({
    color: "#181614",
    emissive: new THREE.Color("#bfe3ff"),
    emissiveIntensity: 0.05,
    roughness: 0.5,
    metalness: 0.6,
  });
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.4, 0.24), slotMat);
  slot.position.copy(SLOT);
  scene.add(slot);
  const rack = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 0.06, 0.5),
    new THREE.MeshStandardMaterial({ color: "#14211b", roughness: 0.85 }),
  );
  rack.position.set(0.1, 0.0, RACK_Z);
  scene.add(rack);

  // The session timeline, in front: chunk boundaries and the snapshots taken at them.
  const trackX = (u: number) => -2.6 + u * 5.2;
  const track = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.02, 0.04),
    new THREE.MeshBasicMaterial({ color: "#4a3f35", transparent: true }),
  );
  track.position.set(0, 0.0, TRACK_Z);
  scene.add(track);
  const snapMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const snaps = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.09), snapMat, CHUNKS);
  snaps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < CHUNKS; i++) snaps.setColorAt(i, new THREE.Color("#000000"));
  scene.add(snaps);

  const fx = sprites(220, small ? 0.22 : 0.18);
  scene.add(fx.points);
  scene.add(dust(small ? 80 : 180, new THREE.Vector3(16, 5, 10), 29));

  const WARM = new THREE.Color("#ffd2a8");
  const ICE = new THREE.Color("#bfe3ff");
  const OFF = new THREE.Color("#000000");
  const c = new THREE.Color();
  const tint = new THREE.Color();
  const mix = [1, 0, 0];
  const camera_ = rig(camera, [
    { pos: new THREE.Vector3(-1.4, 4.2, 7.2), look: new THREE.Vector3(-0.8, 0.2, 0) },
    { pos: new THREE.Vector3(0.6, 3.8, 5.4), look: new THREE.Vector3(0.4, 0.3, -0.9) },
    { pos: new THREE.Vector3(0.2, 4.4, 7.4), look: new THREE.Vector3(0.1, 0.0, 0.6) },
  ]);
  const smooth = (x: number) => x * x * (3 - 2 * x);
  const seg = (x: number, a: number, b: number) => Math.max(0, Math.min(1, (x - a) / (b - a)));

  return {
    scene,
    camera,
    update(frame: Frame) {
      const { t, dt, state } = frame;
      const step = Math.max(0, Math.min(2, Math.round(state.step)));
      for (let i = 0; i < 3; i++) mix[i] = approach(mix[i] ?? 0, i === step ? 1 : 0, dt, 2.2);
      const [m0, m1, m2] = [mix[0] ?? 0, mix[1] ?? 0, mix[2] ?? 0];

      // Step 0: a 7 s session reads the corpus page by page; the state fills slowly.
      const ph0 = (t / 7) % 1;
      const fill0 = smooth(seg(ph0, 0.04, 0.9));
      const reading = Math.floor(seg(ph0, 0.04, 0.9) * PAGES);
      for (let i = 0; i < PAGES; i++) {
        const page = PAGES - 1 - i; // top first
        const lit = m0 * (page === PAGES - 1 - reading ? 1 : 0);
        // The corpus matters only while it is re-read (step 0); otherwise it recedes.
        c.set("#ffffff").multiplyScalar((0.9 + lit * 5) * (0.3 + 0.7 * m0));
        pages.setColorAt(i, c);
      }
      if (pages.instanceColor) pages.instanceColor.needsUpdate = true;
      if (m0 > 0.01) {
        for (let k = 0; k < 40; k++) {
          const u = (((t * 0.9 + k / 40) % 1) + 1) % 1;
          const from = pageAt(PAGES - 1 - Math.min(PAGES - 1, reading));
          q.copy(CORE).add(new THREE.Vector3(-0.7, 0.2, 0));
          p.lerpVectors(from, q, u);
          p.y += Math.sin(u * Math.PI) * 0.9 + 0.1;
          fx.put(p, WARM, m0 * Math.sin(u * Math.PI) * (ph0 < 0.92 ? 1 : 0));
        }
      }

      // Step 1: every 4.5 s a different cartridge flies to the dock and the state fills at once.
      const ph1 = (t / 4.5) % 1;
      const which = Math.floor(t / 4.5) % LABELS.length;
      const fly = smooth(seg(ph1, 0.04, 0.24));
      const back = smooth(seg(ph1, 0.82, 0.98));
      const fill1 = ph1 >= 0.26 && ph1 < 0.86 ? 1 : 0;
      const flash1 = Math.exp(-Math.max(0, ph1 - 0.26) * 12) * (ph1 >= 0.26 ? 1 : 0);
      carts.forEach((k, i) => {
        if (i === which && m1 > 0.01) {
          const out = fly * (1 - back) * m1;
          // Up out of the rack, over, and down into the slot, upright all the way.
          p.lerpVectors(k.home, DOCK, smooth(Math.min(1, out * 1.15)));
          p.y += Math.sin(out * Math.PI) * 0.9;
          k.g.position.copy(p);
          k.stripeMat.emissiveIntensity = 0.5 + (fill1 ? 0.9 : 0) * m1;
        } else {
          k.g.position.lerp(k.home, Math.min(1, dt * 6));
          k.stripeMat.emissiveIntensity = 0.5;
        }
      });
      const label = carts[which]?.color ?? WARM;
      slotMat.emissive.copy(label);
      slotMat.emissiveIntensity = 0.05 + fill1 * m1 * 0.7;

      // Step 2: a session walks its chunks, a snapshot at each boundary; it leaves, then returns
      // and resumes from the last snapshot at once.
      const ph2 = (t / 8) % 1;
      const walk = seg(ph2, 0.02, 0.56);
      const away = ph2 >= 0.6 && ph2 < 0.74;
      const back2 = ph2 >= 0.74;
      const resume = 4 / CHUNKS; // the boundary it returns to
      const pos2 = back2 ? resume + seg(ph2, 0.78, 0.98) * (1 - resume) : walk;
      const fill2 = away ? 0 : pos2;
      const flash2 = back2 ? Math.exp(-(ph2 - 0.74) * 14) : 0;
      for (let i = 0; i < CHUNKS; i++) {
        const u = (i + 1) / CHUNKS;
        const taken = (walk >= u || back2 || away) && i < CHUNKS - 1 ? 1 : 0;
        const isResume = Math.abs(u - resume) < 1e-6;
        p.set(trackX(u), 0.14, TRACK_Z);
        quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t * 1.2 + i);
        m4.compose(p, quat, one.clone().multiplyScalar(Math.max(0.0001, taken * m2)));
        snaps.setMatrixAt(i, m4);
        c.copy(ICE).multiplyScalar(0.8 + (isResume ? flash2 * 3 : 0));
        snaps.setColorAt(i, taken ? c : OFF);
      }
      snaps.instanceMatrix.needsUpdate = true;
      if (snaps.instanceColor) snaps.instanceColor.needsUpdate = true;
      (track.material as THREE.MeshBasicMaterial).opacity = m2;
      track.visible = m2 > 0.01;
      if (m2 > 0.01 && !away) {
        fx.put(p.set(trackX(pos2), 0.16, TRACK_Z), WARM, m2 * 1.4);
        // A snapshot flies from the ring down to its boundary as it is taken.
        for (let i = 0; i < CHUNKS - 1; i++) {
          const u = (i + 1) / CHUNKS;
          const since = (walk - u) * 6;
          if (back2 || since < 0 || since > 1) continue;
          q.set(CORE.x, CORE.y + 0.1, CORE.z + RING_R);
          p.lerpVectors(q, new THREE.Vector3(trackX(u), 0.14, TRACK_Z), smooth(since));
          fx.put(p, ICE, m2 * (1 - since * 0.5));
        }
      }

      // The ring: how full the state is, blended over the three ways of filling it.
      const fill = m0 * fill0 + m1 * fill1 + m2 * fill2;
      // Warm light blooms far more than blue at the same value, so the warm ring is kept lower.
      tint
        .copy(WARM)
        .multiplyScalar(0.55 * (m0 + m2))
        .add(c.copy(label).multiplyScalar(m1));
      const flash = m1 * flash1 + m2 * flash2;
      for (let i = 0; i < SEGS; i++) {
        const on = i / SEGS < fill ? 1 : 0;
        c.copy(tint).multiplyScalar(on * (0.7 + flash * 1.1) + 0.04);
        segs.setColorAt(i, c);
      }
      if (segs.instanceColor) segs.instanceColor.needsUpdate = true;
      glow.value = 0.35 + 0.1 * Math.sin(t * 0.7) + flash * 0.4;

      fx.flush();
      camera_(step, frame);
    },
  };
}
