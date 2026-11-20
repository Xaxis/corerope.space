"use client";

// A dark stage that runs one 3D scene. three.js and the scene load only when the stage nears the
// screen; the scene pauses off screen and in a hidden tab; a reader can pause it (WCAG 2.2.2), and
// one who asked for less motion gets a still frame. Without WebGL the fallback is shown instead.
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Handle } from "./kit";

const LOADERS = {
  corerope: () => import("./scenes/corerope"),
  memory: () => import("./scenes/memory"),
  wired: () => import("./scenes/wired"),
  fleet: () => import("./scenes/fleet"),
} as const;
export type SceneName = keyof typeof LOADERS;

export function Stage({
  scene,
  step = 0,
  param = 0,
  param2 = 0,
  label,
  className,
  fallback,
  children,
}: {
  scene: SceneName;
  step?: number;
  param?: number;
  param2?: number;
  /** What the scene shows, for screen readers. */
  label: string;
  className?: string;
  fallback?: ReactNode;
  /** HTML laid over the scene: captions, readouts, controls. */
  children?: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<Handle | null>(null);
  const live = useRef({ step, param, param2 });
  live.current = { step, param, param2 };
  const [status, setStatus] = useState<"idle" | "ready" | "failed">("idle");
  const [reduced, setReduced] = useState(false);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(still);
    let cancelled = false;
    const fail = () => {
      if (!cancelled) setStatus("failed");
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        Promise.all([import("./kit"), LOADERS[scene]()])
          .then(([kit, mod]) => {
            if (cancelled) return;
            if (!kit.webglAvailable()) return fail();
            handle.current = kit.mount(el, mod, live.current, { still, onLost: fail });
            setStatus("ready");
          })
          .catch(fail);
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      handle.current?.dispose();
      handle.current = null;
    };
  }, [scene]);

  useEffect(() => {
    handle.current?.set({ step, param, param2 });
  }, [step, param, param2]);

  useEffect(() => {
    handle.current?.setPlaying(playing && !reduced);
  }, [playing, reduced]);

  return (
    <div className={`stage${className ? ` ${className}` : ""}`} data-status={status}>
      <div className="stage-gl" ref={host} role="img" aria-label={label} />
      {status === "failed" && <div className="stage-fallback">{fallback}</div>}
      {children}
      {status === "ready" && !reduced && (
        <button
          type="button"
          className="stage-pause"
          aria-pressed={!playing}
          onClick={() => setPlaying((p) => !p)}
        >
          <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
          <span className="visually-hidden">
            {playing ? "Pause the animation" : "Play the animation"}
          </span>
        </button>
      )}
    </div>
  );
}
