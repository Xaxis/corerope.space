import GithubSlugger from "github-slugger";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionView } from "@/components/Markdown";
import { Callout, PageHead } from "@/components/Page";
import { Toc } from "@/components/Toc";
import { DOCS, docTitle, outline, summaryOf, whole, wordCount } from "@/lib/content";
import { EVIDENCE } from "@/lib/markdown";

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const d = DOCS.find((x) => x.slug === slug);
  if (!d) return {};
  const p = summaryOf(d.file);
  return {
    title: docTitle(d.file),
    description: p.slice(0, 200),
    alternates: { canonical: `/research/${d.slug}` },
  };
}

export default async function Doc({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = DOCS.find((x) => x.slug === slug);
  if (!d) notFound();
  const s = whole(d.file);
  // Ids match the rendered headings: the same slugger, over the same headings, in the same order.
  const ids = new GithubSlugger();
  const items = outline(d.file).map((h) => ({
    id: ids.slug(h.text),
    text: h.text,
    depth: h.depth,
  }));
  const minutes = Math.max(1, Math.round(wordCount(d.file) / 230));
  return (
    <div className="wrap">
      <PageHead
        eyebrow={d.kind === "note" ? "Research note" : d.short}
        title={docTitle(d.file)}
        files={[d.file]}
      >
        <p className="crumbs" style={{ marginTop: 18, marginBottom: 0 }}>
          <Link href="/research">Research library</Link> / {d.short} · about {minutes} minutes
        </p>
      </PageHead>
      <div className="with-toc">
        <aside>
          <Toc items={items.filter((i) => i.depth === 2 || d.kind !== "note")} />
        </aside>
        <div className="content">
          {d.kind === "note" && (
            <Callout kind="note">
              <p>
                Each question has a takeaway, then <strong>cited findings</strong> (what the linked
                sources report), <strong>inferences</strong> (the note's own arithmetic and
                reasoning) and <strong>gaps</strong>. Labels mark the weaker evidence:{" "}
                {EVIDENCE.map((e, i) => (
                  <span key={e.kind}>
                    {i > 0 && ", "}
                    <span className={`ev ev-${e.kind}`} title={e.title}>
                      {e.kind}
                    </span>
                  </span>
                ))}
                .
              </p>
            </Callout>
          )}
          <SectionView section={s} slugger={new GithubSlugger()} />
        </div>
      </div>
    </div>
  );
}
