"use strict";
// Test harness: real PostgreSQL (local test database), real Express app on an
// ephemeral port. Token verification is replaced by a deterministic test
// verifier (NODE_ENV=test only); Firebase/Clerk signatures are therefore NOT
// exercised here — see e2e/ for the Firebase Auth emulator flow.
process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_DISABLED ??= "true"; // the limiter has its own unit test
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgres://shoes:local-shoes-only@127.0.0.1:55433/shoes_test";
process.env.FRONTEND_URL = "http://localhost:5173";

const u = new URL(process.env.DATABASE_URL);
if (!["127.0.0.1", "localhost"].includes(u.hostname) || !u.pathname.endsWith("_test")) {
  throw new Error("Refusing to run tests against a non-local or non-*_test database");
}

const { pool, seedProducts } = require("../db");
const { migrate } = require("../lib/migrate");
const auth = require("../lib/auth");

auth.__setTestVerifier(async (token) => {
  if (!token.startsWith("test.")) throw new auth.AuthError("Invalid or expired token");
  const data = JSON.parse(Buffer.from(token.slice(5), "base64url").toString());
  return { emailVerified: true, name: null, picture: null, ...data };
});

function tokenFor(provider, providerUserId, email, extra = {}) {
  return `test.${Buffer.from(JSON.stringify({ provider, providerUserId, email, ...extra })).toString("base64url")}`;
}

async function resetDb() {
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migrate(pool);
  await seedProducts();
}

async function startServer() {
  const app = require("../app");
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const base = `http://127.0.0.1:${server.address().port}/api`;
      resolve({ server, base });
    });
  });
}

async function api(base, method, path, { body, token, headers = {}, raw = false } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body),
  });
  if (raw) return res;
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { text };
  }
  return { status: res.status, body: json, headers: res.headers };
}

const customer = (over = {}) => ({
  name: "Test Buyer",
  email: "buyer@example.test",
  phone: "+380 50 123 4567",
  shippingAddress: { street: "1 Test Street", city: "Kyiv", country: "UA", postalCode: "01001" },
  ...over,
});

module.exports = { pool, resetDb, startServer, api, tokenFor, customer };
