import useAuth from "../auth/useAuth";
import "./AdminHomePage.css";

const backendSurfaces = [
  {
    area: "Products",
    contract:
      "GET /api/admin/products, GET /api/admin/products/{id}, DELETE /api/admin/products/{id}",
  },
  {
    area: "Categories",
    contract:
      "GET /api/admin/categories, GET /api/admin/categories/{id}, DELETE /api/admin/categories/{id}",
  },
  {
    area: "Orders",
    contract:
      "GET /api/admin/orders, GET /api/admin/orders/{id}, PUT /api/admin/orders/{id}/status",
  },
  {
    area: "Inventory",
    contract: "GET /api/admin/inventory/products/{productId}/transactions",
  },
];

const foundationChecks = [
  ["Session source", "Existing AuthContext"],
  ["Route guard", "Existing AdminRoute"],
  ["Required role", "ADMIN"],
  ["Admin navigation", "Overview only"],
  ["Dashboard endpoint", "None found"],
];

export default function AdminHomePage() {
  const { user } = useAuth();

  return (
    <section className="admin-home" aria-labelledby="admin-home-title">
      <header className="admin-home__header">
        <div>
          <p className="admin-home__kicker">Admin foundation</p>
          <h1 id="admin-home-title">Operations overview</h1>
        </div>
        <dl className="admin-home__identity" aria-label="Signed in admin">
          <div>
            <dt>Signed in</dt>
            <dd>{user?.email || "Authenticated admin"}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{user?.role || "ADMIN"}</dd>
          </div>
        </dl>
      </header>

      <div className="admin-home__grid">
        <section
          className="admin-home__section"
          aria-labelledby="admin-status-title"
        >
          <div className="admin-home__section-header">
            <h2 id="admin-status-title">Foundation status</h2>
            <p>Current shell and access-control wiring.</p>
          </div>
          <dl className="admin-home__check-list">
            {foundationChecks.map(([label, value]) => (
              <div className="admin-home__check" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="admin-home__section"
          aria-labelledby="admin-contracts-title"
        >
          <div className="admin-home__section-header">
            <h2 id="admin-contracts-title">Verified backend surfaces</h2>
            <p>
              These are backend contracts only. CRUD screens are intentionally
              not linked yet.
            </p>
          </div>
          <table className="admin-home__surface-table">
            <caption className="sr-only">Admin backend surfaces</caption>
            <thead>
              <tr>
                <th scope="col">Area</th>
                <th scope="col">Contract</th>
              </tr>
            </thead>
            <tbody>
              {backendSurfaces.map((surface) => (
                <tr key={surface.area}>
                  <th scope="row">{surface.area}</th>
                  <td>
                    <code>{surface.contract}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </section>
  );
}
