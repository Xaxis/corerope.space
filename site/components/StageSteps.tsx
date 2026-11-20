"use client";

// A 3D scene with a picker for its steps. Each step names what the scene shows and carries the
// research's own words for it; choosing one moves the scene there.
import { type ReactNode, useId, useState } from "react";
import { type SceneName, Stage } from "./three/Stage";

export type SceneStep = { key: string; title: string; body: ReactNode };

export function StageSteps({
  scene,
  label,
  legend,
  steps,
}: {
  scene: SceneName;
  /** What the scene shows, for screen readers. */
  label: string;
  /** What the picker chooses, e.g. "Show in the scene". */
  legend: string;
  steps: SceneStep[];
}) {
  const [step, setStep] = useState(0);
  const group = useId();
  const current = steps[step] ?? steps[0];
  return (
    <div className="stage-steps">
      <Stage scene={scene} step={step} label={label} className="stage-wide" />
      <fieldset className="seg-field">
        <legend>{legend}</legend>
        <div className="seg">
          {steps.map((s, i) => (
            <label key={s.key} data-on={i === step}>
              <input
                type="radio"
                name={group}
                checked={i === step}
                onChange={() => setStep(i)}
                className="visually-hidden"
              />
              <span className="seg-n" aria-hidden="true">
                {i + 1}
              </span>
              {s.title}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="stage-steps-body" aria-live="polite">
        {current?.body}
      </div>
    </div>
  );
}
