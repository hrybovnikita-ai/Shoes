
import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";

import { auth, googleProvider, firebaseEnabled } from "./firebase";
import { useAuth } from "./auth/AuthContext";
import { clerkEnabled } from "./auth/config";
import useDocumentMeta from "./hooks/useDocumentMeta";

const ClerkAuthPanel = clerkEnabled ? lazy(() => import("./auth/ClerkAuthPanel.jsx")) : null;
import "./AuthPage.css";

function Eye({ crossed }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M3 3l18 18" />}
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.88 46.98 24.55z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function getErrorMessage(error) {
  const messages = {
    "auth/email-already-in-use":
      "This email is already registered. Try signing in.",
    "auth/invalid-email":
      "Please enter a valid email address.",
    "auth/weak-password":
      "Your password is too weak. Use at least 8 characters.",
    "auth/invalid-credential":
      "Incorrect email or password. If you registered with Google, use Continue with Google.",
    "auth/wrong-password":
      "Incorrect password. Please try again.",
    "auth/user-not-found":
      "No account found with this email. Try signing up.",
    "auth/user-disabled":
      "This account has been disabled.",
    "auth/too-many-requests":
      "Too many attempts. Please try again later.",
    "auth/network-request-failed":
      "Network error. Check your internet connection.",
    "auth/popup-blocked":
      "Google popup was blocked by your browser.",
    "auth/popup-closed-by-user":
      "Google sign-in was cancelled.",
    "auth/cancelled-popup-request":
      "Google sign-in was interrupted. Try again.",
    "auth/unauthorized-domain":
      "This domain is not authorized in Firebase.",
    "auth/operation-not-allowed":
      "This sign-in method is not enabled in Firebase.",
    "auth/invalid-api-key":
      "Firebase API key is invalid. Check firebase.js.",
    "auth/configuration-not-found":
      "Firebase Authentication is not configured correctly.",
    "auth/account-exists-with-different-credential":
      "This email uses another sign-in method. Try your original method.",
    "auth/requires-recent-login":
      "Please sign in again before continuing.",
  };

  return (
    messages[error?.code] ||
    "Something went wrong. Please try again."
  );
}

function FirebaseAuthForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const register = location.pathname.startsWith("/register");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const from = location.state?.from;
  const destination =
    typeof from?.pathname === "string" &&
    from.pathname.startsWith("/") &&
    !from.pathname.startsWith("//") &&
    !["/login", "/register"].includes(from.pathname)
      ? `${from.pathname}${from.search || ""}${from.hash || ""}`
      : "/account";

  function change(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setNotice("");
  }

  function switchTo(next) {
    setError("");
    setNotice("");
    setShowPassword(false);
    setShowConfirm(false);

    navigate(next === "register" ? "/register" : "/login", {
      state: location.state,
    });
  }

  async function configurePersistence() {
    await setPersistence(
      auth,
      remember
        ? browserLocalPersistence
        : browserSessionPersistence
    );
  }

  async function submit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setNotice("");

    const email = form.email.trim().toLowerCase();

    if (register && form.name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!form.password) {
      setError("Please enter your password.");
      return;
    }

    if (register) {
      if (form.password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }

      if (form.password !== form.confirm) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      await configurePersistence();

      if (register) {
        const result = await createUserWithEmailAndPassword(
          auth,
          email,
          form.password
        );

        try {
          await updateProfile(result.user, {
            displayName: form.name.trim(),
          });
        } catch (profileError) {
          console.warn(
            "SHOES: Profile name update failed:",
            profileError.code || profileError.message
          );
        }

        try {
          await sendEmailVerification(result.user);
        } catch (verifyError) {
          console.warn("SHOES: Verification email failed:", verifyError.code || verifyError.message);
        }
      } else {
        await signInWithEmailAndPassword(
          auth,
          email,
          form.password
        );
      }

      navigate(destination, { replace: true });
    } catch (err) {
      console.error("SHOES Firebase Auth:", err.code, err.message);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loginWithGoogle() {
    if (loading) return;

    setLoading(true);
    setError("");
    setNotice("");

    try {
      await configurePersistence();

      await signInWithPopup(
        auth,
        googleProvider
      );

      navigate(destination, { replace: true });
    } catch (err) {
      console.error(
        "SHOES Google Auth:",
        err.code,
        err.message
      );

      if (
        err.code !== "auth/popup-closed-by-user" &&
        err.code !== "auth/cancelled-popup-request"
      ) {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (loading) return;

    setError("");
    setNotice("");

    const email = form.email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address first.");
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);

      setNotice(
        "If this email has a password account, a reset email will be sent. Check your inbox and spam folder."
      );
    } catch (err) {
      console.error(
        "SHOES Password Reset:",
        err.code,
        err.message
      );

      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        setNotice(
          "If this email has a password account, a reset email will be sent."
        );
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-container">
        <button
          className="auth-brand"
          type="button"
          onClick={() => navigate("/")}
        >
          SHOES<span>.</span>
        </button>

        <section
          className="auth-card"
          aria-label={register ? "Sign up" : "Sign in"}
        >
          <div className="auth-top">
            <span className="auth-eyebrow">
              WELCOME TO SHOES
            </span>

            <h1>
              {register
                ? "Create your account."
                : "Welcome back."}
            </h1>

            <p>
              {register
                ? "Join the movement. Discover your next favorite pair."
                : "Sign in to continue your sneaker journey."}
            </p>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={!register ? "active" : ""}
              onClick={() => switchTo("login")}
              disabled={loading}
            >
              Sign In
            </button>

            <button
              type="button"
              className={register ? "active" : ""}
              onClick={() => switchTo("register")}
              disabled={loading}
            >
              Sign Up
            </button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {register && (
              <div className="auth-field">
                <label htmlFor="auth-name">
                  Full Name
                </label>

                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={change}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={150}
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="auth-email">
                Email Address
              </label>

              <input
                id="auth-email"
                type="email"
                name="email"
                value={form.email}
                onChange={change}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">
                Password
              </label>

              <div className="auth-password">
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={change}
                  placeholder={
                    register
                      ? "At least 8 characters"
                      : "Enter your password"
                  }
                  autoComplete={
                    register
                      ? "new-password"
                      : "current-password"
                  }
                  required
                  minLength={register ? 8 : undefined}
                  disabled={loading}
                />

                <button
                  type="button"
                  className="auth-eye"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  <Eye crossed={!showPassword} />
                </button>
              </div>
            </div>

            {register && (
              <div className="auth-field">
                <label htmlFor="auth-confirm">
                  Confirm Password
                </label>

                <div className="auth-password">
                  <input
                    id="auth-confirm"
                    name="confirm"
                    type={showConfirm ? "text" : "password"}
                    value={form.confirm}
                    onChange={change}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    required
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="auth-eye"
                    onClick={() =>
                      setShowConfirm((value) => !value)
                    }
                    aria-label={
                      showConfirm
                        ? "Hide confirmation password"
                        : "Show confirmation password"
                    }
                  >
                    <Eye crossed={!showConfirm} />
                  </button>
                </div>
              </div>
            )}

            {!register && (
              <div className="auth-options">
                <label className="auth-remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) =>
                      setRemember(event.target.checked)
                    }
                    disabled={loading}
                  />
                  Remember me
                </label>

                <button
                  type="button"
                  className="auth-link"
                  onClick={resetPassword}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            {notice && (
              <p className="auth-success" role="status">
                {notice}
              </p>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : register
                  ? "Create Account →"
                  : "Sign In →"}
            </button>
          </form>

          <div className="auth-divider">
            <span>OR CONTINUE WITH</span>
          </div>

          <button
            className="auth-google"
            type="button"
            onClick={loginWithGoogle}
            disabled={loading}
          >
            <GoogleIcon />
            {loading
              ? "Connecting..."
              : "Continue with Google"}
          </button>

          <p className="auth-switch">
            {register
              ? "Already have an account?"
              : "Don't have an account?"}{" "}

            <button
              type="button"
              onClick={() =>
                switchTo(register ? "login" : "register")
              }
              disabled={loading}
            >
              {register ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </section>

        <p className="auth-bottom">
          © {new Date().getFullYear()} SHOES.
          All rights reserved.
        </p>
      </div>
    </main>
  );
}

function destinationFrom(location) {
  const from = location.state?.from;
  return typeof from?.pathname === "string" &&
    from.pathname.startsWith("/") &&
    !from.pathname.startsWith("//") &&
    !/^\/(login|register)/.test(from.pathname)
    ? `${from.pathname}${from.search || ""}${from.hash || ""}`
    : "/account";
}

// Chooses the sign-in experience:
//  - Clerk (if VITE_CLERK_PUBLISHABLE_KEY is set) as the primary option, with
//    the existing Firebase sign-in still available for existing accounts;
//  - otherwise the existing Firebase sign-in only (default).
export default function AuthPage({ mode = "login" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, ready } = useAuth();
  const legacy = new URLSearchParams(location.search).get("method") === "firebase";
  const destination = destinationFrom(location);
  useDocumentMeta({ title: mode === "register" ? "Create account" : "Sign in", noindex: true });

  useEffect(() => {
    if (ready && user) navigate(destination, { replace: true });
  }, [ready, user, destination, navigate]);

  if (!firebaseEnabled && !clerkEnabled) {
    return (
      <main className="auth-page">
        <div className="auth-container">
          <section className="auth-card">
            <h1>Sign-in is not configured.</h1>
            <p>Set the Firebase (VITE_FIREBASE_*) or Clerk (VITE_CLERK_PUBLISHABLE_KEY) variables for the frontend. Guest checkout still works.</p>
            <button type="button" className="auth-submit" onClick={() => navigate("/shop")}>Back to Shop →</button>
          </section>
        </div>
      </main>
    );
  }

  if (!clerkEnabled || (legacy && firebaseEnabled)) {
    return (
      <>
        {clerkEnabled && (
          <div className="auth-switch-banner">
            Using your existing SHOES account (Firebase).{" "}
            <button type="button" onClick={() => navigate(location.pathname.startsWith("/register") ? "/register" : "/login", { state: location.state })}>
              Use the new sign-in instead
            </button>
          </div>
        )}
        <FirebaseAuthForm />
      </>
    );
  }

  return (
    <main className="auth-page clerk-auth">
      <div className="auth-container">
        <button className="auth-brand" type="button" onClick={() => navigate("/")}>
          SHOES<span>.</span>
        </button>
        <Suspense fallback={<p role="status">Loading sign-in…</p>}>
          <ClerkAuthPanel mode={mode} redirectTo={destination} />
        </Suspense>
        {firebaseEnabled && (
          <p className="auth-legacy-link">
            Have an account from before?{" "}
            <button type="button" onClick={() => navigate(`/login?method=firebase`, { state: location.state })}>
              Sign in with your existing SHOES account
            </button>
            <small>After signing in you can link it to your new sign-in in My Account → Security, so your past orders follow you.</small>
          </p>
        )}
      </div>
    </main>
  );
}
