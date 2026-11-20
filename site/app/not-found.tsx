import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap">
      <header className="page-head">
        <p className="eyebrow">Not found</p>
        <h1>This wire goes around the core</h1>
        <p className="lede">
          There is no page at this address. The research, the design and the cost model are a click
          away.
        </p>
        <div className="actions">
          <Link className="btn btn-primary" href="/">
            Home
          </Link>
          <Link className="btn" href="/design">
            The design
          </Link>
          <Link className="btn" href="/research">
            Research library
          </Link>
        </div>
      </header>
    </div>
  );
}
