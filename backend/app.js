"use strict";
const crypto = require("node:crypto");
const express = require("express");
const cors = require("cors");

const { home, stripeWebhook } = require("./controllers");
const routes = require("./routes");
const log = require("./lib/logger");
const { rateLimit } = require("./lib/rateLimit");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

const origins = (process.env.FRONTEND_URL || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
const localOrigins = process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production"
  ? []
  : [5173, 5174, 5175, 5176, 4173].flatMap((p) => [`http://localhost:${p}`, `http://127.0.0.1:${p}`]);

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

// Stripe webhooks need the exact raw body for signature verification, so this
// route is registered BEFORE express.json() and without CORS (server-to-server).
app.post(
  "/api/payments/stripe/webhook",
  rateLimit({ name: "webhook", windowMs: 60_000, max: 600 }),
  express.raw({ type: "application/json", limit: "1mb" }),
  stripeWebhook
);

app.use(
  cors({
    origin: (origin, cb) => (!origin || [...origins, ...localOrigins].includes(origin) ? cb(null, true) : cb(new Error("CORS origin denied"))),
    allowedHeaders: ["Content-Type", "Authorization", "x-receipt-token"],
    exposedHeaders: ["Content-Disposition", "X-Request-Id"],
    maxAge: 600,
  })
);

app.use(express.json({ limit: "100kb" }));

app.get("/", home);
app.use("/api", routes);
app.use("/api", (req, res) => res.status(404).json({ success: false, message: "API endpoint not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) return res.status(400).json({ success: false, message: "Invalid JSON request" });
  if (err.type === "entity.too.large") return res.status(413).json({ success: false, message: "Request body too large" });
  if (err.message === "CORS origin denied") return res.status(403).json({ success: false, message: "Origin not allowed" });
  log.error("http.unhandled", { id: req.id, path: req.path, error: err });
  res.status(500).json({ success: false, message: "Internal server error", requestId: req.id });
});

module.exports = app;
