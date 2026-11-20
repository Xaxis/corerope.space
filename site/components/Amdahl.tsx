"use client";

// The Amdahl trap, to play with: choose what share of tasks falls back to GPUs and watch the fleet.
// The gains are the cost model's recorded central case (data/amdahl.json); the GPUs' share of the
// fleet's energy follows from them: a share f at baseline cost, out of a total of 1 / gain.
import amdahl from "@data/amdahl.json";
import { useId, useState } from "react";
import { percent, times } from "@/lib/scale";
import { StoryChapter, type StoryStep } from "./Story";
import { Stage } from "./three/Stage";

export const STOPS = amdahl.recorded.map((r) => ({
  share: r.share,
  gain: r.energy_x,
  gpuEnergy: r.share * r.energy_x,
}));
const CENTRAL = STOPS.findIndex((s) => s.share === 0.0005);

export function AmdahlControl({
  index,
  onChange,
}: {
  index: number;
  onChange: (i: number) => void;
}) {
  const s = STOPS[index] ?? STOPS[0];
  const group = useId();
  return (
    <div className="amdahl">
      <fieldset className="seg-field">
        <legend>Share of tasks that fall back to GPUs</legend>
        <div className="seg">
          {STOPS.map((x, i) => (
            <label key={x.share} data-on={i === index}>
              <input
                type="radio"
                name={group}
                checked={i === index}
                onChange={() => onChange(i)}
                className="visually-hidden"
              />
              {percent(x.share)}
            </label>
          ))}
        </div>
      </fieldset>
      {s && (
        <dl className="amdahl-out" aria-live="polite">
          <div>
            <dt>Less energy per task</dt>
            <dd>{times(s.gain)}</dd>
          </div>
          <div>
            <dt>Ceiling, 1 / share</dt>
            <dd>{s.share > 0 ? times(1 / s.share) : "none"}</dd>
          </div>
          <div>
            <dt>GPUs' share of the energy</dt>
            <dd>{percent(s.gpuEnergy)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

/** The fleet as a story chapter: split mind, two tiers, then the fallback with its control. */
export function FleetStory({
  id,
  n,
  title,
  steps,
  foot,
}: {
  id: string;
  n: string;
  title: string;
  steps: StoryStep[];
  foot?: React.ReactNode;
}) {
  const [index, setIndex] = useState(Math.max(0, CENTRAL));
  const s = STOPS[index] ?? STOPS[0];
  const last = steps.length - 1;
  const withControl = steps.map((st, i) =>
    i === last
      ? {
          ...st,
          body: (
            <>
              {st.body}
              <AmdahlControl index={index} onChange={setIndex} />
            </>
          ),
        }
      : st,
  );
  return (
    <StoryChapter
      id={id}
      n={n}
      title={title}
      scene="fleet"
      label="A 3D fleet: tasks flow through a router into a small wired core with a vast memory tier beneath it, a larger wired core for the hard few, and GPUs for the last resort, which glow with the share of energy they use."
      steps={withControl}
      param={s?.share ?? 0}
      param2={s?.gpuEnergy ?? 0}
      foot={foot}
    />
  );
}

/** The same scene and control outside a story, for the cost model page. */
export function AmdahlStage() {
  const [index, setIndex] = useState(Math.max(0, CENTRAL));
  const s = STOPS[index] ?? STOPS[0];
  return (
    <div className="amdahl-stage">
      <Stage
        scene="fleet"
        step={2}
        param={s?.share ?? 0}
        param2={s?.gpuEnergy ?? 0}
        className="stage-wide"
        label="A 3D fleet: tasks flow to the wired tiers and, at the chosen share, to GPUs, which glow with the share of energy they use."
      />
      <AmdahlControl index={index} onChange={setIndex} />
    </div>
  );
}
