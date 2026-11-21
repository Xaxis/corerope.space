/** The logo's three strokes, drawn in this order, shared with the icons and the share card (and
 * copied by hand into app/icon.svg, which is a static file). */
export const LOGO = {
  back: "M16 5.5 A5.2 10.5 0 0 0 16 26.5",
  wire: "M2 18.5 C 8 18.5, 10 16, 16 16 S 24 13.5, 30 13.5",
  front: "M16 5.5 A5.2 10.5 0 0 1 16 26.5",
} as const;

/** A ferrite ring core with a copper wire threaded through it: a 1 in core rope memory. */
export function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      {/* back half of the ring, behind the wire */}
      <path d={LOGO.back} fill="none" stroke="var(--core)" strokeWidth="4" strokeLinecap="round" />
      {/* the wire, through the hole */}
      <path
        d={LOGO.wire}
        fill="none"
        stroke="var(--accent-mark)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* front half of the ring, over the wire */}
      <path d={LOGO.front} fill="none" stroke="var(--core)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
