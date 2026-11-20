/** A ferrite ring core with a copper wire threaded through it: a 1 in core rope memory. */
export function Logo({ title }: { title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {/* back half of the ring, behind the wire */}
      <path
        d="M16 5.5 A5.2 10.5 0 0 0 16 26.5"
        fill="none"
        stroke="var(--core)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* the wire, through the hole */}
      <path
        d="M2 18.5 C 8 18.5, 10 16, 16 16 S 24 13.5, 30 13.5"
        fill="none"
        stroke="var(--accent-mark)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* front half of the ring, over the wire */}
      <path
        d="M16 5.5 A5.2 10.5 0 0 1 16 26.5"
        fill="none"
        stroke="var(--core)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
