
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase";
import "./AccountPage.css";

export default function AccountPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setName(currentUser?.displayName || "");
        setLoading(false);
      },
      () => {
        setError("Could not load your account.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  async function saveProfile(event) {
    event.preventDefault();

    if (!user || saving) return;

    if (name.trim().length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await updateProfile(user, {
        displayName: name.trim(),
      });

      setUser({ ...user, displayName: name.trim() });
      setMessage("Profile updated successfully.");
    } catch (err) {
      console.error("Profile update:", err.code);
      setError("Could not update your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (!user?.email || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage(
        "If password sign-in is available for this email, you will receive instructions. Check your inbox."
      );
    } catch (err) {
      console.error("Password reset:", err.code);
      setError(
        "Could not send password instructions. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    setError("");

    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout:", err.code);
      setError("Could not sign out.");
    }
  }

  if (loading) {
    return (
      <main className="account-page">
        <p>Loading your account...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="account-page">
        <section className="account-panel">
          <h1>Sign in required</h1>
          <p>Please sign in to access your account.</p>
          <button
            className="account-primary"
            onClick={() => navigate("/login", {
              state: { from: { pathname: "/account" } },
            })}
          >
            Sign In
          </button>
        </section>
      </main>
    );
  }

  const providerNames = user.providerData
    .map((provider) =>
      provider.providerId === "google.com"
        ? "Google"
        : provider.providerId === "password"
          ? "Email / Password"
          : provider.providerId
    )
    .join(", ");

  return (
    <main className="account-page">
      <div className="account-container">
        <header className="account-header">
          <button
            className="account-logo"
            onClick={() => navigate("/shop")}
          >
            SHOES<span>.</span>
          </button>

          <button
            className="account-back"
            onClick={() => navigate("/shop")}
          >
            ← Back to Shop
          </button>
        </header>

        <div className="account-heading">
          <span className="account-eyebrow">
            YOUR PERSONAL SPACE
          </span>
          <h1>My Account<span>.</span></h1>
          <p>Manage your profile and security settings.</p>
        </div>

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
              {(user.displayName || user.email || "U")
                .charAt(0)
                .toUpperCase()}
            </div>
          )}

          <div>
            <h2>{user.displayName || "SHOES Member"}</h2>
            <p>{user.email}</p>
            <span className="account-status">
              ● Active account
            </span>
          </div>
        </section>

        {error && (
          <p className="account-error" role="alert">
            {error}
          </p>
        )}

        {message && (
          <p className="account-success" role="status">
            {message}
          </p>
        )}

        <div className="account-grid">
          <section className="account-panel">
            <h2>Personal Information</h2>
            <p>Update your public profile name.</p>

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
                value={user.email || ""}
                readOnly
              />

              <button
                className="account-primary"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes →"}
              </button>
            </form>
          </section>

          <section className="account-panel">
            <h2>Security & Login</h2>
            <p>Manage how you access SHOES.</p>

            <div className="account-detail">
              <span>Sign-in methods</span>
              <strong>{providerNames || "Firebase"}</strong>
            </div>

            <div className="account-detail">
              <span>Email verified</span>
              <strong>
                {user.emailVerified ? "Yes" : "No"}
              </strong>
            </div>

            <button
              className="account-secondary"
              onClick={resetPassword}
              disabled={saving}
            >
              Send Password Instructions
            </button>

            <p className="account-note">
              Password reset is available for accounts
              with email/password sign-in. Google-only
              accounts may need to link a password
              credential separately.
            </p>
          </section>

          <section className="account-panel">
            <h2>My Orders</h2>
            <p>View your SHOES order history.</p>

            <div className="account-placeholder">
              Order history is coming soon.
              <small>
                We will connect this section to your
                account's orders in PostgreSQL.
              </small>
            </div>

            <button
              className="account-secondary"
              onClick={() => navigate("/shop")}
            >
              Explore Products →
            </button>
          </section>

          <section className="account-panel">
            <h2>Account Settings</h2>
            <p>Manage your current session.</p>

            <div className="account-detail">
              <span>Account ID</span>
              <strong title={user.uid}>
                {user.uid.slice(0, 12)}...
              </strong>
            </div>

            <button
              className="account-logout"
              onClick={logout}
            >
              Log Out
            </button>
          </section>
        </div>

        <footer className="account-footer">
          © {new Date().getFullYear()} SHOES.
          All rights reserved.
        </footer>
      </div>
    </main>
  );
}
