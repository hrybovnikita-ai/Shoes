
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";

import { auth } from "./firebase";
import AuthPage from "./AuthPage.jsx";
import AccountPage from "./AccountPage.jsx";
import ProductPage from "./ProductPage";
import CheckoutPage from "./CheckoutPage";
import SuccessPage from "./SuccessPage";
import { shoesAPI } from "./api";
import ShoppingCart from "./components/ShoppingCart";

import "./App.css";

// ==========================================
// DEMO PRODUCT CATALOG
// ==========================================

const products = [
  {
    id: 1,
    name: "Nike Air Max 270",
    brand: "Nike",
    category: "Running",
    price: 150,
    oldPrice: 185,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900",
    color: "Red",
    badge: "BESTSELLER",
    rating: 4.9,
  },
  {
    id: 2,
    name: "Adidas Ultraboost",
    brand: "Adidas",
    category: "Running",
    price: 180,
    oldPrice: 220,
    image:
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=900",
    color: "White",
    badge: "NEW",
    rating: 4.8,
  },
  {
    id: 3,
    name: "Nike Air Jordan",
    brand: "Nike",
    category: "Lifestyle",
    price: 210,
    oldPrice: 250,
    image:
      "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=900",
    color: "Black",
    badge: "HOT",
    rating: 4.9,
  },
  {
    id: 4,
    name: "New Balance Classic",
    brand: "New Balance",
    category: "Lifestyle",
    price: 135,
    oldPrice: 165,
    image:
      "https://images.unsplash.com/photo-1539185441755-769473a23570?w=900",
    color: "Grey",
    badge: "POPULAR",
    rating: 4.7,
  },
  {
    id: 5,
    name: "Converse All Star",
    brand: "Converse",
    category: "Casual",
    price: 85,
    oldPrice: 110,
    image:
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=900",
    color: "Black",
    badge: "CLASSIC",
    rating: 4.8,
  },
  {
    id: 6,
    name: "Nike Street Edition",
    brand: "Nike",
    category: "Lifestyle",
    price: 165,
    oldPrice: 195,
    image:
      "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=900",
    color: "White",
    badge: "TRENDING",
    rating: 4.6,
  },
];

// ==========================================
// CATEGORIES
// ==========================================

const categories = [
  {
    name: "Running",
    subtitle: "Built for movement",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700",
  },
  {
    name: "Lifestyle",
    subtitle: "Everyday icons",
    image:
      "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=700",
  },
  {
    name: "Casual",
    subtitle: "Effortless essentials",
    image:
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=700",
  },
];

// ==========================================
// HELPERS
// ==========================================

const money = (value) =>
  `$${Number(value || 0).toFixed(2)}`;

function load(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

// ==========================================
// PRODUCT CARD
// ==========================================

function ProductCard({
  product,
  favorite,
  onFavorite,
  onOpen,
}) {
  return (
    <article className="product-card">
      <div
        className="product-photo"
        onClick={() => onOpen(product)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            onOpen(product);
          }
        }}
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
        />

        <span className="tag">
          {product.badge || "FEATURED"}
        </span>

        <button
          type="button"
          className={`favorite ${
            favorite ? "active" : ""
          }`}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite(product.id);
          }}
          aria-label={
            favorite
              ? "Remove from favorites"
              : "Add to favorites"
          }
        >
          {favorite ? "♥" : "♡"}
        </button>

        <button
          type="button"
          className="quick-view"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(product);
          }}
        >
          Quick view ↗
        </button>
      </div>

      <div className="product-details">
        <div className="product-meta">
          <span>{product.brand}</span>
          <span>★ {product.rating}</span>
        </div>

        <h3>
          <button
            type="button"
            className="product-title-link"
            onClick={() => onOpen(product)}
          >
            {product.name}
          </button>
        </h3>

        <p>
          {product.category} / {product.color}
        </p>

        <div className="product-bottom">
          <div>
            <strong>{money(product.price)}</strong>{" "}

            {product.oldPrice != null && (
              <del>{money(product.oldPrice)}</del>
            )}
          </div>

          <button
            type="button"
            className="add-btn"
            onClick={() => onOpen(product)}
          >
            + Add to Cart
          </button>
        </div>
      </div>
    </article>
  );
}

// ==========================================
// FOOTER
// ==========================================

function Footer({ onCategory }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <footer className="footer" id="about">
      <div className="container">
        <div className="footer-grid">
          <div>
            <a className="logo" href="/">
              SHOES<span>.</span>
            </a>

            <p>
              Premium footwear. Modern lifestyle.
              <br />
              Find your next favorite pair.
            </p>

            <div className="socials">
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
              >
                Instagram ↗
              </a>

              <a
                href="https://www.pinterest.com/"
                target="_blank"
                rel="noreferrer"
              >
                Pinterest ↗
              </a>
            </div>
          </div>

          <div>
            <h4>Explore</h4>
            <a href="/">Home</a>
            <a href="/shop">Shop all</a>
            <a href="/categories">Categories</a>
          </div>

          <div>
            <h4>Collections</h4>

            {categories.map((category) => (
              <a
                key={category.name}
                href={`/shop?category=${encodeURIComponent(
                  category.name
                )}`}
                onClick={(event) => {
                  event.preventDefault();
                  onCategory(category.name);
                }}
              >
                {category.name}
              </a>
            ))}
          </div>

          <div>
            <h4>Stay in the loop</h4>

            <p>
              Get updates on new drops and collections.
            </p>

            <form
              className="newsletter"
              onSubmit={(event) => {
                event.preventDefault();
                setSubscribed(true);
              }}
            >
              <input
                aria-label="Newsletter email"
                type="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setSubscribed(false);
                }}
                placeholder="Email address"
              />

              <button
                aria-label="Subscribe"
                type="submit"
              >
                →
              </button>
            </form>

            {subscribed && (
              <small className="muted">
                Thanks! Demo subscription recorded
                for this session.
              </small>
            )}
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} SHOES.
            All rights reserved.
          </span>

          <span>
            Designed for the next step. ⚡
          </span>
        </div>
      </div>
    </footer>
  );
}

// ==========================================
// MAIN APP
// ==========================================

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // ========================================
  // AUTHENTICATION
  // ========================================

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] =
    useState(true);
  const [logoutError, setLogoutError] =
    useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
      },
      (error) => {
        console.error(
          "Firebase auth state error:",
          error
        );
        setAuthLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  async function handleLogout() {
    setLogoutError("");

    try {
      await signOut(auth);
    } catch (error) {
      console.error(
        "Firebase logout failed:",
        error
      );

      setLogoutError(
        "Could not sign out. Please try again."
      );
    }
  }

  // ========================================
  // THEME
  // ========================================

  const [theme, setTheme] = useState(() =>
    localStorage.getItem("shoes-theme") === "light"
      ? "light"
      : "dark"
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    localStorage.setItem(
      "shoes-theme",
      theme
    );
  }, [theme]);

  // ========================================
  // SEARCH AND SORT
  // ========================================

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");

  // ========================================
  // CART
  // ========================================

  const [cart, setCart] = useState(() =>
    load(
      "shoes-cart-v2",
      load("shoes_cart", [])
    )
  );

  const [cartOpen, setCartOpen] =
    useState(false);

  // ========================================
  // FAVORITES
  // ========================================

  const [favorites, setFavorites] = useState(() =>
    load("shoes-favorites-v2", [])
  );

  const [favoritesOnly, setFavoritesOnly] =
    useState(false);

  // ========================================
  // MOBILE MENU
  // ========================================

  const [mobileMenu, setMobileMenu] =
    useState(false);

  // ========================================
  // ROUTING
  // ========================================

  const path = location.pathname;

  const queryCategory = new URLSearchParams(
    location.search
  ).get("category");

  const category = categories.some(
    (item) => item.name === queryCategory
  )
    ? queryCategory
    : "All";

  const authMode =
    path === "/login" ||
    path === "/register";

  const productPageOpen =
    path.startsWith("/product/");

  useEffect(() => {
    if (
      productPageOpen ||
      path === "/checkout" ||
      path === "/success" ||
      path === "/account" ||
      authMode
    ) {
      return;
    }

    const section =
      path === "/shop"
        ? "shop"
        : path === "/categories"
          ? "categories"
          : path === "/about"
            ? "about"
            : "home";

    const frame = requestAnimationFrame(() => {
      document
        .getElementById(section)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });

    return () =>
      cancelAnimationFrame(frame);
  }, [
    path,
    location.search,
    authMode,
    productPageOpen,
  ]);

  function go(destination) {
    navigate(destination);
    setMobileMenu(false);
  }

  function openProduct(product) {
    navigate(`/product/${product.id}`);
  }

  function switchAuth(mode) {
    navigate(
      mode === "register"
        ? "/register"
        : "/login"
    );
  }

  // ========================================
  // LOCAL STORAGE
  // ========================================

  useEffect(() => {
    localStorage.setItem(
      "shoes-cart-v2",
      JSON.stringify(cart)
    );
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(
      "shoes-favorites-v2",
      JSON.stringify(favorites)
    );
  }, [favorites]);

  useEffect(() => {
    document.body.style.overflow =
      cartOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  // ========================================
  // BACKEND PRODUCTS
  // ========================================

  const [apiProducts, setApiProducts] =
    useState(null);

  const [apiError, setApiError] =
    useState("");

  useEffect(() => {
    let active = true;

    shoesAPI
      .getProducts()
      .then((data) => {
        if (
          active &&
          Array.isArray(data.products)
        ) {
          setApiProducts(
            data.products.map((product) => ({
              ...products.find(
                (local) =>
                  local.id === product.id
              ),
              ...product,
            }))
          );

          setApiError("");
        }
      })
      .catch((error) => {
        if (active) {
          setApiError(error.message);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const catalogProducts =
    apiProducts ?? products;

  // ========================================
  // FILTER PRODUCTS
  // ========================================

  const filteredProducts = useMemo(() => {
    let result = catalogProducts.filter(
      (product) =>
        (
          category === "All" ||
          product.category === category
        ) &&
        (
          !favoritesOnly ||
          favorites.includes(product.id)
        ) &&
        `${product.name} ${product.brand} ${product.category}`
          .toLowerCase()
          .includes(search.toLowerCase())
    );

    if (sort === "low") {
      result.sort(
        (a, b) => a.price - b.price
      );
    }

    if (sort === "high") {
      result.sort(
        (a, b) => b.price - a.price
      );
    }

    if (sort === "rating") {
      result.sort(
        (a, b) => b.rating - a.rating
      );
    }

    return result;
  }, [
    catalogProducts,
    category,
    search,
    sort,
    favoritesOnly,
    favorites,
  ]);

  // ========================================
  // CART COUNT
  // ========================================

  const cartCount = cart.reduce(
    (total, product) =>
      total +
      (Number(product.quantity) || 1),
    0
  );

  // ========================================
  // CATEGORY NAVIGATION
  // ========================================

  function chooseCategory(value) {
    setFavoritesOnly(false);

    go(
      value === "All"
        ? "/shop"
        : `/shop?category=${encodeURIComponent(
            value
          )}`
    );

    requestAnimationFrame(() => {
      document
        .getElementById("shop")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  }

  // ========================================
  // ADD TO CART
  // ========================================

  function addToCart(product, sizeArg) {
    const size =
      sizeArg ?? product.size;

    const quantity = Math.max(
      1,
      Number(product.quantity) || 1
    );

    setCart((current) => {
      const existing = current.find(
        (item) =>
          item.id === product.id &&
          item.size === size
      );

      return existing
        ? current.map((item) =>
            item.id === product.id &&
            item.size === size
              ? {
                  ...item,
                  quantity:
                    item.quantity + quantity,
                }
              : item
          )
        : [
            ...current,
            {
              ...product,
              size,
              quantity,
            },
          ];
    });

    setCartOpen(true);
  }

  // ========================================
  // FAVORITES ACTIONS
  // ========================================

  function toggleFavorite(id) {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter(
            (value) => value !== id
          )
        : [...current, id]
    );
  }

  // ========================================
  // AUTH PAGES
  // ========================================

  if (authMode) {
    return <AuthPage />;
  }

  // ========================================
  // MY ACCOUNT + FAVORITES
  // ========================================

  if (path === "/account") {
    return (
      <AccountPage
        favorites={favorites}
        products={catalogProducts}
        onToggleFavorite={toggleFavorite}
        onOpenProduct={openProduct}
      />
    );
  }

  // ========================================
  // PRODUCT DETAILS
  // ========================================

  if (productPageOpen) {
    return (
      <ProductPage
        key={path}
        products={catalogProducts}
        onAddToCart={addToCart}
      />
    );
  }

  // ========================================
  // CHECKOUT
  // ========================================

  if (path === "/checkout") {
    return <CheckoutPage />;
  }

  // ========================================
  // ORDER SUCCESS
  // ========================================

  if (path === "/success") {
    return (
      <SuccessPage
        onComplete={() => setCart([])}
      />
    );
  }

  // ========================================
  // MAIN STORE
  // ========================================

  return (
    <div className="app">
      {/* ANNOUNCEMENT */}
      <div className="announcement">
        FREE SHIPPING ON ORDERS OVER $150
        <span>✦</span>
        NEW COLLECTION AVAILABLE NOW
      </div>

      {/* HEADER */}
      <header className="header">
        <nav className="nav container">
          <a
            className="logo"
            href="/"
            onClick={(event) => {
              event.preventDefault();
              go("/");
            }}
          >
            SHOES<span>.</span>
          </a>

          {/* NAV LINKS */}
          <div
            className={`nav-links ${
              mobileMenu ? "open" : ""
            }`}
          >
            <a
              href="/"
              onClick={(event) => {
                event.preventDefault();
                go("/");
              }}
            >
              Home
            </a>

            <a
              href="/shop"
              onClick={(event) => {
                event.preventDefault();
                go("/shop");
              }}
            >
              Shop
            </a>

            <a
              href="/categories"
              onClick={(event) => {
                event.preventDefault();
                go("/categories");
              }}
            >
              Categories
            </a>

            <a
              href="/about"
              onClick={(event) => {
                event.preventDefault();
                go("/about");
              }}
            >
              About
            </a>
          </div>

          {/* ACTIONS */}
          <div className="nav-actions">
            <button
              type="button"
              className="icon-btn search-trigger"
              onClick={() => {
                setFavoritesOnly(false);
                chooseCategory("All");

                setTimeout(() => {
                  document
                    .getElementById("search-input")
                    ?.focus();
                }, 100);
              }}
            >
              ⌕ <span>Search</span>
            </button>

            {/* FAVORITES */}
            <button
              type="button"
              className={`icon-btn ${
                favoritesOnly
                  ? "selected"
                  : ""
              }`}
              onClick={() => {
                go("/shop");

                setFavoritesOnly(
                  (value) => !value
                );

                requestAnimationFrame(() => {
                  document
                    .getElementById("shop")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                });
              }}
              aria-label="Show favorites"
            >
              ♡ <span>{favorites.length}</span>
            </button>

            {/* CART */}
            <button
              type="button"
              className="icon-btn"
              onClick={() =>
                setCartOpen(true)
              }
              aria-label="Open cart"
            >
              🛒 <span>{cartCount}</span>
            </button>

            {/* USER ACCOUNT */}
            {authLoading ? (
              <span
                className="account-btn"
                role="status"
              >
                Loading...
              </span>
            ) : user ? (
              <div
                className="user-profile"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <img
                  className="user-avatar"
                  src={
                    user.photoURL ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user.displayName ||
                        user.email ||
                        "User"
                    )}`
                  }
                  alt="Your profile"
                  referrerPolicy="no-referrer"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border:
                      "2px solid #b7ff35",
                  }}
                />

                <span
                  className="user-name"
                  style={{
                    maxWidth: 150,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.displayName ||
                    user.email ||
                    "Account"}
                </span>

                <button
                  type="button"
                  className="account-btn"
                  onClick={() =>
                    go("/account")
                  }
                >
                  My Account
                </button>

                <button
                  type="button"
                  className="account-btn"
                  onClick={handleLogout}
                >
                  Log Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="account-btn"
                onClick={() =>
                  switchAuth("login")
                }
              >
                Sign In / Sign Up
              </button>
            )}

            {/* THEME */}
            <button
              type="button"
              className="theme-toggle"
              onClick={() =>
                setTheme((current) =>
                  current === "dark"
                    ? "light"
                    : "dark"
                )
              }
              aria-label="Toggle color theme"
            >
              {theme === "dark"
                ? "☀ Light"
                : "☾ Dark"}
            </button>

            {/* MOBILE MENU */}
            <button
              type="button"
              className="menu-btn"
              onClick={() =>
                setMobileMenu(
                  !mobileMenu
                )
              }
              aria-label="Toggle navigation"
            >
              ☰
            </button>
          </div>
        </nav>
      </header>

      {logoutError && (
        <p
          role="alert"
          style={{
            color: "#ff7777",
            textAlign: "center",
          }}
        >
          {logoutError}
        </p>
      )}

      {/* MAIN CONTENT */}
      <main className="container">
        {/* HERO */}
        <section
          className="hero"
          id="home"
        >
          <div className="hero-content">
            <div className="eyebrow">
              THE NEW ERA OF FOOTWEAR
            </div>

            <h1>
              WALK
              <br />
              YOUR
              <br />
              WAY.
            </h1>

            <p>
              Discover premium sneakers,
              iconic styles and everyday
              essentials. Your next favorite
              pair starts here.
            </p>

            <button
              type="button"
              className="primary"
              onClick={() =>
                chooseCategory("All")
              }
            >
              EXPLORE COLLECTION →
            </button>

            <div className="hero-stats">
              <span>
                <strong>06+</strong>{" "}
                Curated styles
              </span>

              <span>
                <strong>3</strong>{" "}
                Collections
              </span>
            </div>
          </div>

          <img
            className="hero-image"
            src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200"
            alt="Red featured sneaker"
          />
        </section>

        {/* BENEFITS */}
        <section
          className="benefits"
          id="features"
        >
          <div>
            <strong>
              ↗ Free Shipping
            </strong>
            <small>
              On orders over $150
            </small>
          </div>

          <div>
            <strong>
              ⚡ Premium Quality
            </strong>
            <small>
              Carefully selected footwear
            </small>
          </div>

          <div>
            <strong>
              ↩ Easy Returns
            </strong>
            <small>
              30-day return policy (demo)
            </small>
          </div>
        </section>

        {/* CATEGORIES */}
        <section
          className="section"
          id="categories"
        >
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                FIND YOUR STYLE
              </div>

              <h2>
                Shop by Category
              </h2>

              <p className="muted">
                The right pair for every moment.
              </p>
            </div>

            <button
              type="button"
              className="text-link"
              onClick={() =>
                chooseCategory("All")
              }
            >
              View all products ↗
            </button>
          </div>

          <div className="category-grid">
            {categories.map((item) => (
              <button
                type="button"
                key={item.name}
                className="category-card"
                onClick={() =>
                  chooseCategory(
                    item.name
                  )
                }
              >
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                />

                <span className="category-overlay">
                  <strong>
                    {item.name}
                  </strong>

                  <small>
                    {item.subtitle}
                  </small>
                </span>

                <span className="category-arrow">
                  ↗
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* SHOP */}
        <section
          className="section"
          id="shop"
        >
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                CURATED FOR YOU
              </div>

              <h2>
                {favoritesOnly
                  ? "Your Favorites"
                  : "Our Collection"}
              </h2>

              <p className="muted">
                Find your perfect fit from
                our latest selection.
              </p>
            </div>

            <label className="search-box">
              <span>⌕</span>

              <input
                id="search-input"
                placeholder="Search sneakers..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />
            </label>
          </div>

          {/* FILTERS */}
          <div className="filter-bar">
            <div className="filters">
              {[
                "All",
                ...categories.map(
                  (item) => item.name
                ),
              ].map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`filter ${
                    category === item &&
                    !favoritesOnly
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    chooseCategory(item)
                  }
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="sort-group">
              <span>
                {filteredProducts.length} products
              </span>

              <select
                aria-label="Sort products"
                value={sort}
                onChange={(event) =>
                  setSort(
                    event.target.value
                  )
                }
              >
                <option value="default">
                  Featured
                </option>

                <option value="low">
                  Price: Low to High
                </option>

                <option value="high">
                  Price: High to Low
                </option>

                <option value="rating">
                  Top Rated
                </option>
              </select>
            </div>
          </div>

          {/* API ERROR */}
          {apiError && (
            <p
              role="status"
              className="muted"
            >
              Backend unavailable — showing
              local demo catalog.
            </p>
          )}

          {/* PRODUCT GRID */}
          <div className="product-grid">
            {filteredProducts.map(
              (product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  favorite={favorites.includes(
                    product.id
                  )}
                  onFavorite={
                    toggleFavorite
                  }
                  onOpen={
                    openProduct
                  }
                />
              )
            )}
          </div>

          {/* EMPTY PRODUCTS */}
          {!filteredProducts.length && (
            <div className="empty">
              No products found.{" "}

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  chooseCategory("All");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        {/* PROMO */}
        <section className="promo">
          <div className="eyebrow">
            YOUR STYLE. YOUR RULES.
          </div>

          <h2>
            STEP INTO
            <br />
            SOMETHING NEW.
          </h2>

          <p>
            Explore the collection and
            find your next everyday essential.
          </p>

          <button
            type="button"
            className="primary"
            onClick={() =>
              chooseCategory("All")
            }
          >
            SHOP THE COLLECTION →
          </button>
        </section>
      </main>

      {/* FOOTER */}
      <Footer
        onCategory={
          chooseCategory
        }
      />

      {/* SHOPPING CART */}
      <ShoppingCart
        isOpen={cartOpen}
        onClose={() =>
          setCartOpen(false)
        }
        cart={cart}
        setCart={setCart}
        onCheckout={(order) => {
          setCartOpen(false);

          navigate("/checkout", {
            state: {
              items: cart,
              ...order,
            },
          });
        }}
      />
    </div>
  );
}
