import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";

function Avatar({ user, size = 34 }) {
  const label = (user.displayName || user.email || "U").charAt(0).toUpperCase();
  return user.photoURL ? (
    <img className="user-avatar" src={user.photoURL} alt="" width={size} height={size} referrerPolicy="no-referrer" />
  ) : (
    <span className="user-avatar user-initial" aria-hidden="true">
      {label}
    </span>
  );
}

function AccountMenu({ user, go, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item = (label, to) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        setOpen(false);
        go(to);
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="account-menu" ref={ref}>
      <button
        type="button"
        className="account-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        data-testid="account-menu"
      >
        <Avatar user={user} />
        <span className="user-name">{user.displayName || user.email || "Account"}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="account-dropdown" role="menu">
          <div className="account-dropdown-head">
            <strong>{user.displayName || "SHOES Member"}</strong>
            <small>{user.email}</small>
          </div>
          {item("My Account", "/account")}
          {item("My Orders", "/account#orders")}
          {item("My Favorites", "/account#favorites")}
          {item("Security", "/account#security")}
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}

export default function SiteHeader({ go, path, cartCount, favoritesCount, onOpenCart, theme, onToggleTheme, onLogout }) {
  const { user, ready } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    if (!mobileMenu) return undefined;
    const esc = (e) => e.key === "Escape" && setMobileMenu(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [mobileMenu]);

  const nav = (to) => {
    setMobileMenu(false);
    go(to);
  };

  const link = (label, to) => (
    <a
      href={to}
      aria-current={path === to ? "page" : undefined}
      onClick={(e) => {
        e.preventDefault();
        nav(to);
      }}
    >
      {label}
    </a>
  );

  return (
    <>
      <div className="announcement">
        FREE SHIPPING ON ORDERS OVER $150
        <span>✦</span>
        NEW COLLECTION AVAILABLE NOW
      </div>
      <header className="header">
        <nav className="nav container" aria-label="Main">
          <a
            className="logo"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              nav("/");
            }}
          >
            SHOES<span>.</span>
          </a>

          <div className={`nav-links ${mobileMenu ? "open" : ""}`} id="main-menu">
            {link("Home", "/")}
            {link("Shop", "/shop")}
            {link("Categories", "/categories")}
            {link("About", "/about")}
            {mobileMenu && (
              <div className="mobile-only-links">
                {user ? (
                  <>
                    {link("My Account", "/account")}
                    {link("My Orders", "/account#orders")}
                    <button type="button" className="account-btn" onClick={() => { setMobileMenu(false); onLogout(); }}>
                      Log Out
                    </button>
                  </>
                ) : (
                  <>
                    {link("Sign In", "/login")}
                    {link("Create Account", "/register")}
                  </>
                )}
                <button type="button" className="theme-toggle" onClick={onToggleTheme}>
                  {theme === "dark" ? "☀ Light mode" : "☾ Dark mode"}
                </button>
              </div>
            )}
          </div>

          <div className="nav-actions">
            <button type="button" className="icon-btn search-trigger" onClick={() => nav("/shop?focus=search")} aria-label="Search">
              ⌕ <span>Search</span>
            </button>
            <button type="button" className="icon-btn" onClick={() => nav("/account#favorites")} aria-label={`Favorites (${favoritesCount})`}>
              ♡ <span>{favoritesCount}</span>
            </button>
            <button type="button" className="icon-btn" onClick={onOpenCart} aria-label={`Open cart (${cartCount} items)`} data-testid="open-cart">
              🛒 <span>{cartCount}</span>
            </button>

            {!ready ? (
              <span className="account-btn" role="status">
                …
              </span>
            ) : user ? (
              <AccountMenu user={user} go={nav} onLogout={onLogout} />
            ) : (
              <button type="button" className="account-btn" onClick={() => nav("/login")}>
                Sign In
              </button>
            )}

            <button type="button" className="theme-toggle desktop-only" onClick={onToggleTheme} aria-label="Toggle color theme">
              {theme === "dark" ? "☀ Light" : "☾ Dark"}
            </button>
            <button
              type="button"
              className="menu-btn"
              onClick={() => setMobileMenu((m) => !m)}
              aria-label={mobileMenu ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenu}
              aria-controls="main-menu"
            >
              {mobileMenu ? "✕" : "☰"}
            </button>
          </div>
        </nav>
      </header>
    </>
  );
}
