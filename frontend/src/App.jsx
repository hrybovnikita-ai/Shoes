import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "./auth/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import QuickView from "./components/QuickView";
import ShoppingCart from "./components/ShoppingCart";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";
import { useToast } from "./components/Toast";
import { useCart, useCatalog, useConfig, useFavorites, useRecentlyViewed } from "./hooks/useStore";
import { KEYS } from "./lib/storage";
import HomePage from "./pages/HomePage";

import "./App.css";
import "./styles/upgrade.css";
import "./styles/glass.css";

const ProductPage = lazy(() => import("./ProductPage"));
const CheckoutPage = lazy(() => import("./CheckoutPage"));
const SuccessPage = lazy(() => import("./SuccessPage"));
const AccountPage = lazy(() => import("./AccountPage.jsx"));
const AuthPage = lazy(() => import("./AuthPage.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));

function PageFallback() {
  return (
    <div className="page-loading" role="status">
      <span className="spinner" aria-hidden="true" /> Loading…
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageFallback />;
  if (!user) return <Navigate to="/login" replace state={{ from: { pathname: location.pathname, hash: location.hash } }} />;
  return children;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();
  const authState = useAuth();
  const { user, getToken, signOut } = authState;

  // Theme (persisted)
  const [theme, setTheme] = useState(() => (localStorage.getItem(KEYS.theme) === "light" ? "light" : "dark"));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f7f8fa" : "#090909");
    try {
      localStorage.setItem(KEYS.theme, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const catalog = useCatalog();
  const config = useConfig();
  const cart = useCart();
  const favorites = useFavorites({ user, getToken, notify });
  const recent = useRecentlyViewed();

  const [cartOpen, setCartOpen] = useState(false);
  const [quickView, setQuickView] = useState(null);

  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  // Close overlays when the route changes (render-time sync).
  const [seenPath, setSeenPath] = useState(location.pathname);
  if (seenPath !== location.pathname) {
    setSeenPath(location.pathname);
    setCartOpen(false);
    setQuickView(null);
  }

  const go = useCallback((to) => navigate(to), [navigate]);
  const openProduct = useCallback((p) => navigate(`/product/${p.id}`), [navigate]);

  const addToCart = useCallback(
    (product, options) => {
      cart.add(product, options);
      notify(`${product.name} (EU ${options?.size ?? product.size}) added to cart`);
      setCartOpen(true);
    },
    [cart, notify]
  );

  async function handleLogout() {
    try {
      await signOut();
      notify("You have been signed out.");
      navigate("/", { replace: true });
    } catch {
      notify("Could not sign out. Please try again.", { type: "error" });
    }
  }

  const isAuthRoute = /^\/(login|register)(\/|$)/.test(location.pathname);

  const shared = {
    catalog,
    favorites: favorites.favorites,
    onFavorite: favorites.toggle,
    onOpen: openProduct,
    onQuickView: setQuickView,
  };

  const routes = (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<HomePage {...shared} recent={recent.recent} />} />
          <Route path="/shop" element={<HomePage {...shared} recent={recent.recent} />} />
          <Route path="/categories" element={<HomePage {...shared} recent={recent.recent} />} />
          <Route path="/about" element={<HomePage {...shared} recent={recent.recent} />} />
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
          <Route path="/checkout" element={<CheckoutPage cart={cart.cart} config={config} />} />
          <Route path="/success" element={<SuccessPage onComplete={cart.clear} />} />
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
          <Route path="/login/*" element={<AuthPage mode="login" />} />
          <Route path="/register/*" element={<AuthPage mode="register" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );

  if (isAuthRoute) return <div className="app">{routes}</div>;

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
          onOpen={(p) => {
            setQuickView(null);
            openProduct(p);
          }}
        />
      )}
    </div>
  );
}
