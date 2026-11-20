"use client";

// A story chapter: steps of text scroll past a stage that stays in view, and the scene follows the
// step at the middle of the screen. Steps are in reading order in the page; the stage is decoration
// with its own label, so the chapter reads the same without it.
import { type ReactNode, useEffect, useRef, useState } from "react";
import { type SceneName, Stage } from "./three/Stage";

export type StoryStep = { key: string; title: string; body: ReactNode };

export function StoryChapter({
  id,
  n,
  title,
  scene,
  label,
  steps,
  param,
  param2,
  overlay,
  foot,
  onStep,
}: {
  id: string;
  n: string;
  title: string;
  scene: SceneName;
  label: string;
  steps: StoryStep[];
  param?: number;
  param2?: number;
  overlay?: ReactNode;
  foot?: ReactNode;
  onStep?: (step: number) => void;
}) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    // The band where a step becomes the active one. Beside the stage (wide screens) it is mid-screen;
    // on a narrow screen the stage sits on top, so the band is in the reading area under it.
    const narrow = window.matchMedia("(max-width: 900px)");
    let io: IntersectionObserver | undefined;
    const observe = () => {
      io?.disconnect();
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step ?? 0));
          }
        },
        { rootMargin: narrow.matches ? "-62% 0px -34% 0px" : "-48% 0px -48% 0px" },
      );
      for (const el of refs.current) if (el) io.observe(el);
    };
    observe();
    narrow.addEventListener("change", observe);
    return () => {
      narrow.removeEventListener("change", observe);
      io?.disconnect();
    };
  }, []);

  useEffect(() => onStep?.(active), [active, onStep]);

  return (
    <section className="story" id={id} aria-labelledby={`${id}-title`}>
      <div className="wrap story-grid">
        <div className="story-steps">
          <header className="chapter-head">
            <p className="chapter-n">{n}</p>
            <h2 id={`${id}-title`}>{title}</h2>
          </header>
          {steps.map((s, i) => (
            <article
              key={s.key}
              className="story-step"
              data-step={i}
              data-on={i === active}
              ref={(el) => {
                refs.current[i] = el;
              }}
            >
              <p className="story-step-n" aria-hidden="true">
                {String(i + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
              </p>
              <h3>{s.title}</h3>
              {s.body}
            </article>
          ))}
          {foot}
        </div>
        <div className="story-stage-col">
          <div className="story-sticky">
            <Stage
              scene={scene}
              step={active}
              param={param}
              param2={param2}
              label={label}
              className="story-stage"
            >
              <ol className="story-dots" aria-hidden="true">
                {steps.map((s, i) => (
                  <li key={s.key} data-on={i === active}>
                    {s.title}
                  </li>
                ))}
              </ol>
              {overlay}
            </Stage>
          </div>
        </div>
      </div>
    </section>
  );
}
