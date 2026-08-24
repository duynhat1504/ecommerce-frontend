import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import AdminRoute from "./auth/AdminRoute.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import StorefrontLayout from "./layouts/StorefrontLayout.jsx";
import CartPage from "./pages/CartPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import OAuthCallbackPage from "./pages/OAuthCallbackPage.jsx";
import ProductCatalogPage from "./pages/ProductCatalogPage.jsx";
import ProductDetailPage from "./pages/ProductDetailPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.jsx";

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
        element: <ProductCatalogPage />,
      },
      {
        path: "products/:id",
        element: <ProductDetailPage />,
      },
      {
        path: "cart",
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <CartPage />,
          },
        ],
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
        element: <LoginPage />,
      },
      {
        path: "register",
        element: <RegisterPage />,
      },
      {
        path: "verify-email",
        element: <VerifyEmailPage />,
      },
      {
        path: "oauth2/callback",
        element: <OAuthCallbackPage />,
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
