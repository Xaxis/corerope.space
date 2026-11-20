// Where a token's energy goes. A GPU package: the die in the middle, HBM stacks beside it, and the
// weights streaming from memory to the die as glowing bits, because every weight is fetched for
// every use. The die's compute tiles flicker dimly: the arithmetic is the cheap part.
//   step 0: the package, streaming.   step 1: closer, on the stream.
//   step 2: weights become wires: the stacks sink away, the stream stops, the die becomes a weave.
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

export const bloom = { strength: 1.0, radius: 0.6, threshold: 0.55 };

const STACKS = [
  [-1.95, -0.62],
  [-1.95, 0.62],
  [1.95, -0.62],
  [1.95, 0.62],
] as const;
const LAYERS = 8;

type DieMaterial = THREE.ShaderMaterial & {
  uniforms: { uTime: { value: number }; uWired: { value: number } };
};
function dieMaterial(): DieMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWired: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uWired;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        // Today: a grid of tensor-core tiles, each flickering faintly as it computes.
        vec2 g = vUv * 18.0;
        vec2 id = floor(g);
        vec2 f = fract(g);
        float edge = step(0.08, f.x) * step(0.08, f.y) * step(f.x, 0.92) * step(f.y, 0.92);
        float h = hash(id);
        float flick = step(0.82, fract(h * 7.0 + uTime * (0.6 + h)));
        vec3 tiles = mix(vec3(0.05, 0.06, 0.075), vec3(0.09, 0.12, 0.16), edge) + vec3(0.12, 0.3, 0.75) * flick * edge * 0.55;
        // Wired: a crossbar of fixed wires, with activations running along the rows.
        vec2 w = vUv * vec2(1.0, 26.0);
        float row = floor(w.y);
        float line = smoothstep(0.42, 0.5, fract(w.y)) * smoothstep(0.58, 0.5, fract(w.y));
        float col = smoothstep(0.035, 0.0, abs(fract(vUv.x * 26.0) - 0.5) - 0.0) * 0.35;
        float head = fract(uTime * (0.25 + hash(vec2(row, 3.0)) * 0.3) + hash(vec2(row, 9.0)));
        float d = vUv.x - head;
        float pulse = d <= 0.0 ? exp(d * 14.0) : exp(-d * 200.0);
        float zero = step(0.35, hash(vec2(row, floor(uTime * 0.5))));
        vec3 wired = vec3(0.05, 0.04, 0.035) + vec3(0.62, 0.26, 0.1) * line + vec3(0.18, 0.3, 0.55) * col + vec3(1.0, 0.6, 0.3) * line * pulse * zero * 3.2;
        gl_FragColor = vec4(mix(tiles, wired, uWired), 1.0);
      }`,
  }) as DieMaterial;
}

export function build({ small }: BuildContext): Built {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(STAGE, 8, 18);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  scene.add(new THREE.HemisphereLight("#b9b0a6", "#0b0a09", 0.55));
  const key = new THREE.DirectionalLight("#ffe2c8", 2.2);
  key.position.set(4, 6, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#5a8edc", 2.2);
  rim.position.set(-5, 2, -4);
  scene.add(rim);

  const pkg = new THREE.Mesh(
    new THREE.BoxGeometry(7.4, 0.16, 4.2),
    new THREE.MeshStandardMaterial({ color: "#14211b", roughness: 0.85, metalness: 0.1 }),
  );
  pkg.position.y = -0.08;
  scene.add(pkg);
  const interposer = new THREE.Mesh(
    new THREE.BoxGeometry(5.7, 0.08, 3.1),
    new THREE.MeshStandardMaterial({ color: "#2b2b29", roughness: 0.42, metalness: 0.65 }),
  );
  interposer.position.y = 0.04;
  scene.add(interposer);

  const die = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.16, 2.4),
    new THREE.MeshStandardMaterial({ color: "#1a1c20", roughness: 0.6, metalness: 0.4 }),
  );
  die.position.y = 0.16;
  scene.add(die);
  const dieTop = dieMaterial();
  const top = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), dieTop);
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.242;
  scene.add(top);

  // HBM: eight stacked DRAM dies per stack, with thin bond layers between them.
  const stacks = new THREE.Group();
  scene.add(stacks);
  const layerGeo = new THREE.BoxGeometry(0.82, 0.056, 1.0);
  const bondGeo = new THREE.BoxGeometry(0.825, 0.006, 1.005);
  const dram = new THREE.MeshStandardMaterial({
    color: "#24221f",
    roughness: 0.62,
    metalness: 0.35,
    transparent: true,
  });
  const bond = new THREE.MeshStandardMaterial({
    color: "#4a3b28",
    roughness: 0.45,
    metalness: 0.8,
    emissive: new THREE.Color("#ff7a30"),
    emissiveIntensity: 0.05,
    transparent: true,
  });
  const layers = new THREE.InstancedMesh(layerGeo, dram, STACKS.length * LAYERS);
  const bonds = new THREE.InstancedMesh(bondGeo, bond, STACKS.length * LAYERS);
  const m4 = new THREE.Matrix4();
  STACKS.forEach(([x, z], s) => {
    for (let l = 0; l < LAYERS; l++) {
      const y = 0.12 + l * 0.068;
      m4.makeTranslation(x, y, z);
      layers.setMatrixAt(s * LAYERS + l, m4);
      m4.makeTranslation(x, y + 0.031, z);
      bonds.setMatrixAt(s * LAYERS + l, m4);
    }
  });
  stacks.add(layers, bonds);

  // The bits: each runs an arc from a stack's top to a point on the die, again and again.
  const count = small ? 700 : 1600;
  const r = rng(3);
  const from: THREE.Vector3[] = [];
  const to: THREE.Vector3[] = [];
  const speed: number[] = [];
  const offset: number[] = [];
  for (let i = 0; i < count; i++) {
    const [sx, sz] = STACKS[i % STACKS.length] ?? [0, 0];
    from.push(new THREE.Vector3(sx + (r() - 0.5) * 0.6, 0.66, sz + (r() - 0.5) * 0.8));
    to.push(new THREE.Vector3((r() - 0.5) * 2.0, 0.26, (r() - 0.5) * 2.0));
    speed.push(0.3 + r() * 0.35);
    offset.push(r());
  }
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const bitsGeo = new THREE.BufferGeometry();
  const posAttr = dynamicAttribute(bitsGeo, "position", pos);
  const colAttr = dynamicAttribute(bitsGeo, "color", col);
  const bits = new THREE.Points(
    bitsGeo,
    new THREE.PointsMaterial({
      size: small ? 0.12 : 0.1,
      map: glowTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(bits);
  const motes = dust(small ? 100 : 220, new THREE.Vector3(14, 5, 9), 21);
  scene.add(motes);

  const hot = new THREE.Color("#ff8a3d");
  const p = new THREE.Vector3();
  const c = new THREE.Vector3();
  const mix = { wired: 0, sink: 0 };
  const camPos = new THREE.Vector3(0, 4.6, 6.4);
  const camLook = new THREE.Vector3();
  const VIEWS = [
    { pos: new THREE.Vector3(0.4, 4.4, 6.6), look: new THREE.Vector3(0, 0.1, 0) },
    { pos: new THREE.Vector3(3.9, 2.0, 3.5), look: new THREE.Vector3(1.2, 0.4, 0) },
    { pos: new THREE.Vector3(-0.3, 4.9, 5.0), look: new THREE.Vector3(0, 0.0, 0.1) },
  ];

  return {
    scene,
    camera,
    update({ t, dt, state, pointer, fit }: Frame) {
      const step = Math.max(0, Math.min(2, Math.round(state.step)));
      mix.wired = approach(mix.wired, step === 2 ? 1 : 0, dt, 1.6);
      mix.sink = approach(mix.sink, step === 2 ? 1 : 0, dt, 1.2);
      dieTop.uniforms.uTime.value = t;
      dieTop.uniforms.uWired.value = mix.wired;

      stacks.position.y = -mix.sink * 1.2;
      dram.opacity = 1 - mix.sink;
      bond.opacity = 1 - mix.sink;
      stacks.visible = mix.sink < 0.99;
      bond.emissiveIntensity = (1 - mix.sink) * (0.08 + 0.14 * (0.5 + 0.5 * Math.sin(t * 3)));

      const flow = 1 - mix.wired;
      for (let i = 0; i < count; i++) {
        const k = (((t * (speed[i] ?? 0.4) + (offset[i] ?? 0)) % 1) + 1) % 1;
        const a = from[i] as THREE.Vector3;
        const b = to[i] as THREE.Vector3;
        c.copy(a).add(b).multiplyScalar(0.5);
        c.y += 0.9 + (i % 5) * 0.08;
        // Quadratic Bezier from the stack over the gap to the die.
        p.copy(a)
          .multiplyScalar((1 - k) * (1 - k))
          .addScaledVector(c, 2 * (1 - k) * k)
          .addScaledVector(b, k * k);
        p.y -= mix.sink * 1.2 * (1 - k);
        pos[i * 3] = p.x;
        pos[i * 3 + 1] = p.y;
        pos[i * 3 + 2] = p.z;
        const lum = Math.min(1, Math.sin(k * Math.PI) * 1.6) * flow * 1.4;
        col[i * 3] = hot.r * lum;
        col[i * 3 + 1] = hot.g * lum;
        col[i * 3 + 2] = hot.b * lum;
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      motes.rotation.y = t * 0.012;
      const v = VIEWS[step] ?? VIEWS[0];
      if (v) {
        camPos.x = approach(camPos.x, v.pos.x, dt, 1.4);
        camPos.y = approach(camPos.y, v.pos.y, dt, 1.4);
        camPos.z = approach(camPos.z, v.pos.z, dt, 1.4);
        camLook.x = approach(camLook.x, v.look.x, dt, 1.4);
        camLook.y = approach(camLook.y, v.look.y, dt, 1.4);
        camLook.z = approach(camLook.z, v.look.z, dt, 1.4);
      }
      const sway = Math.sin(t * 0.13) * 0.25;
      const zoom = fit;
      camera.position.set(
        (camPos.x + sway + pointer.x * 0.5) * zoom,
        (camPos.y - pointer.y * 0.3) * zoom,
        camPos.z * zoom,
      );
      camera.lookAt(camLook);
    },
  };
}
