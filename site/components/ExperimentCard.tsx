import Link from "next/link";
import { failCase } from "@/lib/failures";
import { type Experiment, shortName } from "@/lib/inventions";
import { times } from "@/lib/scale";

/** One row of the design's experiment table: what to run, what it tests, the bar, and what failing means. */
export function ExperimentCard({ e, links = true }: { e: Experiment; links?: boolean }) {
  const fail = failCase(e);
  return (
    <article className="exp" id={`experiment-${e.order}`}>
      <div className="exp-num" aria-hidden="true">
        {e.order}
      </div>
      <div className="exp-body">
        <p className="exp-kick">Experiment {e.order}</p>
        <h3 className="exp-title">{e.experiment}</h3>
        <dl className="exp-grid">
          <div>
            <dt>Tests</dt>
            <dd>{e.tests}</dd>
          </div>
          <div className="exp-pass">
            <dt>Pass bar</dt>
            <dd>{e.pass_bar}</dd>
          </div>
          <div className="exp-fail">
            <dt>If it fails</dt>
            <dd>{e.if_it_fails}</dd>
          </div>
        </dl>
        {fail && (
          <p className="exp-model">
            <span
              className="ev ev-derived"
              title="Derived: the cost model's arithmetic, not a measurement"
            >
              derived
            </span>{" "}
            In the cost model, with {fail.change} and the rest central: <b>{times(fail.energy)}</b>{" "}
            less energy and <b>{times(fail.usd)}</b> lower cost per solved task, against{" "}
            {times(fail.central.energy)} and {times(fail.central.usd)}.{" "}
            <Link href={fail.href}>Open this case</Link>
          </p>
        )}
        {links && e.inventions.length > 0 && (
          <p className="exp-links">
            Tests{" "}
            {e.inventions.map((s, i) => (
              <span key={s}>
                {i > 0 && ", "}
                <Link href={`/design#${s}`}>{shortName(s)}</Link>
              </span>
            ))}
          </p>
        )}
      </div>
    </article>
  );
}
