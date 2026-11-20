import type { levers } from "@/lib/data";

type Lever = (typeof levers.levers)[number];

/** One row of the survey's lever map, as a card. */
export function LeverCard({ lever }: { lever: Lever }) {
  return (
    <article className="lever">
      <h4 className="lever-name">{lever.lever}</h4>
      <p className="lever-gain">{lever.gain}</p>
      <dl>
        <div>
          <dt>Quality cost</dt>
          <dd>{lever.quality_cost}</dd>
        </div>
        <div>
          <dt>Overlaps with</dt>
          <dd>{lever.overlaps}</dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd>{lever.evidence}</dd>
        </div>
      </dl>
    </article>
  );
}
