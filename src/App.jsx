import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import AdminRoute from "./auth/AdminRoute.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import StorefrontLayout from "./layouts/StorefrontLayout.jsx";
import HomePage from "./pages/HomePage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

function FoundationPage({ title, description }) {
  return (
    <section className="foundation-page" aria-labelledby="page-title">
      <p className="foundation-page__kicker">CHẬM</p>
      <h1 id="page-title">{title}</h1>
      <p>{description}</p>
    </section>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <StorefrontLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "products",
        element: (
          <FoundationPage
            title="Shop"
            description="The product catalog route is reserved for the next storefront feature scope."
          />
        ),
      },
      {
        path: "account",
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: (
              <FoundationPage
                title="Account"
                description="Protected account routing is in place."
              />
            ),
          },
        ],
      },
      {
        path: "admin",
        element: <AdminRoute />,
        children: [
          {
            index: true,
            element: (
              <FoundationPage
                title="Admin"
                description="Admin route protection is in place."
              />
            ),
          },
        ],
      },
      {
        path: "login",
        element: (
          <FoundationPage
            title="Sign in"
            description="Authentication UI will be implemented in a later scope."
          />
        ),
      },
      {
        path: "404",
        element: <NotFoundPage />,
      },
      {
        path: "*",
        element: <Navigate to="/404" replace />,
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
