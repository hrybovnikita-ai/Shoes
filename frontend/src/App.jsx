import { lazy, Suspense, useCallback, useEffect, useState } from "react";

import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { shoesAPI } from "./api";
import { useAuth } from "./auth/AuthContext";

import ErrorBoundary from "./components/ErrorBoundary";
import QuickView from "./components/QuickView";
import ShoppingCart from "./components/ShoppingCart";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";
import { useToast } from "./components/Toast";

import {
  useCart,
  useCatalog,
  useConfig,
  useFavorites,
  useRecentlyViewed,
} from "./hooks/useStore";

import { KEYS } from "./lib/storage";
import HomePage from "./pages/HomePage";

import "./App.css";
import "./styles/upgrade.css";
import "./styles/rounded.css";
import "./styles/collection-toolbar.css";

// Lazy-loaded pages
const ProductPage = lazy(() => import("./ProductPage"));
const CheckoutPage = lazy(() => import("./CheckoutPage"));
const SuccessPage = lazy(() => import("./SuccessPage"));
const AccountPage = lazy(() => import("./AccountPage.jsx"));
const AuthPage = lazy(() => import("./AuthPage.jsx"));

const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));

const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));

const AboutPage = lazy(() => import("./pages/AboutPage.jsx"));

// Loading screen
function PageFallback() {
  return (
    <div className="page-loading" role="status">
      <span className="spinner" aria-hidden="true" />
      Loading…
    </div>
  );
}

// Protected customer routes
function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <PageFallback />;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: {
            pathname: location.pathname,
            hash: location.hash,
          },
        }}
      />
    );
  }

  return children;
}

// Protected administrator routes
function RequireAdmin({ children }) {
  const { user, ready, getFirebaseToken } = useAuth();

  const location = useLocation();

  const [adminStatus, setAdminStatus] = useState("loading");

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      return;
    }

    let cancelled = false;

    async function verifyAdmin() {
      try {
        const token = await getFirebaseToken();

        if (!token) {
          if (!cancelled) {
            setAdminStatus("forbidden");
          }
          return;
        }

        const result = await shoesAPI.getAdminMe(token);

        if (cancelled) return;

        if (result.success === true && result.role === "admin") {
          setAdminStatus("authorized");
        } else {
          setAdminStatus("forbidden");
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Admin verification failed:", error);

        setAdminStatus(
          error.status === 401 || error.status === 403 ? "forbidden" : "error",
        );
      }
    }

    verifyAdmin();

    return () => {
      cancelled = true;
    };
  }, [ready, user, getFirebaseToken]);

  if (!ready || (user && adminStatus === "loading")) {
    return <PageFallback />;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: {
            pathname: location.pathname,
          },
        }}
      />
    );
  }

  if (adminStatus === "forbidden") {
    return (
      <main
        id="main-content"
        style={{
          padding: "80px 24px",
          textAlign: "center",
          minHeight: "60vh",
        }}
      >
        <h1>403 — Access Denied</h1>
        <p>You do not have administrator access.</p>
      </main>
    );
  }

  if (adminStatus === "error") {
    return (
      <main
        id="main-content"
        style={{
          padding: "80px 24px",
          textAlign: "center",
          minHeight: "60vh",
        }}
      >
        <h1>Admin service unavailable</h1>
        <p>Please check the backend connection.</p>
      </main>
    );
  }

  return children;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const { notify } = useToast();

  const authState = useAuth();

  const { user, getToken, signOut } = authState;

  // Theme
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(KEYS.theme) === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "light" ? "#f7f8fa" : "#090909");

    try {
      localStorage.setItem(KEYS.theme, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  // Store hooks
  const catalog = useCatalog();
  const config = useConfig();
  const cart = useCart();

  const favorites = useFavorites({
    user,
    getToken,
    notify,
  });

  const recent = useRecentlyViewed();

  // Overlays
  const [cartOpen, setCartOpen] = useState(false);
  const [quickView, setQuickView] = useState(null);

  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  // Reset route-specific overlays before rendering the destination page.
  const [overlayPath, setOverlayPath] = useState(location.pathname);
  if (overlayPath !== location.pathname) {
    setOverlayPath(location.pathname);
    setCartOpen(false);
    setQuickView(null);
  }

  // Navigation
  const go = useCallback((to) => navigate(to), [navigate]);

  const openProduct = useCallback(
    (product) => {
      navigate(`/product/${product.id}`);
    },
    [navigate],
  );

  // Cart
  const addToCart = useCallback(
    (product, options) => {
      cart.add(product, options);

      notify(
        `${product.name} (EU ${options?.size ?? product.size}) added to cart`,
      );

      setCartOpen(true);
    },
    [cart, notify],
  );

  // Logout
  async function handleLogout() {
    try {
      await signOut();

      notify("You have been signed out.");

      navigate("/", {
        replace: true,
      });
    } catch {
      notify("Could not sign out. Please try again.", { type: "error" });
    }
  }

  const isAuthRoute = /^\/(login|register)(\/|$)/.test(location.pathname);

  const isAdminRoute = /^\/admin(\/|$)/.test(location.pathname);

  // Shared page props
  const shared = {
    catalog,
    favorites: favorites.favorites,
    onFavorite: favorites.toggle,
    onOpen: openProduct,
    onQuickView: setQuickView,
  };

  // Application routes
  const routes = (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route
            path="/"
            element={<HomePage {...shared} recent={recent.recent} />}
          />

          <Route
            path="/shop"
            element={<HomePage {...shared} recent={recent.recent} />}
          />

          <Route
            path="/categories"
            element={<HomePage {...shared} recent={recent.recent} />}
          />

          <Route
            path="/about"
            element={<AboutPage />}
          />

          <Route
            path="/product/:id"
            element={
              <ProductPage
                {...shared}
                products={catalog.products}
                loading={catalog.loading}
                onAddToCart={addToCart}
                onViewed={recent.track}
                recent={recent.recent}
              />
            }
          />

          <Route
            path="/checkout"
            element={<CheckoutPage cart={cart.cart} config={config} />}
          />

          <Route
            path="/success"
            element={<SuccessPage onComplete={cart.clear} />}
          />

          <Route
            path="/account"
            element={
              <RequireAuth>
                <AccountPage
                  products={catalog.products}
                  favorites={favorites.favorites}
                  onToggleFavorite={favorites.toggle}
                  onOpenProduct={openProduct}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onClearRecent={recent.clear}
                  config={config}
                  onLogout={handleLogout}
                />
              </RequireAuth>
            }
          />

          {/* Administrator dashboard */}
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />

          {/* Authentication */}
          <Route path="/login/*" element={<AuthPage mode="login" />} />

          <Route path="/register/*" element={<AuthPage mode="register" />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );

  // Authentication pages without storefront layout
  if (isAuthRoute) {
    return <div className="app">{routes}</div>;
  }

  // Admin page without storefront layout
  if (isAdminRoute) {
    return <div className="app">{routes}</div>;
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <SiteHeader
        go={go}
        path={location.pathname}
        cartCount={cart.count}
        favoritesCount={favorites.favorites.length}
        onOpenCart={() => setCartOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />

      {routes}

      <SiteFooter go={go} />

      <ShoppingCart
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart.cart}
        onUpdate={cart.update}
        onRemove={cart.remove}
        onCheckout={() => {
          setCartOpen(false);
          navigate("/checkout");
        }}
      />

      {quickView && (
        <QuickView
          product={quickView}
          favorite={favorites.favorites.includes(quickView.id)}
          onFavorite={favorites.toggle}
          onClose={() => setQuickView(null)}
          onAdd={addToCart}
          onOpen={(product) => {
            setQuickView(null);
            openProduct(product);
          }}
        />
      )}
    </div>
  );
}
