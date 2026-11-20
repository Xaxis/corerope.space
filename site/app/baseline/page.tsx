import GithubSlugger from "github-slugger";
import type { Metadata } from "next";
import Link from "next/link";
import { DecodeFigure, MarketFigure, TokensFigure } from "@/components/figures";
import { SectionView } from "@/components/Markdown";
import { PageHead } from "@/components/Page";
import { firstParagraph, indexOf, part, section } from "@/lib/content";

const SURVEY = "research/01-report-path-to-1000x.md";

export const metadata: Metadata = {
  title: "The baseline",
  description:
    "Why 1000x is measured in dollars and joules per solved task, and why a 2024 baseline and a late-2026 baseline give very different answers.",
  alternates: { canonical: "/baseline" },
};

export default function Baseline() {
  const s = section(SURVEY, "Two baselines and one metric", { withHeading: false });
  const b24 = indexOf(s, "Baseline B2024");
  const b26 = indexOf(s, "Baseline B2026");
  const trend = indexOf(s, "What the market trend already delivers");
  const slugger = new GithubSlugger();
  // The survey's own one-line answer to "which 1000x?", from its conclusion.
  const conclusion = firstParagraph(section(SURVEY, "Conclusion")).split(/(?<=\.)\s/)[0];
  return (
    <div className="wrap">
      <PageHead
        eyebrow="The baseline"
        title="Two baselines and one metric: dollars and joules per solved task"
        lede={conclusion}
        files={[SURVEY]}
      />
      <div className="page-body">
        <SectionView section={part(s, 0, b24)} slugger={slugger} />
        <TokensFigure />
        <SectionView section={part(s, b24, b26)} slugger={slugger} />
        <DecodeFigure />
        <SectionView section={part(s, b26, trend)} slugger={slugger} />
        <SectionView section={part(s, trend)} top={2} slugger={slugger} />
        <MarketFigure />
        <nav className="next-link" aria-label="Next">
          <Link href="/levers" className="card">
            <span className="kicker">Next</span>
            <h3>The levers: what November 2026 actually measures</h3>
          </Link>
        </nav>
      </div>
    </div>
  );
}
