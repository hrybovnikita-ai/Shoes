
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";

import { auth } from "./firebase";
import "./AccountPage.css";

// ==========================================
// API CONFIGURATION
// ==========================================

const API_URL = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/$/, "");

// ==========================================
// HELPERS
// ==========================================

const money = (value) => {
  const number = Number(value);

  return `$${(
    Number.isFinite(number) ? number : 0
  ).toFixed(2)}`;
};

const formatDate = (value) => {
  if (!value) return "Unknown date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getOrderId = (order) =>
  order.orderNumber ||
  order.order_number ||
  order.id;

const getOrderTotal = (order) =>
  order.total ?? order.total_amount ?? 0;

const getOrderDate = (order) =>
  order.createdAt ||
  order.created_at ||
  order.date;

const getOrderStatus = (order) =>
  String(order.status || "UNKNOWN")
    .replaceAll("_", " ");

const getOrderItems = (order) => {
  if (Array.isArray(order.items)) {
    return order.items;
  }

  if (typeof order.items === "string") {
    try {
      const parsed = JSON.parse(order.items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

// ==========================================
// ACCOUNT PAGE
// ==========================================

export default function AccountPage() {
  const navigate = useNavigate();

  // Firebase account
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  // Notifications
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Orders
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] =
    useState(false);
  const [ordersError, setOrdersError] =
    useState("");
  const [selectedOrder, setSelectedOrder] =
    useState(null);

  // ========================================
  // LOAD MY ORDERS
  // ========================================

  const loadOrders = useCallback(
    async (currentUser, signal) => {
      if (!currentUser) {
        setOrders([]);
        setOrdersError("");
        setOrdersLoading(false);
        return;
      }

      setOrdersLoading(true);
      setOrdersError("");

      try {
        const token = await currentUser.getIdToken();

        if (signal?.aborted) return;

        // Correct Backend route:
        // GET /api/me/orders
        const response = await fetch(
          `${API_URL}/me/orders`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            signal,
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Your session has expired. Please sign in again."
            );
          }

          if (response.status === 403) {
            throw new Error(
              "You do not have permission to view these orders."
            );
          }

          if (response.status === 404) {
            throw new Error(
              "Orders API not found. Check the Backend route."
            );
          }

          throw new Error(
            `Could not load orders (HTTP ${response.status}).`
          );
        }

        const data = await response.json();

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.orders)
            ? data.orders
            : null;

        if (!list) {
          throw new Error(
            "Invalid response from orders API."
          );
        }

        if (signal?.aborted) return;

        // Prevent displaying orders from a
        // previous Firebase session.
        if (auth.currentUser?.uid !== currentUser.uid) {
          return;
        }

        setOrders(list);
      } catch (err) {
        if (err.name === "AbortError" || signal?.aborted) {
          return;
        }

        console.error("SHOES load orders:", err);

        if (auth.currentUser?.uid === currentUser.uid) {
          setOrders([]);
          setOrdersError(
            err.message || "Could not load order history."
          );
        }
      } finally {
        if (!signal?.aborted) {
          setOrdersLoading(false);
        }
      }
    },
    []
  );

  // ========================================
  // FIREBASE AUTH STATE
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setName(currentUser?.displayName || "");
        setLoading(false);
        setError("");

        if (currentUser) {
          loadOrders(currentUser, controller.signal);
        } else {
          controller.abort();
          setOrders([]);
          setSelectedOrder(null);
          setOrdersError("");
          setOrdersLoading(false);
        }
      },
      (err) => {
        console.error("Firebase account error:", err);
        setError("Could not load your account.");
        setLoading(false);
      }
    );

    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [loadOrders]);

  // ========================================
  // SAVE PROFILE
  // ========================================

  async function saveProfile(event) {
    event.preventDefault();

    if (!user || saving) return;

    const cleanName = name.trim();

    if (cleanName.length < 2) {
      setError(
        "Name must contain at least 2 characters."
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await updateProfile(user, {
        displayName: cleanName,
      });

      setUser((previous) =>
        previous
          ? {
              ...previous,
              displayName: cleanName,
            }
          : previous
      );

      setMessage(
        "Profile updated successfully."
      );
    } catch (err) {
      console.error("Profile update:", err);

      setError(
        "Could not update your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // PASSWORD RESET
  // ========================================

  async function resetPassword() {
    if (!user?.email || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await sendPasswordResetEmail(
        auth,
        user.email
      );

      setMessage(
        "If password sign-in is available for this email, " +
        "you will receive instructions. Check your inbox."
      );
    } catch (err) {
      console.error("Password reset:", err);

      setError(
        "Could not send password instructions. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // LOGOUT
  // ========================================

  async function logout() {
    setError("");
    setMessage("");

    try {
      await signOut(auth);

      setOrders([]);
      setSelectedOrder(null);

      navigate("/login", {
        replace: true,
      });
    } catch (err) {
      console.error("Logout:", err);

      setError(
        "Could not sign out."
      );
    }
  }

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <main className="account-page">
        <div className="account-container">
          <p>Loading your account...</p>
        </div>
      </main>
    );
  }

  // ========================================
  // NOT AUTHENTICATED
  // ========================================

  if (!user) {
    return (
      <main className="account-page">
        <section className="account-panel">
          <h1>Sign in required</h1>

          <p>
            Please sign in to access your account.
          </p>

          <button
            type="button"
            className="account-primary"
            onClick={() =>
              navigate("/login", {
                state: {
                  from: {
                    pathname: "/account",
                  },
                },
              })
            }
          >
            Sign In →
          </button>
        </section>
      </main>
    );
  }

  // ========================================
  // PROVIDER INFORMATION
  // ========================================

  const providerNames = (
    user.providerData || []
  )
    .map((provider) => {
      if (provider.providerId === "google.com") {
        return "Google";
      }

      if (provider.providerId === "password") {
        return "Email / Password";
      }

      return provider.providerId;
    })
    .join(", ");

  const itemCount = orders.reduce(
    (sum, order) => sum + getOrderItems(order).length,
    0
  );

  // ========================================
  // PAGE
  // ========================================

  return (
    <main className="account-page">
      <div className="account-container">

        {/* HEADER */}
        <header className="account-header">
          <button
            type="button"
            className="account-logo"
            onClick={() => navigate("/shop")}
          >
            SHOES<span>.</span>
          </button>

          <button
            type="button"
            className="account-back"
            onClick={() => navigate("/shop")}
          >
            ← Back to Shop
          </button>
        </header>

        {/* PAGE HEADING */}
        <div className="account-heading">
          <span className="account-eyebrow">
            YOUR PERSONAL SPACE
          </span>

          <h1>
            My Account<span>.</span>
          </h1>

          <p>
            Manage your profile, security settings
            and demo orders.
          </p>
        </div>

        {/* PROFILE */}
        <section className="account-profile">
          {user.photoURL ? (
            <img
              className="account-avatar"
              src={user.photoURL}
              alt="Profile avatar"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="account-avatar account-initial">
              {(
                user.displayName ||
                user.email ||
                "U"
              )
                .charAt(0)
                .toUpperCase()}
            </div>
          )}

          <div>
            <h2>
              {user.displayName || "SHOES Member"}
            </h2>

            <p>{user.email}</p>

            <span className="account-status">
              ● Active account
            </span>
          </div>
        </section>

        {/* NOTIFICATIONS */}
        {error && (
          <p
            className="account-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            className="account-success"
            role="status"
          >
            {message}
          </p>
        )}

        {/* ACCOUNT GRID */}
        <div className="account-grid">

          {/* PERSONAL INFORMATION */}
          <section className="account-panel">
            <h2>Personal Information</h2>

            <p>
              Update your public profile name.
            </p>

            <form onSubmit={saveProfile}>
              <label htmlFor="account-name">
                Full Name
              </label>

              <input
                id="account-name"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                maxLength={150}
                required
              />

              <label htmlFor="account-email">
                Email Address
              </label>

              <input
                id="account-email"
                type="email"
                value={user.email || ""}
                readOnly
              />

              <button
                type="submit"
                className="account-primary"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Changes →"}
              </button>
            </form>
          </section>

          {/* SECURITY */}
          <section className="account-panel">
            <h2>Security & Login</h2>

            <p>
              Manage how you access SHOES.
            </p>

            <div className="account-detail">
              <span>Sign-in methods</span>

              <strong>
                {providerNames || "Firebase"}
              </strong>
            </div>

            <div className="account-detail">
              <span>Email verified</span>

              <strong>
                {user.emailVerified
                  ? "Yes"
                  : "No"}
              </strong>
            </div>

            <button
              type="button"
              className="account-secondary"
              onClick={resetPassword}
              disabled={saving}
            >
              Send Password Instructions
            </button>

            <p className="account-note">
              Password reset is available for
              email/password accounts.
              Google-only accounts may need
              to link a password separately.
            </p>
          </section>

          {/* MY ORDERS */}
          <section className="account-panel">
            <h2>My Orders</h2>

            <p>
              View your SHOES demo order history.
            </p>

            <div className="account-detail">
              <span>Total Orders</span>
              <strong>{orders.length}</strong>
            </div>

            <div className="account-detail">
              <span>Order Items</span>
              <strong>{itemCount}</strong>
            </div>

            <button
              type="button"
              className="account-secondary"
              onClick={() =>
                loadOrders(auth.currentUser)
              }
              disabled={ordersLoading}
            >
              {ordersLoading
                ? "Loading Orders..."
                : "↻ Refresh Orders"}
            </button>

            {/* ORDERS ERROR */}
            {ordersError && (
              <p
                className="account-error"
                role="alert"
              >
                {ordersError}
              </p>
            )}

            {/* EMPTY ORDERS */}
            {!ordersLoading &&
              !ordersError &&
              orders.length === 0 && (
                <div className="account-placeholder">
                  No orders found.

                  <small>
                    Your account-linked demo orders
                    will appear here after checkout.
                  </small>
                </div>
              )}

            {/* ORDERS LIST */}
            <div className="account-orders">
              {orders.map((order) => {
                const orderId = getOrderId(order);
                const orderItems = getOrderItems(order);
                const isExpanded =
                  selectedOrder === orderId;

                return (
                  <article
                    className="account-order-card"
                    key={orderId}
                  >
                    <div className="account-order-top">
                      <div>
                        <strong>
                          Order #{orderId}
                        </strong>

                        <small>
                          {formatDate(
                            getOrderDate(order)
                          )}
                        </small>
                      </div>

                      <span className="account-order-status">
                        {getOrderStatus(order)}
                      </span>
                    </div>

                    <div className="account-detail">
                      <span>Items</span>
                      <strong>
                        {orderItems.length}
                      </strong>
                    </div>

                    <div className="account-detail">
                      <span>Total</span>
                      <strong>
                        {money(getOrderTotal(order))}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="account-secondary"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setSelectedOrder(
                          isExpanded ? null : orderId
                        )
                      }
                    >
                      {isExpanded
                        ? "Hide Details"
                        : "View Details →"}
                    </button>

                    {/* ORDER DETAILS */}
                    {isExpanded && (
                      <div className="account-order-details">
                        {orderItems.length === 0 ? (
                          <p className="account-note">
                            No item details available.
                          </p>
                        ) : (
                          orderItems.map(
                            (item, index) => (
                              <div
                                className="account-detail"
                                key={`${item.id}-${index}`}
                              >
                                <span>
                                  {item.name ||
                                    `Product #${item.id}`}

                                  {" · EU "}
                                  {item.size ?? "—"}

                                  {" · "}
                                  {item.color || "Default"}

                                  {" · Qty "}
                                  {item.quantity || 1}
                                </span>

                                <strong>
                                  {money(
                                    (Number(item.price) || 0) *
                                      (Number(item.quantity) || 1)
                                  )}
                                </strong>
                              </div>
                            )
                          )
                        )}

                        <div className="account-detail">
                          <span>Order Status</span>
                          <strong>
                            {getOrderStatus(order)}
                          </strong>
                        </div>

                        <p className="account-note">
                          This is a demonstration order.
                          No real payment was processed.
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <button
              type="button"
              className="account-secondary"
              onClick={() => navigate("/shop")}
            >
              Explore Products →
            </button>
          </section>

          {/* ACCOUNT SETTINGS */}
          <section className="account-panel">
            <h2>Account Settings</h2>

            <p>
              Manage your current session.
            </p>

            <div className="account-detail">
              <span>Account ID</span>

              <strong title={user.uid}>
                {user.uid.slice(0, 12)}...
              </strong>
            </div>

            <button
              type="button"
              className="account-logout"
              onClick={logout}
            >
              Log Out
            </button>
          </section>
        </div>

        {/* FOOTER */}
        <footer className="account-footer">
          © {new Date().getFullYear()} SHOES.
          All rights reserved.
        </footer>
      </div>
    </main>
  );
}
