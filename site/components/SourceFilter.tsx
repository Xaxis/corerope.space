"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";

/**
 * A search box and a document picker over the server-rendered source list. Each link carries
 * data-q (what it is searched by) and data-docs (the slugs that cite it); a site hides when none of
 * its links match. Without JavaScript the whole list shows.
 */
export function SourceFilter({
  docs,
  total,
  sites,
  children,
}: {
  docs: { slug: string; short: string }[];
  total: number;
  sites: number;
  children: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [doc, setDoc] = useState("");
  const [shown, setShown] = useState({ links: total, sites });
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const root = box.current;
    if (!root) return;
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    let links = 0;
    let nSites = 0;
    for (const site of root.querySelectorAll<HTMLElement>("[data-site]")) {
      let any = false;
      for (const li of site.querySelectorAll<HTMLElement>("[data-q]")) {
        const hay = li.dataset.q ?? "";
        const ok =
          words.every((w) => hay.includes(w)) &&
          (doc === "" || (li.dataset.docs ?? "").split(" ").includes(doc));
        li.hidden = !ok;
        if (ok) {
          any = true;
          links++;
        }
      }
      site.hidden = !any;
      if (any) nSites++;
    }
    setShown({ links, sites: nSites });
  }, [q, doc]);

  return (
    <>
      <search className="source-filter">
        <label htmlFor={`${id}-q`}>
          Search
          <input
            id={`${id}-q`}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="A name, site or address"
            autoComplete="off"
          />
        </label>
        <label htmlFor={`${id}-doc`}>
          Cited in
          <select id={`${id}-doc`} value={doc} onChange={(e) => setDoc(e.target.value)}>
            <option value="">Any document</option>
            {docs.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.short}
              </option>
            ))}
          </select>
        </label>
        <p className="source-count" aria-live="polite">
          {shown.links === total
            ? `${total} links from ${sites} sites`
            : `${shown.links} of ${total} links, from ${shown.sites} ${shown.sites === 1 ? "site" : "sites"}`}
        </p>
      </search>
      <div ref={box}>{children}</div>
      {shown.links === 0 && (
        <p className="source-none">
          No source matches.{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setQ("");
              setDoc("");
            }}
          >
            Show them all
          </button>
        </p>
      )}
    </>
  );
}
