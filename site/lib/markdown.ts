// Markdown (mdast) to HTML (hast), as the site shows it. Presentation only: the words, numbers and
// links of the research come through unchanged. What is added:
//   - every heading gets GitHub's id for it and a link to itself;
//   - the evidence labels the notes use ([OLDER], [SECONDARY], [not re-fetched], (derived),
//     (vendor claim) and the like) become chips, keeping their exact text;
//   - a power written with a caret ("10^6", "C^0.5095", "e^(-P_w/gamma_w)") is set as a superscript,
//     which is what it says, and "3 x 10^16" does not break across lines;
//   - the design's figure specifications ("[Diagram: ...]", "[Chart: ...]") become a box that says
//     where the site draws the figure, with the specification as written folded inside it;
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
    // "[older]", or "older" closing a parenthesis: "(Dec 2024, older)", "(arXiv Nov 2024, so older)".
    pattern: /\[(?:older|OLDER)(?: boundary)?\]|(?<=[,;] (?:so )?)older(?: result)?(?=\))/,
    title: "A result from before 2025",
  },
  {
    kind: "secondary",
    pattern: /\[SECONDARY[^\]]*\]/,
    title: "From a secondary source, not the primary one",
  },
  {
    kind: "unverified",
    pattern: /\[not re-fetched\]|(?<=, )unverified(?=\))/,
    title: "Cited from the paper's abstract or record, not re-read for this research",
  },
  {
    kind: "derived",
    pattern: /\(derived(?:, order-of-magnitude)?\)|(?<=, )derived(?=\))/,
    title: "Derived: arithmetic on cited figures, not a measurement",
  },
  {
    kind: "vendor",
    // Whole: "(vendor claim)"; or closing a parenthesis: "(NVFP4, vendor)"; or opening one:
    // "(company claim, May 20, 2026)".
    pattern:
      /\((?:vendor (?:claim|figure)|company claims? [^)]*|operator-published, not independent|NVIDIA claim)\)|(?<=[,;] )(?:a )?vendor(?: claim| measurement|-adjacent)?(?=\))|(?<=\()company claim(?=[,;])/,
    title: "Stated by the company selling the product",
  },
  { kind: "simulated", pattern: /\(simulated\)/, title: "From a simulation, not silicon" },
];

const ANY_EVIDENCE = new RegExp(EVIDENCE.map((e) => e.pattern.source).join("|"), "g");
/** A caret after a number, a name or a closing parenthesis: the exponent is a number, a name or a
 * parenthesized group. */
const POWER = /(?<=[\w)])\^(\([^()]*\)|\d+(?:\.\d+)?|[A-Za-z_]\w*)/g;
/** What must not break across lines: an arrow ("->"), a range or a hyphenated name with a number
 * ("55-82%", "2.45-11.53", "GLM-5"), a command-line flag ("-noabc"), and a number with its unit
 * ("815 mm2"). */
const GLUE =
  /->|[\w.$~-]*\w-\d[\w.%-]*|(?<=^|\s)-[a-z][\w-]*|\d[\d,.]* (?:mm2|mm|nm|[KMGTP]i?B|[mµunpf]?J|[mkMG]?W|[mµun]?s|[KMG]?Hz)\b/g;

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

function splitText(raw: string): ElementContent[] {
  // A " | " between links keeps to the link before it.
  const value = raw.replace(/ \| /g, "\u00a0| ");
  const out: ElementContent[] = [];
  const re = new RegExp(`${ANY_EVIDENCE.source}|${POWER.source}|${GLUE.source}`, "g");
  let last = 0;
  for (const m of value.matchAll(re)) {
    const i = m.index ?? 0;
    const token = m[0];
    const power = token.startsWith("^") ? token.slice(1) : null;
    if (i > last) {
      const before = value.slice(last, i);
      // "3 x 10^16" stays on one line.
      out.push({
        type: "text",
        value: power ? before.replace(/(\S) ([x×]) (\S+)$/, "$1\u00a0$2\u00a0$3") : before,
      });
    }
    // Which label it is, tested where it stands: some patterns read the text around them.
    const ev = power
      ? undefined
      : EVIDENCE.find((e) => {
          const at = new RegExp(e.pattern.source, "y");
          at.lastIndex = i;
          return at.exec(value)?.[0] === token;
        });
    if (power) {
      out.push(el("sup", {}, [{ type: "text", value: power }]));
    } else if (ev) {
      // The pill is the bracket: "[OLDER]))" read as three closing brackets.
      const label = /^[[(].*[\])]$/.test(token) ? token.slice(1, -1) : token;
      // A long label ("SECONDARY, blog recap citing third-party timelines") may wrap on a phone.
      const long = label.length > 28 ? ["ev-long"] : [];
      out.push(
        el("span", { className: ["ev", `ev-${ev.kind}`, ...long], title: ev.title }, [
          { type: "text", value: label },
        ]),
      );
    } else {
      out.push(el("span", { className: ["nowrap"] }, [{ type: "text", value: token }]));
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
      const only = parts[0];
      if (parts.length !== 1 || only?.type !== "text" || only.value !== (child as Text).value)
        changed = true;
      next.push(...parts);
    } else {
      if (child.type === "element" && !["code", "pre"].includes(child.tagName))
        transformText(child);
      next.push(child);
    }
  }
  if (changed) node.children = next as typeof node.children;
}

/** Where the site draws each of the design's specified figures. */
const DRAWN: Record<string, { href: string; page: string }> = {
  Diagram: { href: "/design#two-tier-fleet", page: "the design page" },
  Chart: { href: "/cost-model#budget", page: "the cost model page" },
};

/**
 * A "[Diagram: ...]" or "[Chart: ...]" paragraph, the design's specification of a figure, as a box:
 * the figure's title, where the site draws it from its data, and the specification as written.
 */
function figureSpec(p: Element): Element | null {
  const text = hastToString(p);
  const m = /^\[(Diagram|Chart): "([^"]+)"/.exec(text);
  if (!m?.[1] || !m[2] || !text.endsWith("]")) return null;
  const drawn = DRAWN[m[1]];
  if (!drawn) return null;
  const t = (value: string): Text => ({ type: "text", value });
  return el("aside", { className: ["figure-spec"], ariaLabel: `${m[1]} specification` }, [
    el("p", { className: ["figure-spec-kind"] }, [t(m[1])]),
    el("p", { className: ["figure-spec-title"] }, [t(m[2])]),
    el("p", {}, [
      t("The site draws this from its data on "),
      el("a", { href: drawn.href }, [t(drawn.page)]),
      t("."),
    ]),
    el("details", {}, [
      el("summary", {}, [t("The specification, as written")]),
      el("p", {}, [t(text)]),
    ]),
  ]);
}

/** A table's body rows. */
function* rowsOf(table: Element): Generator<Element> {
  for (const part of table.children)
    if (part.type === "element" && part.tagName === "tbody")
      for (const r of part.children) if (r.type === "element" && r.tagName === "tr") yield r;
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
    const spec = child.type === "element" && child.tagName === "p" ? figureSpec(child) : null;
    if (spec) {
      (group ? group.children : out).push(spec);
      continue;
    }
    if (child.type === "element" && child.tagName === "table") {
      const caption = "Table";
      // A first column of single short words (a rank, an order, "Dropped") needs no reading width.
      const firsts = [...rowsOf(child)].map((r) => {
        const cell = r.children.find((c): c is Element => c.type === "element");
        return cell ? hastToString(cell).trim() : "";
      });
      const narrow = firsts.length > 0 && firsts.every((t) => /^\S{1,10}$/.test(t));
      for (const r of rowsOf(child))
        for (const c of r.children)
          if (c.type === "element" && hastToString(c).length > 60)
            c.properties = { ...c.properties, className: ["long"] };
      const wrapped = el(
        "div",
        {
          className: narrow ? ["table-wrap", "narrow-first"] : ["table-wrap"],
          role: "region",
          tabIndex: 0,
          ariaLabel: caption,
        },
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
