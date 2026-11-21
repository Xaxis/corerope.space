import type { ReactNode } from "react";
import type { Provenance } from "@/lib/data";
import { blobUrl, type Repo } from "@/lib/site";

type Props = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** data/<name>.json, and the provenance block it carries. */
  data?: { file: string; provenance: Provenance };
  /** Research lines the figure draws on (numbers in prose, specs). */
  sources?: (Repo & { label?: string })[];
  /** The numbers behind the figure, for reading without the chart. */
  table?: ReactNode;
  note?: ReactNode;
  className?: string;
};

/** A chart's frame: what it shows, the chart, its numbers as a table, and where they came from. */
export function Figure({
  title,
  subtitle,
  children,
  data,
  sources = [],
  table,
  note,
  className,
}: Props) {
  const scripts = data ? [data.provenance.script] : [];
  const from = [
    ...sources,
    ...(data?.provenance.sources ?? [])
      .filter((s) => !sources.some((x) => x.path === s))
      .map((path) => ({ path, startLine: undefined, endLine: undefined, label: undefined })),
  ];
  return (
    <figure className={`fig ${className ?? ""}`}>
      <figcaption>
        <p className="fig-title">{title}</p>
        {subtitle && <p className="fig-sub">{subtitle}</p>}
      </figcaption>
      <div className="fig-body">{children}</div>
      <div className="fig-foot">
        {note && <p className="fig-note">{note}</p>}
        {table && (
          <details>
            <summary>Show the numbers</summary>
            {table}
          </details>
        )}
        <div className="fig-prov">
          {data && (
            <span>
              <b>Data</b> <a href={blobUrl({ path: data.file })}>{data.file}</a>
            </span>
          )}
          {scripts.map((s) => (
            <span key={s}>
              <b>Script</b> <a href={blobUrl({ path: s })}>{s}</a>
            </span>
          ))}
          {from.length > 0 && (
            <span>
              <b>From</b>{" "}
              {from.map((s, i) => (
                <span key={`${s.path}${s.startLine ?? ""}`}>
                  <a href={blobUrl(s)}>
                    {s.label ?? s.path.split("/").pop()}
                    {s.startLine ? ` (line\u00a0${s.startLine})` : ""}
                  </a>
                  {i < from.length - 1 && ", "}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
    </figure>
  );
}

/** A plain table for a figure's "Show the numbers". */
export function DataTable({
  head,
  rows,
  caption,
}: {
  head: string[];
  rows: ReactNode[][];
  caption: string;
}) {
  return (
    <section
      className="table-wrap"
      aria-label={caption}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a table wider than the screen scrolls, and the keyboard must reach it
      tabIndex={0}
    >
      <table>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static rows
            <tr key={i}>
              {r.map((c, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static cells
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
