// CORS for the SHOES API.
//
// * Explicit allowlist: built-in production + local dev origins, plus any
//   origins from CORS_ORIGINS / FRONTEND_URL (comma-separated). Values are
//   normalized (trimmed, lower-cased, trailing slash removed) so
//   "https://shoes-red-alpha.vercel.app/" still matches.
// * Credentials are NOT enabled: the frontend authenticates with
//   "Authorization: Bearer <Firebase ID token>", not cookies.
// * Disallowed origins are not an error: the request simply gets no
//   Access-Control-Allow-Origin header and the browser blocks it.

const DEFAULT_ORIGINS = [
  "https://shoes-red-alpha.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:4173",
];

const ALLOWED_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const ALLOWED_HEADERS = "Content-Type,Authorization,X-Receipt-Token";
const EXPOSED_HEADERS = "Content-Disposition,X-Request-Id";

function normalizeOrigin(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

function allowedOrigins(env = process.env) {
  const extra = [env.CORS_ORIGINS, env.FRONTEND_URL]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...extra]);
}

function isAllowedOrigin(origin, env = process.env) {
  const o = normalizeOrigin(origin);
  return Boolean(o) && allowedOrigins(env).has(o);
}

// Sets CORS headers on `res` (Node http or Express). Returns true if the
// origin is allowed. Safe to call from crash fallbacks.
function applyCorsHeaders(req, res, env = process.env) {
  res.setHeader("Vary", "Origin");
  const origin = req.headers && req.headers.origin;
  if (!origin || !isAllowedOrigin(origin, env)) return false;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Expose-Headers", EXPOSED_HEADERS);
  return true;
}

function corsMiddleware(req, res, next) {
  const allowed = applyCorsHeaders(req, res);
  if (req.method === "OPTIONS") {
    if (allowed) {
      res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
      res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
      res.setHeader("Access-Control-Max-Age", "600");
    }
    res.statusCode = 204;
    return res.end();
  }
  next();
}

module.exports = {
  DEFAULT_ORIGINS,
  ALLOWED_METHODS,
  ALLOWED_HEADERS,
  normalizeOrigin,
  allowedOrigins,
  isAllowedOrigin,
  applyCorsHeaders,
  corsMiddleware,
};
