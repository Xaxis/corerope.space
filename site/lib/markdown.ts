// Markdown (mdast) to HTML (hast), as the site shows it. Presentation only: the words, numbers and
// links of the research come through unchanged. What is added:
//   - every heading gets GitHub's id for it and a link to itself;
//   - the evidence labels the notes use ([OLDER], [SECONDARY], [not re-fetched], (derived),
//     (vendor claim) and the like) become chips, keeping their exact text;
//   - "10^6" is set as 10 with a superscript 6, which is what it says;
//   - wide tables scroll inside a focusable region, so a phone never scrolls sideways;
//   - a note's "Cited Findings", "Inferences" and "Gaps" sections are marked, so a reader sees which
//     paragraphs report a source and which are the note's own reasoning.
import GithubSlugger from "github-slugger";
import type { Element, ElementContent, Root as HRoot, Text } from "hast";
import { toString as hastToString } from "hast-util-to-string";
import type { Root, RootContent } from "mdast";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export type RenderOptions = {
  /** Shift heading levels so a section's top heading becomes h`top`. */
  top?: number;
  /** Shared across the sections of one page, so ids stay unique. */
  slugger?: GithubSlugger;
};

/** The evidence labels of the research, and what each means. */
export const EVIDENCE: { kind: string; pattern: RegExp; title: string }[] = [
  {
    kind: "older",
    pattern: /\[(?:older|OLDER)(?: boundary)?\]/,
    title: "A result from before 2025",
  },
  {
    kind: "secondary",
    pattern: /\[SECONDARY[^\]]*\]/,
    title: "From a secondary source, not the primary one",
  },
  {
    kind: "unverified",
    pattern: /\[not re-fetched\]/,
    title: "Cited from the paper's abstract or record, not re-read for this research",
  },
  {
    kind: "derived",
    pattern: /\(derived(?:, order-of-magnitude)?\)/,
    title: "Derived: arithmetic on cited figures, not a measurement",
  },
  {
    kind: "vendor",
    pattern:
      /\((?:vendor (?:claim|figure)|company claims? [^)]*|operator-published, not independent)\)/,
    title: "Stated by the company selling the product",
  },
  { kind: "simulated", pattern: /\(simulated\)/, title: "From a simulation, not silicon" },
];

const ANY_EVIDENCE = new RegExp(EVIDENCE.map((e) => e.pattern.source).join("|"), "g");
const POWER = /10\^(\d+)/g;

/** Notes' structural headings and what their sections hold. */
const KINDS: Record<string, { kind: string; label: string }> = {
  "Cited Findings": { kind: "findings", label: "Cited: what the linked sources report" },
  Inferences: { kind: "inferences", label: "Derived: the note's own arithmetic and reasoning" },
  Gaps: { kind: "gaps", label: "Open: what this research could not find" },
  Takeaway: { kind: "takeaway", label: "Takeaway" },
};

function el(
  tagName: string,
  properties: Element["properties"],
  children: ElementContent[],
): Element {
  return { type: "element", tagName, properties, children };
}

function splitText(value: string): ElementContent[] {
  const out: ElementContent[] = [];
  const re = new RegExp(`${ANY_EVIDENCE.source}|${POWER.source}`, "g");
  let last = 0;
  for (const m of value.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ type: "text", value: value.slice(last, i) });
    const token = m[0];
    const power = /^10\^(\d+)$/.exec(token);
    if (power) {
      out.push(
        { type: "text", value: "10" },
        el("sup", {}, [{ type: "text", value: power[1] ?? "" }]),
      );
    } else {
      const ev = EVIDENCE.find((e) => new RegExp(`^${e.pattern.source}$`).test(token));
      out.push(
        el("span", { className: ["ev", `ev-${ev?.kind ?? "other"}`], title: ev?.title }, [
          { type: "text", value: token },
        ]),
      );
    }
    last = i + token.length;
  }
  if (last < value.length) out.push({ type: "text", value: value.slice(last) });
  return out;
}

function transformText(node: Element | HRoot): void {
  const next: ElementContent[] = [];
  let changed = false;
  for (const child of node.children as ElementContent[]) {
    if (child.type === "text") {
      const parts = splitText((child as Text).value);
      if (parts.length !== 1 || parts[0]?.type !== "text") changed = true;
      next.push(...parts);
    } else {
      if (child.type === "element" && !["code", "pre"].includes(child.tagName))
        transformText(child);
      next.push(child);
    }
  }
  if (changed) node.children = next as typeof node.children;
}

function isHeading(n: ElementContent | HRoot["children"][number]): boolean {
  return n.type === "element" && /^h[1-6]$/.test(n.tagName);
}

function decorate(tree: HRoot, opts: RenderOptions): void {
  const slugger = opts.slugger ?? new GithubSlugger();
  let shift: number | null = null;
  const walk = (node: Element | HRoot) => {
    for (const child of node.children) {
      if (child.type !== "element") continue;
      if (isHeading(child)) {
        const depth = Number(child.tagName.slice(1));
        if (shift === null) shift = (opts.top ?? depth) - depth;
        const level = Math.min(6, Math.max(2, depth + shift));
        const text = hastToString(child);
        const id = slugger.slug(text);
        child.tagName = `h${level}`;
        child.properties = { ...child.properties, id, dataDepth: depth };
        child.children = [
          ...child.children,
          el(
            "a",
            { className: ["anchor"], href: `#${id}`, ariaLabel: `Link to this section: ${text}` },
            [{ type: "text", value: "#" }],
          ),
        ];
        continue;
      }
      if (child.tagName === "pre") {
        child.properties = { ...child.properties, tabIndex: 0 };
      }
      if (child.tagName === "a") {
        const href = String(child.properties?.href ?? "");
        if (/^https?:\/\//.test(href)) {
          child.properties = {
            ...child.properties,
            rel: ["noopener", "noreferrer"],
            className: ["ext"],
          };
        }
      }
      walk(child);
    }
  };
  walk(tree);
  transformText(tree);

  // Wrap tables, and mark the notes' structural sections.
  const out: HRoot["children"] = [];
  let group: Element | null = null;
  for (const child of tree.children) {
    if (child.type === "element" && child.tagName === "table") {
      const caption = "Table";
      const wrapped = el(
        "div",
        { className: ["table-wrap"], role: "region", tabIndex: 0, ariaLabel: caption },
        [child],
      );
      (group ? group.children : out).push(wrapped);
      continue;
    }
    if (child.type === "element" && isHeading(child)) {
      const depth = Number(child.properties?.dataDepth);
      const kind = KINDS[hastToString(child).replace(/#$/, "").trim()];
      if (group && depth <= 3) group = null;
      if (kind) {
        group = el("section", { className: ["kind", `kind-${kind.kind}`], dataLabel: kind.label }, [
          child,
        ]);
        out.push(group);
        continue;
      }
    }
    (group ? group.children : out).push(child as ElementContent);
  }
  tree.children = out;
}

/** mdast nodes to the site's hast. */
export function toHast(nodes: RootContent[], opts: RenderOptions = {}): HRoot {
  const root: Root = { type: "root", children: nodes };
  const tree = unified().use(remarkRehype).runSync(structuredClone(root)) as HRoot;
  decorate(tree, opts);
  return tree;
}
