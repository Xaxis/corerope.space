import type GithubSlugger from "github-slugger";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { RootContent } from "mdast";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import type { Section } from "@/lib/content";
import { toHast } from "@/lib/markdown";
import { SourceLink } from "./SourceLink";

type Props = {
  nodes: RootContent[];
  /** Level of the first heading, after shifting. */
  top?: number;
  slugger?: GithubSlugger;
  className?: string;
};

/** Research Markdown, rendered as written. */
export function Markdown({ nodes, top, slugger, className }: Props) {
  const tree = toHast(nodes, { top, slugger });
  return <div className={className ?? "prose"}>{toJsxRuntime(tree, { Fragment, jsx, jsxs })}</div>;
}

/** A section of a research file, with a link to the lines it came from. */
export function SectionView({
  section,
  top,
  slugger,
  source = true,
}: {
  section: Section;
  top?: number;
  slugger?: GithubSlugger;
  source?: boolean;
}) {
  return (
    <div className="section">
      <Markdown nodes={section.nodes} top={top} slugger={slugger} />
      {source && (
        <SourceLink path={section.file} startLine={section.startLine} endLine={section.endLine} />
      )}
    </div>
  );
}
