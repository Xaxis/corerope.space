// Invention 5, cutting tokens per task. A task's reasoning is a chain of tokens, generated one after
// another from the task (left ring) to the answer (right ring); a pulse runs along as they are
// written. Cheaper tokens get spent, so the design adds three counterweights, one per step:
//   step 0: the long chain. Hot beads are the expensive steps on this silicon (deep-core
//           escalations, memory misses, long contexts).
//   step 1: joule-priced RL: the reward prices each trajectory's energy, so the costly steps go.
//   step 2: compiled skills: a sub-procedure the fleet solves again and again becomes verified code,
//           a block the chain calls instead of reasoning through it.
//   step 3: grounded latent reasoning: runs of steps happen as continuous vectors (blue), each ending
//           in a short text checkpoint (white) that keeps the reasoning readable.
// The bead counts are an illustration, not the model's numbers.
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

export const bloom = { strength: 1.0, radius: 0.5, threshold: 0.45 };

const N = 64;
const SP = 0.3; // spacing between tokens along the path
const ROW = 6.2;
const R = 0.6;
const SKILL = [24, 35] as const; // a repeated sub-procedure
const LATENT: readonly (readonly [number, number])[] = [
  [5, 13],
  [42, 55],
];
const SPEED = 4.2; // path units per second while generating

const inRun = (i: number, [a, b]: readonly [number, number]) => i >= a && i <= b;
const latentRun = (i: number) => LATENT.find((r) => inRun(i, r));
// A checkpoint closes each run, and one sits midway through a long run.
const checkpoint = (i: number) => {
  const r = latentRun(i);
  if (!r) return false;
  const [a, b] = r;
  return i === b || (b - a > 10 && i === Math.round((a + b) / 2));
};
const costly = (i: number) => !inRun(i, SKILL) && !latentRun(i) && hash(i, 5) < 0.3;

/** A serpentine on the floor: three rows joined by half turns, with a gentle rise and fall. */
function pathAt(s: number, out: THREE.Vector3): THREE.Vector3 {
  const turn = Math.PI * R;
  const x0 = -ROW / 2;
  const zs = [-2 * R, 0, 2 * R];
  let left = Math.max(0, s);
  for (let row = 0; row < 3; row++) {
    const dir = row % 2 === 0 ? 1 : -1;
    const z = zs[row] ?? 0;
    const start = dir > 0 ? x0 : -x0;
    if (left <= ROW || row === 2) {
      out.set(start + dir * left, 0, z);
      break;
    }
    left -= ROW;
    if (left <= turn) {
      const a = left / R; // 0 to pi
      const cx = dir > 0 ? -x0 : x0;
      const cz = z + R;
      out.set(cx + dir * Math.sin(a) * R, 0, cz - Math.cos(a) * R);
      break;
    }
    left -= turn;
  }
  out.y = 0.1 * Math.sin(s * 1.1);
  return out;
}

export function build({ small }: BuildContext): Built {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(STAGE, 9, 20);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  scene.add(new THREE.HemisphereLight("#c4b9ad", "#0b0a09", 0.6));
  const key = new THREE.DirectionalLight("#ffe2c8", 1.6);
  key.position.set(3, 7, 5);
  scene.add(key);

  // A faint floor grid, so the chain has somewhere to lie.
  const grid = new THREE.GridHelper(24, 48, "#2b241f", "#191512");
  grid.position.y = -0.32;
  const gm = grid.material as THREE.Material;
  gm.transparent = true;
  gm.opacity = 0.5;
  scene.add(grid);

  const beadGeo = new THREE.SphereGeometry(0.1, 18, 12);
  const beads = new THREE.InstancedMesh(
    beadGeo,
    new THREE.MeshBasicMaterial({ toneMapped: false }),
    N,
  );
  beads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < N; i++) beads.setColorAt(i, new THREE.Color("#000000"));
  beads.frustumCulled = false;
  scene.add(beads);

  // The thread the tokens are strung on.
  const threadPos = new Float32Array(N * 3);
  const threadCol = new Float32Array(N * 3);
  const threadGeo = new THREE.BufferGeometry();
  const tp = new THREE.BufferAttribute(threadPos, 3);
  const tc = new THREE.BufferAttribute(threadCol, 3);
  tp.setUsage(THREE.DynamicDrawUsage);
  tc.setUsage(THREE.DynamicDrawUsage);
  threadGeo.setAttribute("position", tp);
  threadGeo.setAttribute("color", tc);
  const thread = new THREE.Line(
    threadGeo,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }),
  );
  thread.frustumCulled = false;
  scene.add(thread);

  const ringMat = (c: string) =>
    new THREE.MeshStandardMaterial({
      color: "#d8d2c8",
      emissive: new THREE.Color(c),
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.4,
    });
  const taskMat = ringMat("#fff1e0");
  const task = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 16, 48), taskMat);
  scene.add(task);
  const answerMat = ringMat("#ffb070");
  const answer = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 16, 48), answerMat);
  scene.add(answer);

  // A compiled skill: verified code the chain calls instead of reasoning through it.
  const skillMat = new THREE.MeshStandardMaterial({
    color: "#11231d",
    emissive: new THREE.Color("#3fd0a0"),
    emissiveIntensity: 0.55,
    roughness: 0.3,
    metalness: 0.5,
  });
  const skill = new THREE.Group();
  const cube = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skillMat);
  const cubeEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(cube.geometry),
    new THREE.LineBasicMaterial({ color: "#a8ffe0" }),
  );
  skill.add(cube, cubeEdges);
  scene.add(skill);

  const ribbon = sprites(260, small ? 0.2 : 0.17);
  scene.add(ribbon.points);
  const spark = sprites(8, small ? 0.5 : 0.42);
  scene.add(spark.points);
  scene.add(dust(small ? 80 : 180, new THREE.Vector3(16, 5, 10), 17));

  const WARM = new THREE.Color("#ffb070");
  const DIM = new THREE.Color("#5a3a24");
  const HOT = new THREE.Color("#ff3d14");
  const BLUE = new THREE.Color("#6aa8ff");
  const WHITE = new THREE.Color("#fff6ea");
  const TEAL = new THREE.Color("#3fd0a0");
  const c = new THREE.Color();
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();

  // Eased per-token weights: how much path each token takes up, and its look.
  const keep = new Array(N).fill(1); // 0 once pruned
  const fold = new Array(N).fill(0); // 1 once folded into the skill
  const latent = new Array(N).fill(0); // 1 once a latent step
  let head = 0;
  let hold = 0;
  // Centred on what is left of the chain as it shortens (the top rows).
  const camera_ = rig(camera, [
    { pos: new THREE.Vector3(-0.4, 5.6, 6.4), look: new THREE.Vector3(0, -0.2, 0.1) },
    { pos: new THREE.Vector3(-0.3, 5.4, 6.2), look: new THREE.Vector3(0, -0.2, -0.1) },
    { pos: new THREE.Vector3(0.2, 5.2, 6.0), look: new THREE.Vector3(0.1, -0.2, -0.4) },
    { pos: new THREE.Vector3(0.2, 5.2, 6.0), look: new THREE.Vector3(0, -0.2, -0.5) },
  ]);

  return {
    scene,
    camera,
    update(frame: Frame) {
      const { t, dt, state } = frame;
      const step = Math.max(0, Math.min(3, Math.round(state.step)));
      for (let i = 0; i < N; i++) {
        keep[i] = approach(keep[i], step >= 1 && costly(i) ? 0 : 1, dt, 2.4);
        fold[i] = approach(fold[i], step >= 2 && inRun(i, SKILL) ? 1 : 0, dt, 2.0);
        latent[i] = approach(
          latent[i],
          step >= 3 && latentRun(i) && !checkpoint(i) ? 1 : 0,
          dt,
          2.0,
        );
      }
      // Where each token sits: the path it takes up is the sum of the weights before it.
      const skillLen = SKILL[1] - SKILL[0] + 1;
      const weight = (i: number) => {
        const f = fold[i] ?? 0;
        const w = (keep[i] ?? 1) * (1 - f + f / skillLen) * (1 - 0.7 * (latent[i] ?? 0));
        return w * SP;
      };
      const at: number[] = new Array(N);
      let s = 0.45;
      for (let i = 0; i < N; i++) {
        const w = weight(i);
        at[i] = s + w / 2;
        s += w;
      }
      const total = s + 0.45;
      const skillMid = ((at[SKILL[0]] ?? 0) + (at[SKILL[1]] ?? 0)) / 2;

      // Generation: the head runs to the answer, rests, and starts again.
      if (hold > 0) {
        hold -= dt;
        if (hold <= 0) head = 0;
      } else {
        head += dt * SPEED;
        if (head >= total) {
          head = total;
          hold = 1.1;
        }
      }
      const done = hold > 0 ? Math.min(1, hold / 1.1) : 0;

      pathAt(0, task.position).y += 0.05;
      task.rotation.set(Math.PI / 2, 0, 0);
      pathAt(total, answer.position).y += 0.05;
      answer.rotation.set(Math.PI / 2, 0, 0);
      answerMat.emissiveIntensity = 0.5 + done * 2.2;
      taskMat.emissiveIntensity = 0.5 + (head < 1 && hold <= 0 ? 1 - head : 0) * 1.5;

      for (let i = 0; i < N; i++) {
        const k = keep[i] ?? 1;
        const f = fold[i] ?? 0;
        const l = latent[i] ?? 0;
        const si = at[i] ?? 0;
        pathAt(si, p);
        if (f > 0) p.lerp(pathAt(skillMid, q), f);
        // Written yet? Tokens behind the head glow; the one at the head flares.
        const behind = si <= head || hold > 0;
        const near = Math.exp(-Math.abs(head - si) * 3.5) * (hold > 0 ? 0 : 1);
        if (costly(i)) c.copy(HOT);
        else if (checkpoint(i) && step >= 3) c.copy(WHITE);
        else c.copy(WARM).lerp(BLUE, l);
        const bright = (behind ? 1 : 0.22) + near * 1.6;
        if (!behind) c.lerp(DIM, 0.5);
        c.multiplyScalar(bright * (1 - f * 0.85) * Math.max(k, 0.0001));
        // A pruned token flashes as it goes.
        if (costly(i) && step >= 1 && k < 0.98) c.copy(HOT).multiplyScalar(2.2 * k * (1 - k) * 4);
        beads.setColorAt(i, c);
        const size = (costly(i) ? 1.18 : 1) * k * (1 - f) * (1 - 0.55 * l);
        scl.setScalar(Math.max(0.0001, size));
        m4.compose(p, quat, scl);
        beads.setMatrixAt(i, m4);
        threadPos[i * 3] = p.x;
        threadPos[i * 3 + 1] = p.y;
        threadPos[i * 3 + 2] = p.z;
        const tw = (behind ? 0.5 : 0.18) * Math.max(k, 0);
        threadCol[i * 3] = (DIM.r + BLUE.r * l) * tw;
        threadCol[i * 3 + 1] = (DIM.g + BLUE.g * l) * tw;
        threadCol[i * 3 + 2] = (DIM.b + BLUE.b * l) * tw;
      }
      beads.instanceMatrix.needsUpdate = true;
      if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
      tp.needsUpdate = true;
      tc.needsUpdate = true;

      // Latent runs: a continuous ribbon of light between their checkpoints.
      for (const [a, b] of LATENT) {
        const l = latent[a] ?? 0;
        if (l < 0.02) continue;
        const from = (at[a] ?? 0) - SP / 2;
        const to = at[b] ?? 0;
        for (let x = from; x <= to; x += 0.05) {
          const lit = x <= head || hold > 0 ? 1 : 0.25;
          ribbon.put(pathAt(x, p), BLUE, l * lit * (0.55 + 0.25 * Math.sin(x * 9 - t * 6)));
        }
      }
      ribbon.flush();

      // The skill block, where its tokens were.
      const sk = fold[SKILL[0]] ?? 0;
      pathAt(skillMid, skill.position);
      skill.position.y += 0.08;
      skill.scale.setScalar(Math.max(0.0001, sk));
      skill.rotation.y = t * 0.6;
      skill.rotation.x = 0.35;
      const calling = Math.exp(-Math.abs(head - skillMid) * 3);
      skillMat.emissiveIntensity = 0.45 + calling * 2.2 * (hold > 0 ? 0 : 1);
      if (sk > 0.5 && calling > 0.3 && hold <= 0) spark.put(skill.position, TEAL, calling * sk);
      spark.put(pathAt(Math.min(head, total), p), WHITE, hold > 0 ? 0 : 1.2);
      spark.flush();

      camera_(step, frame);
    },
  };
}
