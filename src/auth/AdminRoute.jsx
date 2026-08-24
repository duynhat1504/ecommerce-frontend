import { Navigate, Outlet, useLocation } from "react-router-dom";

import useAuth from "./useAuth";

export default function AdminRoute() {
  const location = useLocation();
  const { isAdmin, isAuthenticated, status } = useAuth();

  if (status === "loading") {
    return (
      <section className="route-state" aria-live="polite">
        <p>Checking admin access...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
