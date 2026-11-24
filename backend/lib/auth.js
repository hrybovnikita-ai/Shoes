"use strict";
// SHOES identity layer.
//
// Accepts EITHER a Firebase ID token (existing accounts, default path) OR a
// Clerk session token (new sign-in, enabled only when CLERK_SECRET_KEY is set).
// Every verification happens on the server. Each provider identity maps to a
// row in shoes_users; the two providers are only linked to the same row via
// POST /api/me/link-identity, which requires a valid token from BOTH.
// No account is ever linked, merged or deleted automatically.

const log = require("./logger");

let firebaseAuth = null;
let clerk = null; // { verifyToken, client }
let testVerifier = null;

const FIREBASE_ISSUER = "https://securetoken.google.com/";

function firebaseEnabled() {
  return Boolean(process.env.FIREBASE_PROJECT_ID);
}

function clerkEnabled() {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

function getFirebaseAuth() {
  if (firebaseAuth) return firebaseAuth;
  if (!firebaseEnabled()) return null;
  const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app");
  const { getAuth } = require("firebase-admin/auth");
  if (!getApps().length) {
    // verifyIdToken only needs the project id (it checks Google's public
    // certificates). A service account is optional and only used if present.
    const options = { projectId: process.env.FIREBASE_PROJECT_ID };
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) options.credential = applicationDefault();
    initializeApp(options);
  }
  firebaseAuth = getAuth();
  return firebaseAuth;
}

function isLocalDevParty(origin) {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function authorizedParties() {
  const cors = require("../cors");
  let fromEnv = (process.env.CLERK_AUTHORIZED_PARTIES || process.env.FRONTEND_URL || "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (process.env.NODE_ENV === "production") {
    fromEnv = fromEnv.filter((o) => !isLocalDevParty(o));
  }
  const httpsBuiltins = cors.DEFAULT_ORIGINS.filter((o) => o.startsWith("https://"));
  return [...new Set([...fromEnv, ...httpsBuiltins])];
}

function getClerk() {
  if (clerk) return clerk;
  if (!clerkEnabled()) return null;
  const { verifyToken, createClerkClient } = require("@clerk/backend");
  clerk = {
    verifyToken,
    client: createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY }),
  };
  return clerk;
}

function decodeUnverified(token) {
  try {
    const part = token.split(".")[1];
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

const clerkUserCache = new Map(); // userId -> { at, data }
const CLERK_CACHE_MS = 5 * 60 * 1000;

async function clerkProfile(userId) {
  const hit = clerkUserCache.get(userId);
  if (hit && Date.now() - hit.at < CLERK_CACHE_MS) return hit.data;
  const u = await getClerk().client.users.getUser(userId);
  const primary = (u.emailAddresses || []).find((e) => e.id === u.primaryEmailAddressId) || (u.emailAddresses || [])[0];
  const data = {
    email: primary?.emailAddress || null,
    emailVerified: primary?.verification?.status === "verified",
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || null,
    picture: u.imageUrl || null,
  };
  clerkUserCache.set(userId, { at: Date.now(), data });
  return data;
}

class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}

// Returns { provider, providerUserId, email, emailVerified, name, picture }
async function verifyToken(token) {
  if (typeof token !== "string" || token.length < 10 || token.length > 8192) {
    throw new AuthError("Invalid authentication token");
  }
  if (testVerifier) return testVerifier(token);

  const claims = decodeUnverified(token);
  const iss = typeof claims?.iss === "string" ? claims.iss : "";

  if (iss.startsWith(FIREBASE_ISSUER)) {
    const fb = getFirebaseAuth();
    if (!fb) throw new AuthError("Firebase sign-in is not configured on the server", 503);
    try {
      const d = await fb.verifyIdToken(token);
      return {
        provider: "firebase",
        providerUserId: d.uid,
        email: d.email || null,
        emailVerified: Boolean(d.email_verified),
        name: d.name || null,
        picture: d.picture || null,
      };
    } catch {
      throw new AuthError("Invalid or expired Firebase token");
    }
  }

  const ck = getClerk();
  if (ck) {
    let payload;
    try {
      const parties = authorizedParties();
      payload = await ck.verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
        ...(parties.length ? { authorizedParties: parties } : {}),
      });
    } catch {
      throw new AuthError("Invalid or expired Clerk session");
    }
    if (!payload?.sub) throw new AuthError("Invalid or expired Clerk session");
    let profile = { email: null, emailVerified: false, name: null, picture: null };
    try {
      profile = await clerkProfile(payload.sub);
    } catch (err) {
      log.warn("clerk.profile_lookup_failed", { error: err });
    }
    return { provider: "clerk", providerUserId: payload.sub, ...profile };
  }

  throw new AuthError("Unsupported authentication token");
}

const PROVIDER_COLUMN = { firebase: "firebase_uid", clerk: "clerk_user_id" };

async function findUserRow(db, identity) {
  const col = PROVIDER_COLUMN[identity.provider];
  let { rows } = await db.query(`SELECT * FROM shoes_users WHERE ${col} = $1`, [identity.providerUserId]);
  let row = rows[0] || null;
  for (let i = 0; row && row.merged_into && i < 5; i += 1) {
    ({ rows } = await db.query("SELECT * FROM shoes_users WHERE id = $1", [row.merged_into]));
    row = rows[0] || null;
  }
  return row;
}

// Find or create the internal user for a verified identity.
async function resolveUser(db, identity) {
  const col = PROVIDER_COLUMN[identity.provider];
  const existing = await findUserRow(db, identity);
  if (existing) {
    const { rows } = await db.query(
      `UPDATE shoes_users SET
         email = COALESCE($2, email),
         email_verified = CASE WHEN $2 IS NULL THEN email_verified ELSE $3 END,
         display_name = COALESCE(display_name, $4),
         avatar_url = COALESCE($5, avatar_url),
         last_login_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [existing.id, identity.email ? identity.email.toLowerCase() : null, identity.emailVerified, identity.name, identity.picture]
    );
    return rows[0];
  }
  const { rows } = await db.query(
    `INSERT INTO shoes_users (${col}, email, email_verified, display_name, avatar_url, last_login_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (${col}) DO UPDATE SET last_login_at = NOW()
     RETURNING *`,
    [identity.providerUserId, identity.email ? identity.email.toLowerCase() : null, identity.emailVerified, identity.name, identity.picture]
  );
  return rows[0];
}

function bearer(req) {
  const header = req.get("Authorization");
  if (!header) return { present: false };
  const m = /^Bearer (\S+)$/i.exec(header);
  return { present: true, token: m ? m[1] : null };
}

function makeMiddleware(pool, { required }) {
  return async function auth(req, res, next) {
    const b = bearer(req);
    if (!b.present) {
      if (!required) {
        req.identity = null;
        req.user = null;
        return next();
      }
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (!b.token) return res.status(401).json({ success: false, message: "Invalid authorization header" });
    try {
      req.identity = await verifyToken(b.token);
      req.user = await resolveUser(pool, req.identity);
      return next();
    } catch (err) {
      if (err instanceof AuthError) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      return next(err);
    }
  };
}

function publicUser(row, identity) {
  return {
    id: String(row.id),
    email: row.email,
    emailVerified: row.email_verified,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    providers: { firebase: Boolean(row.firebase_uid), clerk: Boolean(row.clerk_user_id) },
    signedInWith: identity?.provider || null,
    createdAt: row.created_at,
  };
}

function __setTestVerifier(fn) {
  if (process.env.NODE_ENV !== "test") throw new Error("Test verifier is only allowed when NODE_ENV=test");
  testVerifier = fn;
}

module.exports = {
  AuthError,
  verifyToken,
  resolveUser,
  findUserRow,
  makeMiddleware,
  publicUser,
  firebaseEnabled,
  clerkEnabled,
  PROVIDER_COLUMN,
  authorizedParties,
  __setTestVerifier,
};
