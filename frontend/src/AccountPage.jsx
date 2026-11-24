import AccountCommerce from "./commerce/AccountCommerce";
import DesignsPanel from "./account/DesignsPanel";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";

import { saveBlob, shoesAPI } from "./api";
import { useAuth } from "./auth/AuthContext";
import { auth as firebaseAuth, googleProvider } from "./firebase";
import ProductImage from "./components/ProductImage";
import { LinesSkeleton } from "./components/Skeleton";
import { useToast } from "./components/Toast";
import useDocumentMeta from "./hooks/useDocumentMeta";
import { formatDate, money } from "./lib/format";
import "./AccountPage.css";

const STATUS_TONE = { DEMO_CONFIRMED: "ok", PAID: "ok", PENDING_PAYMENT: "warn", DEMO_CANCELLED: "off", CANCELLED: "off", EXPIRED: "off" };

function paymentLabel(o) {
  if (o.paymentProvider === "demo") return "Demo — not charged";
  return { paid: "Paid (Stripe test)", unpaid: "Awaiting payment", failed: "Failed", expired: "Expired" }[o.paymentStatus] || o.paymentStatus;
}

function OrderCard({ order, onCancel, onReceipt, onTrack, busy }) {
  const [open, setOpen] = useState(false);
  const items = Array.isArray(order.items) ? order.items : [];
  const units = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
  return (
    <article className="account-order-card" data-testid="order-card">
      <div className="account-order-top">
        <div>
          <strong>Order #{order.orderNumber || order.id}</strong>
          <small>{formatDate(order.date)}</small>
        </div>
        <span className={`account-order-status tone-${STATUS_TONE[order.status] || "off"}`}>{String(order.status).replaceAll("_", " ")}</span>
      </div>
      <div className="order-thumbs">
        {items.slice(0, 4).map((i, idx) => (
          <ProductImage key={`${i.id}-${idx}`} src={i.image} alt={i.name} width="56" height="56" />
        ))}
        <span className="muted">
          {units} item{units === 1 ? "" : "s"} · {items.map((i) => i.name).slice(0, 2).join(", ")}
          {items.length > 2 ? "…" : ""}
        </span>
      </div>
      <div className="order-facts">
        <div>
          <span>Total</span>
          <strong>{money(order.total)}</strong>
        </div>
        <div>
          <span>Payment</span>
          <strong>{paymentLabel(order)}</strong>
        </div>
      </div>
      <div className="order-actions">
        <button type="button" className="account-secondary" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "Hide details" : "View details"}
        </button>
        <button type="button" className="account-secondary" onClick={() => onTrack(order)}>
          Track delivery
        </button>
        <button type="button" className="account-secondary" onClick={() => onReceipt(order)} disabled={busy === `pdf-${order.id}`}>
          {busy === `pdf-${order.id}` ? "Preparing…" : "⬇ PDF receipt"}
        </button>
        {order.canCancel && (
          <button type="button" className="account-secondary danger" onClick={() => onCancel(order)} disabled={busy === `cancel-${order.id}`}>
            {busy === `cancel-${order.id}` ? "Cancelling…" : "Cancel order"}
          </button>
        )}
      </div>
      {open && (
        <div className="account-order-details">
          {items.map((item, index) => (
            <div className="order-line" key={`${item.id}-${index}`}>
              <ProductImage src={item.image} alt="" width="48" height="48" />
              <span>
                <strong>{item.name}</strong>
                <small>
                  EU {item.size ?? "—"}
                  {item.color ? ` · ${item.color}` : ""} · Qty {item.quantity || 1} × {money(item.price)}
                </small>
              </span>
              <strong>{money((Number(item.price) || 0) * (Number(item.quantity) || 1))}</strong>
            </div>
          ))}
          <div className="account-detail">
            <span>Subtotal</span>
            <strong>{money(order.subtotal)}</strong>
          </div>
          <div className="account-detail">
            <span>Discount{order.promoCode ? ` (${order.promoCode})` : ""}</span>
            <strong>-{money(order.discount)}</strong>
          </div>
          <div className="account-detail">
            <span>Delivery</span>
            <strong>{Number(order.shipping) ? money(order.shipping) : "FREE"}</strong>
          </div>
          <div className="account-detail total">
            <span>Total</span>
            <strong>{money(order.total)}</strong>
          </div>
          {order.shippingAddress && (
            <p className="account-note">
              Ship to: {[order.shippingAddress.street, order.shippingAddress.apartment, order.shippingAddress.city, order.shippingAddress.postalCode, order.shippingAddress.country].filter(Boolean).join(", ")}
            </p>
          )}
          <p className="account-note">
            {order.paymentProvider === "demo" ? "Demonstration order — no real payment was processed." : "Stripe TEST MODE — no real money moved."}
          </p>
        </div>
      )}
    </article>
  );
}

function ClaimOrder({ getToken, onClaimed, enabled }) {
  const { notify } = useToast();
  const [orderId, setOrderId] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("id");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!enabled) {
    return (
      <p className="account-note">
        Placed an order as a guest? Linking guest orders needs e-mail verification, which is not enabled on this server yet.
      </p>
    );
  }

  async function run(fn) {
    setBusy(true);
    setMsg("");
    try {
      await fn(await getToken());
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="claim-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (step === "id")
          run(async (t) => {
            const r = await shoesAPI.requestOrderClaim(orderId.trim(), t);
            setStep("code");
            setMsg(r.sentTo ? `If the order exists, we e-mailed a code to ${r.sentTo}.` : r.message);
          });
        else
          run(async (t) => {
            await shoesAPI.confirmOrderClaim(orderId.trim(), code.trim(), t);
            notify("Order added to your account.");
            setStep("id");
            setOrderId("");
            setCode("");
            onClaimed();
          });
      }}
    >
      <h3>Add a guest order</h3>
      <p className="account-note">We'll e-mail a one-time code to the address used for that order to confirm it's yours.</p>
      <label htmlFor="claim-id">Order number</label>
      <input id="claim-id" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="SH-…" disabled={step === "code"} required />
      {step === "code" && (
        <>
          <label htmlFor="claim-code">6-digit code</label>
          <input id="claim-code" inputMode="numeric" pattern="\d{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required />
        </>
      )}
      <button type="submit" className="account-secondary" disabled={busy}>
        {busy ? "Please wait…" : step === "id" ? "Send code" : "Confirm"}
      </button>
      {msg && <p className="account-note" role="status">{msg}</p>}
    </form>
  );
}

function LinkAccounts({ me, onLinked }) {
  const { user, clerkUser, firebaseUser, firebaseEnabled, clerkEnabled, getClerkToken, getFirebaseToken, signOutFirebase } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  if (!clerkEnabled || !firebaseEnabled || !me) return null;
  if (me.providers.firebase && me.providers.clerk) {
    return <p className="account-note">✓ Your existing SHOES account and your new sign-in are linked.</p>;
  }
  if (user?.provider !== "clerk") {
    return <p className="account-note">To link this account to the new sign-in, sign in with it once and open this page.</p>;
  }

  async function link(signIn) {
    setBusy(true);
    try {
      if (!firebaseUser) await signIn();
      const firebaseToken = await getFirebaseToken(true);
      const clerkToken = await getClerkToken();
      await shoesAPI.linkIdentity(firebaseToken, clerkToken);
      await signOutFirebase();
      notify("Accounts linked. Your past orders are now in My Orders.");
      onLinked();
    } catch (err) {
      notify(err.message || "Could not link accounts.", { type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="link-accounts">
      <h3>Link your existing SHOES account</h3>
      <p className="account-note">
        Signed in with the new sign-in as <strong>{clerkUser.email}</strong>. If you had a SHOES account before, sign in to it below once.
        Both sign-ins are verified by our server before anything is linked — nothing is merged automatically.
      </p>
      <button type="button" className="account-secondary" disabled={busy} onClick={() => link(() => signInWithPopup(firebaseAuth, googleProvider))}>
        Continue with Google (existing account)
      </button>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          link(() => signInWithEmailAndPassword(firebaseAuth, form.email.trim(), form.password));
        }}
      >
        <label htmlFor="link-email">Existing account e-mail</label>
        <input id="link-email" type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <label htmlFor="link-password">Password</label>
        <input id="link-password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <button type="submit" className="account-secondary" disabled={busy}>
          {busy ? "Linking…" : "Link with e-mail & password"}
        </button>
      </form>
    </div>
  );
}

export default function AccountPage({ products = [], favorites = [], onToggleFavorite, onOpenProduct, theme, onToggleTheme, onClearRecent, config, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();
  const { user, getToken, rawFirebaseUser, openClerkProfile } = useAuth();
  useDocumentMeta({ title: "My Account", noindex: true });

  const [me, setMe] = useState(null);
  const [orders, setOrders] = useState({ loading: true, list: [], error: "" });
  const [name, setName] = useState(user?.displayName || "");
  const [busy, setBusy] = useState("");

  const fetchAccount = useCallback(async () => {
    const token = await getToken();
    const [meRes, ordersRes] = await Promise.all([shoesAPI.getMe(token), shoesAPI.getMyOrders(token)]);
    return { me: meRes.user, list: ordersRes.orders || [] };
  }, [getToken]);

  const apply = useCallback((promise) => {
    promise
      .then((r) => {
        setMe(r.me);
        setOrders({ loading: false, list: r.list, error: "" });
      })
      .catch((err) =>
        setOrders({ loading: false, list: [], error: err.status === 401 ? "Your session has expired. Please sign in again." : err.message })
      );
  }, []);

  const refresh = () => {
    setOrders((o) => ({ ...o, loading: true, error: "" }));
    apply(fetchAccount());
  };

  useEffect(() => {
    apply(fetchAccount());
  }, [apply, fetchAccount, user?.uid]);

  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    requestAnimationFrame(() => el?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [location.hash, orders.loading]);

  async function saveProfile(e) {
    e.preventDefault();
    const clean = name.trim();
    if (clean.length < 2) return notify("Name must contain at least 2 characters.", { type: "error" });
    setBusy("profile");
    try {
      await updateProfile(rawFirebaseUser, { displayName: clean });
      await rawFirebaseUser.reload();
      notify("Profile updated.");
    } catch {
      notify("Could not update your profile.", { type: "error" });
    } finally {
      setBusy("");
    }
  }

  async function resetPassword() {
    setBusy("reset");
    try {
      await sendPasswordResetEmail(firebaseAuth, user.email);
      notify("If password sign-in is enabled for this e-mail, reset instructions were sent.");
    } catch {
      notify("Could not send password instructions.", { type: "error" });
    } finally {
      setBusy("");
    }
  }

  async function resendVerification() {
    setBusy("verify");
    try {
      await sendEmailVerification(rawFirebaseUser);
      notify("Verification e-mail sent. Check your inbox.");
    } catch {
      notify("Could not send the verification e-mail. Try again later.", { type: "error" });
    } finally {
      setBusy("");
    }
  }

  async function downloadReceipt(order) {
    setBusy(`pdf-${order.id}`);
    try {
      const blob = await shoesAPI.downloadReceipt(order.id, { token: await getToken() });
      saveBlob(blob, `SHOES-${order.id}.pdf`);
    } catch (err) {
      notify(err.message, { type: "error" });
    } finally {
      setBusy("");
    }
  }

  async function cancelOrder(order) {
    if (!window.confirm(`Cancel order ${order.id}?`)) return;
    setBusy(`cancel-${order.id}`);
    try {
      const r = await shoesAPI.cancelOrder(order.id, { token: await getToken() });
      setOrders((o) => ({ ...o, list: o.list.map((x) => (x.id === order.id ? r.order || { ...x, status: r.status, canCancel: false } : x)) }));
      notify("Order cancelled.");
    } catch (err) {
      notify(err.message, { type: "error" });
    } finally {
      setBusy("");
    }
  }

  if (!user) return null;

  const favoriteProducts = favorites.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const activeOrders = orders.list.filter((o) => ["DEMO_CONFIRMED", "PAID", "PENDING_PAYMENT"].includes(o.status)).length;
  const isFirebase = user.provider === "firebase";

  return (
    <main className="account-page" id="main-content">
      <div className="account-container">
        <div className="account-heading">
          <span className="account-eyebrow">YOUR PERSONAL SPACE</span>
          <h1>
            My Account<span>.</span>
          </h1>
        </div>

        <nav className="account-tabs" aria-label="Account sections">
          {[
            ["overview", "Overview"],
            ["orders", `Orders (${orders.list.length})`],
            ["favorites", `Favorites (${favorites.length})`],
            ["profile", "Personal info"],
            ["security", "Security"],
            ["preferences", "Preferences"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); navigate(`/account#${id}`, { replace: true }); }}>
              {label}
            </a>
          ))}
        </nav>

        <section className="account-profile" id="overview">
          {user.photoURL ? (
            <img className="account-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" width="72" height="72" />
          ) : (
            <div className="account-avatar account-initial" aria-hidden="true">
              {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2>{user.displayName || "SHOES Member"}</h2>
            <p>{user.email}</p>
            <span className="account-status">● Signed in with {isFirebase ? "SHOES account (Firebase)" : "SHOES ID (Clerk)"}</span>
          </div>
          <div className="account-stats">
            <div>
              <strong>{orders.list.length}</strong>
              <span>Orders</span>
            </div>
            <div>
              <strong>{activeOrders}</strong>
              <span>Active</span>
            </div>
            <div>
              <strong>{favorites.length}</strong>
              <span>Favorites</span>
            </div>
          </div>
        </section>

        <section className="account-panel wide" id="orders">
          <div className="panel-head">
            <h2>My Orders</h2>
            <button type="button" className="account-secondary" onClick={refresh} disabled={orders.loading}>
              {orders.loading ? "Loading…" : "↻ Refresh"}
            </button>
          </div>
          {orders.error && (
            <p className="account-error" role="alert">
              {orders.error}
            </p>
          )}
          {orders.loading && !orders.list.length ? (
            <LinesSkeleton lines={4} />
          ) : !orders.error && orders.list.length === 0 ? (
            <div className="account-placeholder empty-state">
              <div className="empty-icon" aria-hidden="true">📦</div>
              <strong>No orders yet</strong>
              <small>Orders you place while signed in appear here.</small>
              <button type="button" className="account-primary" onClick={() => navigate("/shop")}>
                Start shopping →
              </button>
            </div>
          ) : (
            <div className="account-orders">
              {orders.list.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onCancel={cancelOrder}
                  onReceipt={downloadReceipt}
                  onTrack={(order) => navigate(`/orders/${order.id}/tracking`)}
                  busy={busy}
                />
              ))}
            </div>
          )}
          <ClaimOrder getToken={getToken} onClaimed={refresh} enabled={Boolean(config?.features?.orderClaims)} />
        </section>

        <DesignsPanel onOpenCustomizer={(productId) => navigate(`/customizer/${productId}`)} />
        <AccountCommerce />
        <section className="account-panel wide" id="favorites">
          <div className="panel-head">
            <h2>My Favorites ({favorites.length})</h2>
          </div>
          {favoriteProducts.length === 0 ? (
            <div className="account-placeholder empty-state">
              <div className="empty-icon" aria-hidden="true">♡</div>
              <strong>No favorites yet</strong>
              <small>Tap the heart on any sneaker to save it here.</small>
              <button type="button" className="account-primary" onClick={() => navigate("/shop")}>
                Browse sneakers →
              </button>
            </div>
          ) : (
            <div className="favorites-grid">
              {favoriteProducts.map((p) => (
                <article className="favorite-card" key={p.id} data-testid="favorite-card">
                  <ProductImage src={p.image} alt={p.name} width="300" height="220" />
                  <div>
                    <small>{p.brand} · {p.category}</small>
                    <strong>{p.name}</strong>
                    <span>{money(p.price)}</span>
                  </div>
                  <div className="favorite-actions">
                    <button type="button" className="account-primary" onClick={() => onOpenProduct(p)}>
                      View product
                    </button>
                    <button type="button" className="account-secondary" onClick={() => onToggleFavorite(p.id)} aria-label={`Remove ${p.name} from favorites`}>
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="account-grid">
          <section className="account-panel" id="profile">
            <h2>Personal Information</h2>
            {isFirebase ? (
              <form onSubmit={saveProfile}>
                <label htmlFor="account-name">Full Name</label>
                <input id="account-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} required />
                <label htmlFor="account-email">Email Address</label>
                <input id="account-email" type="email" value={user.email || ""} readOnly />
                <button type="submit" className="account-primary" disabled={busy === "profile"}>
                  {busy === "profile" ? "Saving…" : "Save Changes →"}
                </button>
              </form>
            ) : (
              <>
                <div className="account-detail"><span>Name</span><strong>{user.displayName || "—"}</strong></div>
                <div className="account-detail"><span>Email</span><strong>{user.email}</strong></div>
                <button type="button" className="account-primary" onClick={openClerkProfile}>
                  Manage profile →
                </button>
              </>
            )}
          </section>

          <section className="account-panel" id="security">
            <h2>Security &amp; Login</h2>
            <div className="account-detail">
              <span>Sign-in methods</span>
              <strong>{user.methods?.join(", ") || (isFirebase ? "Firebase" : "Clerk")}</strong>
            </div>
            <div className="account-detail">
              <span>Email verified</span>
              <strong>{user.emailVerified ? "Yes" : "No"}</strong>
            </div>
            {me && (
              <div className="account-detail">
                <span>Linked sign-ins</span>
                <strong>{[me.providers.firebase && "SHOES account", me.providers.clerk && "SHOES ID"].filter(Boolean).join(" + ")}</strong>
              </div>
            )}
            {isFirebase ? (
              <>
                {!user.emailVerified && (
                  <button type="button" className="account-secondary" onClick={resendVerification} disabled={busy === "verify"}>
                    Resend verification e-mail
                  </button>
                )}
                <button type="button" className="account-secondary" onClick={resetPassword} disabled={busy === "reset"}>
                  Send password reset e-mail
                </button>
              </>
            ) : (
              <button type="button" className="account-secondary" onClick={openClerkProfile}>
                Manage password &amp; security →
              </button>
            )}
            <LinkAccounts me={me} onLinked={refresh} />
          </section>

          <section className="account-panel" id="preferences">
            <h2>Preferences</h2>
            <div className="account-detail">
              <span>Theme</span>
              <button type="button" className="account-secondary" onClick={onToggleTheme}>
                {theme === "dark" ? "☀ Switch to light" : "☾ Switch to dark"}
              </button>
            </div>
            <div className="account-detail">
              <span>Recently viewed</span>
              <button type="button" className="account-secondary" onClick={() => { onClearRecent(); notify("Recently viewed cleared."); }}>
                Clear history
              </button>
            </div>
            <button type="button" className="account-danger" onClick={onLogout}>
              Log Out
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
