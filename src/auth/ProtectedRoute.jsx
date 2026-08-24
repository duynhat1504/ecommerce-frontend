import { Navigate, Outlet, useLocation } from "react-router-dom";

import useAuth from "./useAuth";

export default function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, status } = useAuth();

  if (status === "loading") {
    return (
      <section className="route-state" aria-live="polite">
        <p>Checking your session...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
