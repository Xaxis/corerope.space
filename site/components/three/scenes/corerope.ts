// Core rope memory: ferrite cores on a row, sense wires threaded through some and looped around
// others. A current pulse runs down each wire; a core it threads flashes as it passes, which is how
// the rope reads a 1. A wire routed around a core leaves it dark: a 0. The program is the weave.
// state.param shifts the rope right of centre (0 to 0.3), so text can sit on the left.
import {
  approach,
  type BuildContext,
  type Built,
  dust,
  type Frame,
  pulseMaterial,
  rng,
  STAGE,
  THREE,
  uAtX,
} from "../kit";

export const bloom = { strength: 1.1, radius: 0.65, threshold: 0.5 };

const CORES = 7;
const SPACING = 1.08;
const R = 0.42;
const TUBE = 0.15;
const WIRES = 6;
const LANE = 0.135;

export function build({ small }: BuildContext): Built {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(STAGE, 7, 15);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);

  scene.add(new THREE.HemisphereLight("#bfae9c", "#0b0a09", 0.5));
  const key = new THREE.DirectionalLight("#ffd8bb", 2.4);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#5d8fdb", 2.6);
  rim.position.set(-4, 1.5, -5);
  scene.add(rim);
  const warm = new THREE.PointLight("#ff6a28", 0.6, 4, 2);
  warm.position.set(0, -0.2, 1.2);
  scene.add(warm);

  const root = new THREE.Group();
  scene.add(root);

  // The bits each wire stores: 1 threads the core, 0 goes around it. Fixed, like the rope.
  const r = rng(11);
  const bits = Array.from({ length: CORES }, () =>
    Array.from({ length: WIRES }, () => (r() > 0.42 ? 1 : 0)),
  );
  const xs = Array.from({ length: CORES }, (_, i) => (i - (CORES - 1) / 2) * SPACING);

  const torus = new THREE.TorusGeometry(R, TUBE, 36, 96);
  const cores = xs.map((x) => {
    const m = new THREE.MeshStandardMaterial({
      color: "#24211e",
      roughness: 0.36,
      metalness: 0.55,
      emissive: new THREE.Color("#ff5a1f"),
      emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(torus, m);
    mesh.rotation.y = Math.PI / 2;
    mesh.position.x = x;
    root.add(mesh);
    return m;
  });

  // Each wire has its own lane through the cores' holes and detours outward in that lane's direction.
  const wires = Array.from({ length: WIRES }, (_, w) => {
    const a = (w / WIRES) * Math.PI * 2 + 0.35;
    const dir = new THREE.Vector2(Math.cos(a), Math.sin(a));
    const at = (x: number, radius: number) => new THREE.Vector3(x, dir.x * radius, dir.y * radius);
    const pts = [at(-5.4, 1.6), at(-4.6, 0.7), at((xs[0] ?? 0) - 0.75, LANE * 1.1)];
    xs.forEach((x, i) => {
      if (bits[i]?.[w]) {
        pts.push(at(x - 0.36, LANE), at(x, LANE), at(x + 0.36, LANE));
      } else {
        const out = 0.88 + (w % 3) * 0.05;
        pts.push(
          at(x - 0.44, LANE * 1.2),
          at(x - 0.2, out * 0.92),
          at(x, out),
          at(x + 0.2, out * 0.92),
          at(x + 0.44, LANE * 1.2),
        );
      }
    });
    pts.push(at((xs[CORES - 1] ?? 0) + 0.75, LANE * 1.1), at(4.6, 0.7), at(5.4, 1.6));
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const mat = pulseMaterial("#7a3f20", "#ffb37d");
    mat.uniforms.uFade.value = 0.07;
    mat.uniforms.uTail.value = 13;
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, small ? 500 : 900, 0.017, 8, false),
      mat,
    );
    root.add(mesh);
    const threads = xs.map((x, i) => (bits[i]?.[w] ? uAtX(curve, x) : -1));
    return { mat, threads, period: 3.6 + w * 0.47, phase: w * 0.61 };
  });

  // A dim floor grid for depth, swallowed by the fog.
  const grid = new THREE.GridHelper(30, 60, "#2b241f", "#1a1613");
  grid.position.y = -1.25;
  const gm = grid.material as THREE.Material;
  gm.transparent = true;
  gm.opacity = 0.55;
  scene.add(grid);
  const motes = dust(small ? 140 : 320, new THREE.Vector3(14, 4, 7));
  scene.add(motes);

  const glow = new Array(CORES).fill(0);
  const cam = { angle: 0.36, height: 1.2 };
  const look = new THREE.Vector3();

  return {
    scene,
    camera,
    update({ t, dt, state, pointer, fit }: Frame) {
      // Two pulses per wire, half a period apart; a head runs from just before the wire to just after.
      const flash = new Array(CORES).fill(0);
      for (const w of wires) {
        const heads = [0, 0.5].map((o) => ((t + w.phase) / w.period + o) % 1);
        const u = heads.map((h) => h * 1.3 - 0.15);
        w.mat.uniforms.uHeads.value.set(u[0] ?? -1, u[1] ?? -1, -1, -1);
        w.threads.forEach((uc, i) => {
          if (uc < 0) return;
          for (const h of u) {
            const d = h - uc;
            if (d >= 0 && d < 0.25) flash[i] += Math.exp(-d * 26);
          }
        });
      }
      cores.forEach((m, i) => {
        glow[i] = Math.max(Math.min(1, flash[i] ?? 0), approach(glow[i] ?? 0, 0, dt, 7));
        m.emissiveIntensity = (glow[i] ?? 0) * 0.9;
      });
      warm.intensity = 0.3 + Math.max(...glow) * 0.8;

      motes.rotation.y = t * 0.01;
      motes.position.y = Math.sin(t * 0.2) * 0.05;

      cam.angle = 0.62 + Math.sin(t * 0.11) * 0.1 + pointer.x * 0.14;
      cam.height = 1.5 + Math.sin(t * 0.17) * 0.08 - pointer.y * 0.25;
      const dist = 8.4 * fit;
      camera.position.set(Math.sin(cam.angle) * dist, cam.height, Math.cos(cam.angle) * dist);
      look.set(0, -0.05, 0);
      camera.lookAt(look);
      // Shift the rope right of centre when the page asks (state.param), so text can sit beside it.
      // Only on a wide stage: on a phone the text sits below the rope, not beside it.
      const shift = camera.aspect > 1.2 ? state.param : 0;
      if (shift > 0) {
        camera.setViewOffset(
          1000,
          1000 * (1 / camera.aspect),
          -shift * 1000,
          0,
          1000,
          1000 * (1 / camera.aspect),
        );
      } else {
        camera.clearViewOffset();
      }
    },
  };
}
