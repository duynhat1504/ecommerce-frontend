import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import AdminRoute from "./auth/AdminRoute.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import StorefrontLayout from "./layouts/StorefrontLayout.jsx";
import AccountAddressesPage from "./pages/AccountAddressesPage.jsx";
import AccountOrderDetailPage from "./pages/AccountOrderDetailPage.jsx";
import AccountOrdersPage from "./pages/AccountOrdersPage.jsx";
import AccountProfilePage from "./pages/AccountProfilePage.jsx";
import AdminCategoriesPage from "./pages/AdminCategoriesPage.jsx";
import AdminHomePage from "./pages/AdminHomePage.jsx";
import AdminInventoryPage from "./pages/AdminInventoryPage.jsx";
import AdminProductsPage from "./pages/AdminProductsPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import OAuthCallbackPage from "./pages/OAuthCallbackPage.jsx";
import PaymentPage from "./pages/PaymentPage.jsx";
import ProductCatalogPage from "./pages/ProductCatalogPage.jsx";
import ProductDetailPage from "./pages/ProductDetailPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.jsx";

const router = createBrowserRouter([
  {
    path: "/admin",
    element: <AdminRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminHomePage />,
          },
          {
            path: "products",
            element: <AdminProductsPage />,
          },
          {
            path: "categories",
            element: <AdminCategoriesPage />,
          },
          {
            path: "inventory",
            element: <AdminInventoryPage />,
          },
        ],
      },
    ],
  },
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
        path: "checkout",
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <CheckoutPage />,
          },
        ],
      },
      {
        path: "payment/:orderId",
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <PaymentPage />,
          },
        ],
      },
      {
        path: "account",
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <Navigate to="profile" replace />,
          },
          {
            path: "profile",
            element: <AccountProfilePage />,
          },
          {
            path: "orders",
            element: <AccountOrdersPage />,
          },
          {
            path: "addresses",
            element: <AccountAddressesPage />,
          },
          {
            path: "orders/:orderId",
            element: <AccountOrderDetailPage />,
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
