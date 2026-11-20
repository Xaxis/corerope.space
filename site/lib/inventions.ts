// The design's seven parts, as its sections lay them out: six numbered inventions plus the two-tier
// fleet. Titles and summaries are read from research/02-corerope-design.md; only the URL slugs and
// the order are set here.
import { firstParagraph, type Section, section } from "./content";
import { roadmap } from "./data";

export const DESIGN = "research/02-corerope-design.md";

const LIST = [
  { slug: "split-mind", prefix: "Invention 1:" },
  { slug: "wired-ternary", prefix: "Invention 2:" },
  { slug: "rom-core", prefix: "Invention 3:" },
  { slug: "lookup-in-storage", prefix: "Invention 4:" },
  { slug: "tokens-per-task", prefix: "Invention 5:" },
  { slug: "context-cartridges", prefix: "Invention 6:" },
  { slug: "two-tier-fleet", prefix: "The Amdahl trap" },
] as const;

export type Slug = (typeof LIST)[number]["slug"];
export type Experiment = (typeof roadmap.experiments)[number];

export type Invention = {
  slug: Slug;
  /** "Invention 2", or "Part 7" for the fleet. */
  number: string;
  /** The heading without its "Invention N:" prefix. */
  name: string;
  heading: string;
  summary: string;
  section: Section;
  experiments: Experiment[];
};

export function inventions(): Invention[] {
  return LIST.map((x, i) => {
    const s = section(DESIGN, x.prefix);
    const m = /^Invention (\d+):\s*(.*)$/.exec(s.title);
    return {
      slug: x.slug,
      number: m ? `Invention ${m[1]}` : `Part ${i + 1}`,
      name: m ? (m[2] ?? s.title) : s.title,
      heading: s.title,
      summary: firstParagraph(s),
      section: s,
      experiments: roadmap.experiments.filter((e) => e.inventions.includes(x.slug)),
    };
  });
}

export function invention(slug: string): Invention | undefined {
  return inventions().find((x) => x.slug === slug);
}
