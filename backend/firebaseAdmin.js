// Firebase Admin: verifies Firebase ID tokens on the server.
//
// Loaded lazily so a missing env var or a dependency problem can never crash
// the whole API at import time (that is what produced the
// FUNCTION_INVOCATION_FAILED / "no Access-Control-Allow-Origin" errors).
//
// Verifying ID tokens only needs the Firebase project ID (Google's public
// signing keys are fetched automatically); a service account is optional.

let authInstance = null;

class AuthNotConfiguredError extends Error {
  constructor(message) {
    super(message);
    this.code = "AUTH_NOT_CONFIGURED";
    this.status = 503;
  }
}

function projectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    ""
  ).trim();
}

function getFirebaseAuth() {
  if (authInstance) return authInstance;
  const pid = projectId();
  if (!pid) {
    throw new AuthNotConfiguredError("Account sign-in is not configured on the server (FIREBASE_PROJECT_ID missing)");
  }
  const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app");
  const { getAuth } = require("firebase-admin/auth");
  if (!getApps().length) {
    const options = { projectId: pid };
    // Only use a service account when one is explicitly configured.
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) options.credential = applicationDefault();
    initializeApp(options);
  }
  authInstance = getAuth();
  return authInstance;
}

function isConfigured() {
  return Boolean(projectId());
}

async function verifyIdToken(token) {
  return getFirebaseAuth().verifyIdToken(token);
}

function bearer(req) {
  const match = /^Bearer (\S+)$/i.exec(req.get("Authorization") || "");
  return match ? match[1] : null;
}

async function requireAuth(req, res, next) {
  const token = bearer(req);
  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  try {
    req.firebaseUser = await verifyIdToken(token);
    return next();
  } catch (error) {
    if (error.code === "AUTH_NOT_CONFIGURED") {
      console.error("SHOES auth:", error.message);
      return res.status(503).json({ success: false, code: error.code, message: "Sign-in is temporarily unavailable" });
    }
    return res.status(401).json({ success: false, message: "Invalid or expired Firebase token" });
  }
}

// Test hook (NODE_ENV=test only): replace the verifier.
function __setAuthForTests(fake) {
  if (process.env.NODE_ENV !== "test") throw new Error("test only");
  authInstance = fake;
}

module.exports = { requireAuth, verifyIdToken, isConfigured, getFirebaseAuth, AuthNotConfiguredError, __setAuthForTests };
