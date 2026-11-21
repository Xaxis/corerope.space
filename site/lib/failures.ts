// What failing an experiment would do to the headline numbers, for the experiments whose "if it
// fails" text names one of the cost model's own inputs. The value comes from that text or from the
// cost model's presets (data/costmodel.json), never from here; the case is run through the exact
// port of costmodel.py. If the design doc's wording changes so a case no longer reads, the build
// fails and names it, as quote() does.
import { type Params, run } from "./costmodel";
import type { Experiment } from "./inventions";
import { presets } from "./presets";
import { percent } from "./scale";

export type FailCase = {
  /** What changes, in the doc's terms. */
  change: string;
  /** The calculator with that change applied. */
  href: string;
  energy: number;
  usd: number;
  central: { energy: number; usd: number };
};

function drift(e: Experiment, what: string): never {
  throw new Error(`failures: experiment ${e.order}'s "if it fails" no longer says ${what}`);
}

export function failCase(e: Experiment): FailCase | null {
  const fabric = presets("fabric");
  const central = fabric[1];
  const base = run(central);
  const result = (p: Params, change: string, href: string): FailCase => {
    const r = run(p);
    return {
      change,
      href,
      energy: r.energy_x_per_task,
      usd: r.usd_x_per_task,
      central: { energy: base.energy_x_per_task, usd: base.usd_x_per_task },
    };
  };
  switch (e.order) {
    case 1: {
      // "Above 0.5 pJ, wired silicon is only a speed play": the energy per weight-operation.
      const m = /Above ([\d.]+) pJ/.exec(e.if_it_fails) ?? drift(e, "Above <n> pJ");
      const pj = Number(m[1]);
      return result(
        { ...central, pJ_per_weight_op: pj },
        `${pj} pJ per weight-operation`,
        `/cost-model?pJ_per_weight_op=${pj}`,
      );
    }
    case 6: {
      // "Tokens per task becomes the pessimistic 1.5x inflation": the pessimistic preset's ratio.
      const m =
        /pessimistic ([\d.]+)x inflation/.exec(e.if_it_fails) ?? drift(e, "pessimistic <n>x");
      const ratio = fabric[0].tok_ratio;
      if (ratio !== Number(m[1])) drift(e, `the pessimistic preset's ${ratio}x (it says ${m[1]}x)`);
      return result(
        { ...central, tok_ratio: ratio },
        `${ratio}x more tokens per task`,
        `/cost-model?tok_ratio=${ratio}`,
      );
    }
    case 7: {
      // "NRE returns to ~$40M": the cost model's other scenario, a new chip per model.
      const m = /NRE returns to ~\$(\d+)M/.exec(e.if_it_fails) ?? drift(e, "NRE returns to ~$<n>M");
      const asWritten = presets("as_written")[1];
      if (asWritten.nre_usd !== Number(m[1]) * 1e6)
        drift(e, `the new-chip scenario's NRE (${asWritten.nre_usd})`);
      // The scenario differs from the headline case in exactly two inputs; the card says both.
      const differ = (Object.keys(central) as (keyof Params)[]).filter(
        (k) => central[k] !== asWritten[k],
      );
      if (differ.sort().join() !== "gpu_share,nre_usd")
        drift(e, `a scenario differing only in NRE and GPU share (it differs in ${differ.join()})`);
      return result(
        asWritten,
        `a new chip per model, as costmodel.py is written (~$${m[1]}M NRE and ${percent(asWritten.gpu_share)} of tasks on GPUs)`,
        "/cost-model?scenario=as_written",
      );
    }
    default:
      return null;
  }
}
