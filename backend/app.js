"use strict";
const crypto = require("node:crypto");
const express = require("express");
const { corsMiddleware } = require("./cors");
const log = require("./lib/logger");

// Load the API defensively: if a dependency or config problem breaks the
// import, the app still answers JSON 503 (with CORS) instead of crashing the
// whole Vercel function with a plain-text 500.
let home;
let stripeWebhook;
let routes;
try {
  ({ home, stripeWebhook } = require("./controllers"));
  routes = require("./routes");
} catch (error) {
  console.error("SHOES API failed to load:", error);
  const unavailable = (req, res) =>
    res.status(503).json({ success: false, code: "API_UNAVAILABLE", message: "The SHOES API is temporarily unavailable" });
  home = stripeWebhook = routes = unavailable;
}
const { rateLimit } = require("./lib/rateLimit");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);


// Security headers (API returns JSON / PDF only).
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  if (req.path.startsWith("/api/me") || req.path.startsWith("/api/orders")) res.setHeader("Cache-Control", "private, no-store");
  const started = Date.now();
  res.on("finish", () => {
    log.info("http", { id: req.id, method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - started });
  });
  next();
});

// CORS before everything else so every response (404, 5xx, degraded 503)
// carries the headers and preflights end here with 204. Explicit allowlist:
// production origin + localhost built in, CORS_ORIGINS / FRONTEND_URL added.
app.use(corsMiddleware);

// Stripe webhooks need the exact raw body for signature verification, so this
// route is registered BEFORE express.json() and without CORS (server-to-server).
app.post(
  "/api/payments/stripe/webhook",
  rateLimit({ name: "webhook", windowMs: 60_000, max: 600 }),
  express.raw({ type: "application/json", limit: "1mb" }),
  stripeWebhook
);


app.use(express.json({ limit: "100kb" }));

app.get("/", home);
app.use("/api", routes);
app.use((req, res) => res.status(404).json({ success: false, message: "API endpoint not found" }));

const UNAVAILABLE_CODES = new Set(["DB_NOT_CONFIGURED", "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "57P01", "57P03", "53300", "28P01", "28000", "3D000"]);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) return res.status(400).json({ success: false, message: "Invalid JSON request" });
  if (err.type === "entity.too.large") return res.status(413).json({ success: false, message: "Request body too large" });
  if (UNAVAILABLE_CODES.has(err.code)) {
    log.error("http.dependency_unavailable", { id: req.id, path: req.path, code: err.code });
    return res.status(503).json({ success: false, code: "SERVICE_UNAVAILABLE", message: "The store is temporarily unavailable. Please try again shortly.", requestId: req.id });
  }
  log.error("http.unhandled", { id: req.id, path: req.path, error: err });
  res.status(500).json({ success: false, message: "Internal server error", requestId: req.id });
});

module.exports = app;
