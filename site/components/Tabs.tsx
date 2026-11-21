"use client";

import { type ReactNode, useId, useState } from "react";

/** A segmented switch between panels. Every panel is in the page's HTML, and print shows them all. */
export function Tabs({
  labels,
  children,
  label,
}: {
  labels: string[];
  children: ReactNode[];
  label: string;
}) {
  const [at, setAt] = useState(0);
  const id = useId();
  return (
    <div>
      <div className="seg" role="tablist" aria-label={label}>
        {labels.map((l, i) => (
          <button
            key={l}
            type="button"
            role="tab"
            id={`${id}-t${i}`}
            aria-selected={i === at}
            aria-controls={`${id}-p${i}`}
            tabIndex={i === at ? 0 : -1}
            onClick={() => setAt(i)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              const next = (at + (e.key === "ArrowRight" ? 1 : labels.length - 1)) % labels.length;
              setAt(next);
              document.getElementById(`${id}-t${next}`)?.focus();
            }}
          >
            {l}
          </button>
        ))}
      </div>
      {children.map((c, i) => (
        <div
          key={labels[i]}
          role="tabpanel"
          id={`${id}-p${i}`}
          aria-labelledby={`${id}-t${i}`}
          hidden={i !== at}
          style={{ marginTop: 18 }}
        >
          {c}
        </div>
      ))}
    </div>
  );
}
