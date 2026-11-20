import Link from "next/link";

export default function NotFound() {
  return (
    <header className="intro">
      <div className="wrap">
        <p className="kicker">
          <span className="kicker-n">404</span>
          Not found
        </p>
        <h1 className="intro-title">This wire goes around the core</h1>
        <div className="intro-lede">
          <p>
            There is no page at this address. The story, the design and the cost model are a click
            away.
          </p>
        </div>
        <div className="actions">
          <Link className="btn btn-primary" href="/">
            The story
          </Link>
          <Link className="btn" href="/design">
            The design
          </Link>
          <Link className="btn" href="/research">
            The research
          </Link>
        </div>
      </div>
    </header>
  );
}
