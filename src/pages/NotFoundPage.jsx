import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <p className="not-found__code">404</p>
      <h1 id="not-found-title">Page not found</h1>
      <p>The page you are looking for is not part of this storefront.</p>
      <Link className="button button--primary" to="/">
        Return home
      </Link>
    </section>
  );
}
