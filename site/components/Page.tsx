import type { ReactNode } from "react";

const ICONS = {
  status: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v4.5M10 13.5v.5" strokeLinecap="round" />
    </svg>
  ),
  gap: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M10 3 18 16.5H2z" strokeLinejoin="round" />
      <path d="M10 8v4M10 14.2v.3" strokeLinecap="round" />
    </svg>
  ),
  todo: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="3" strokeDasharray="3 2.5" />
      <path d="M7 10h6" strokeLinecap="round" />
    </svg>
  ),
  note: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9v5M10 6v.5" strokeLinecap="round" />
    </svg>
  ),
};

/** A boxed aside. Kinds: the project's status, a known gap, a TODO the research leaves open, a note. */
export function Callout({
  kind,
  children,
  label,
}: {
  kind: keyof typeof ICONS;
  children: ReactNode;
  label?: string;
}) {
  return (
    <aside className={`callout callout-${kind}`} aria-label={label}>
      <span className="callout-icon">{ICONS[kind]}</span>
      <div>{children}</div>
    </aside>
  );
}
