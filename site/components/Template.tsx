// The one page template. Every page is an intro (kicker, title, lede, the numbers that matter, the
// files it was built from) followed by numbered chapters of the same shape (number, title, a short
// lede from the research, the evidence, and where to read the rest), and ends with the pager.
import GithubSlugger from "github-slugger";
import Link from "next/link";
import type { ReactNode } from "react";
import { docByFile, type Quote } from "@/lib/content";
import { blobUrl, editUrl, PAGES, type Repo } from "@/lib/site";

export type Stat = { value: ReactNode; label: string; note?: ReactNode; tone?: "accent" | "plain" };

export function Stats({ items }: { items: Stat[] }) {
  return (
    <dl className="stats-row">
      {items.map((s) => (
        <div key={s.label} className={`stat-cell${s.tone === "accent" ? " accent" : ""}`}>
          <dt>{s.label}</dt>
          <dd>
            <span className="stat-value">{s.value}</span>
            {s.note && <span className="stat-note">{s.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function PageIntro({
  n,
  kicker,
  title,
  lede,
  stats,
  files,
  children,
}: {
  n: string;
  kicker: string;
  title: string;
  lede: ReactNode;
  stats?: Stat[];
  files: string[];
  children?: ReactNode;
}) {
  return (
    <header className="intro">
      <div className="wrap">
        <p className="kicker">
          <span className="kicker-n">{n}</span>
          {kicker}
        </p>
        <h1 className="intro-title">{title}</h1>
        <div className="intro-lede">{lede}</div>
        {children}
        {stats && <Stats items={stats} />}
        <p className="built-from">
          Built from{" "}
          {files.map((f, i) => (
            <span key={f}>
              {i > 0 && ", "}
              <a href={blobUrl({ path: f })}>
                <code>{f}</code>
              </a>{" "}
              (<a href={editUrl(f)}>edit</a>)
            </span>
          ))}
        </p>
      </div>
    </header>
  );
}

/** Where a heading of a research file lives in the library: its page and anchor. */
export function researchHref(file: string, heading?: string): string {
  const doc = docByFile(file);
  const base = doc ? `/research/${doc.slug}` : blobUrl({ path: file });
  return heading ? `${base}#${new GithubSlugger().slug(heading)}` : base;
}

/** The line every chapter ends with: the lines it came from, and the full text in the library. */
export function ChapterFoot({
  source,
  more,
}: {
  source?: Repo;
  more?: { href: string; label: string };
}) {
  if (!source && !more) return null;
  return (
    <p className="chapter-foot">
      {more && (
        <Link className="more" href={more.href}>
          {more.label}
        </Link>
      )}
      {source && (
        <span className="chapter-source">
          Source:{" "}
          <a href={blobUrl(source)}>
            <code>
              {source.path}
              {source.startLine !== undefined &&
                `, ${source.endLine && source.endLine !== source.startLine ? `lines ${source.startLine} to ${source.endLine}` : `line ${source.startLine}`}`}
            </code>
          </a>
        </span>
      )}
    </p>
  );
}

export function Chapter({
  id,
  n,
  title,
  lede,
  source,
  more,
  layout = "stack",
  aside,
  children,
}: {
  id: string;
  n: string;
  title: string;
  lede?: ReactNode;
  source?: Repo;
  more?: { href: string; label: string };
  /** "stack": lede above, evidence below at full width. "split": lede and aside left, evidence right. */
  layout?: "stack" | "split";
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className={`chapter chapter-${layout}`} id={id} aria-labelledby={`${id}-title`}>
      <div className="wrap">
        <div className="chapter-grid">
          <header className="chapter-head">
            <p className="chapter-n">{n}</p>
            <h2 id={`${id}-title`}>{title}</h2>
            {lede && <div className="chapter-lede">{lede}</div>}
            {aside}
            {layout === "split" && <ChapterFoot source={source} more={more} />}
          </header>
          <div className="chapter-body">{children}</div>
        </div>
        {layout === "stack" && <ChapterFoot source={source} more={more} />}
      </div>
    </section>
  );
}

/** The next and previous page, in reading order. */
export function Pager({ current }: { current: string }) {
  const i = PAGES.findIndex((p) => p.href === current);
  const prev = i > 0 ? PAGES[i - 1] : undefined;
  const next = i >= 0 ? PAGES[i + 1] : undefined;
  return (
    <nav className="pager" aria-label="Pages in order">
      <div className="wrap pager-grid">
        {prev ? (
          <Link className="pager-link prev" href={prev.href}>
            <span className="pager-dir">Previous</span>
            <span className="pager-title">
              <span className="kicker-n">{prev.n}</span>
              {prev.label}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link className="pager-link next" href={next.href}>
            <span className="pager-dir">Next</span>
            <span className="pager-title">
              <span className="kicker-n">{next.n}</span>
              {next.label}
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}

/** A quote from the research, as written (powers of ten set as superscripts). */
export function Q({ q, className }: { q: Quote; className?: string }) {
  const parts = q.text.split(/(10\^\d+)/);
  return (
    <p className={className ?? "q"}>
      {parts.map((t, i) => {
        const m = /^10\^(\d+)$/.exec(t);
        return m ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: the pieces of one fixed sentence
          <span key={i}>
            10<sup>{m[1]}</sup>
          </span>
        ) : (
          t
        );
      })}
    </p>
  );
}
