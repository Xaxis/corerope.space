// Every 3D scene, built and run through every step without a GPU: the scene must build, update at
// every step and parameter without throwing, keep every vertex and the camera finite, and (for a
// scene with steps) put the camera somewhere else for its last step than for its first. A scene bug
// here otherwise shows only as a dark stage in a browser.
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import type { Frame, SceneModule } from "@/components/three/kit";

const modules = import.meta.glob<SceneModule>("../components/three/scenes/*.ts");
/** The steps each scene draws (state.step is clamped to these). */
const STEPS: Record<string, number> = {
  corerope: 1,
  memory: 3,
  wired: 3,
  fleet: 3,
  storage: 3,
  tokens: 4,
  cartridges: 3,
};

beforeAll(() => {
  // glowTexture draws on a 2D canvas; a canvas without a context gives a blank texture.
  globalThis.document ??= {
    createElement: () => ({ width: 0, height: 0, getContext: () => null }),
  } as unknown as Document;
});

function finite(scene: THREE.Object3D) {
  let bad = "";
  scene.traverse((o) => {
    if (!o.matrixWorld.elements.every(Number.isFinite)) bad ||= `matrix of ${o.type}`;
    const geo = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    const pos = geo?.getAttribute?.("position");
    if (pos && !Array.from(pos.array as ArrayLike<number>).every(Number.isFinite))
      bad ||= `positions of ${o.type}`;
    const m = o as THREE.InstancedMesh;
    if (m.isInstancedMesh && !Array.from(m.instanceMatrix.array).every(Number.isFinite))
      bad ||= "instance matrices";
  });
  return bad;
}

describe("3D scenes", () => {
  it("covers every scene file", () => {
    const names = Object.keys(modules).map((k) => k.replace(/^.*\/(\w+)\.ts$/, "$1"));
    expect(names.sort()).toEqual(Object.keys(STEPS).sort());
  });

  for (const [file, load] of Object.entries(modules)) {
    const name = file.replace(/^.*\/(\w+)\.ts$/, "$1");
    for (const small of [false, true]) {
      it(`${name} runs every step${small ? " on a small stage" : ""}`, async () => {
        const mod = await load();
        const built = mod.build({ width: small ? 390 : 1200, height: 560, small });
        built.camera.aspect = small ? 390 / 560 : 1200 / 560;
        const steps = STEPS[name] ?? 1;
        const cams: THREE.Vector3[] = [];
        let t = 0;
        for (let step = 0; step < steps; step++) {
          for (const param of [0, 0.01, 1]) {
            // Six simulated seconds at 30 fps: long enough to pass every phase of a cycle.
            for (let i = 0; i < 180; i++) {
              t += 1 / 30;
              const frame: Frame = {
                t,
                dt: 1 / 30,
                state: { step, param, param2: param * 0.5 },
                pointer: { x: Math.sin(t), y: Math.cos(t) * 0.5 },
                fit: small ? 1.8 : 1,
              };
              built.update(frame);
            }
            built.scene.updateMatrixWorld(true);
            expect(finite(built.scene), `${name} step ${step} param ${param}`).toBe("");
            expect(built.camera.position.toArray().every(Number.isFinite)).toBe(true);
          }
          cams.push(built.camera.position.clone());
        }
        if (steps > 1) {
          const first = cams[0];
          const last = cams[cams.length - 1];
          expect(first && last && first.distanceTo(last)).toBeGreaterThan(0.05);
        }
        built.dispose?.();
      });
    }
  }
});
