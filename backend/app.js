"use strict";

const crypto = require("node:crypto");
const express = require("express");

const { corsMiddleware } = require("./cors");
const log = require("./lib/logger");
const { rateLimit } = require("./lib/rateLimit");

// ========================================
// EXISTING STORE API
// ========================================

let home;
let stripeWebhook;
let routes;

try {
  ({ home, stripeWebhook } = require("./controllers"));
  routes = require("./routes");
} catch (error) {
  console.error("SHOES API failed to load:", error);

  const unavailable = (req, res) =>
    res.status(503).json({
      success: false,
      code: "API_UNAVAILABLE",
      message: "The SHOES API is temporarily unavailable",
    });

  home = stripeWebhook = routes = unavailable;
}

// ========================================
// ADMIN API
// ========================================

let adminRoutes;

try {
  adminRoutes = require("./routes/admin");

  if (typeof adminRoutes !== "function") {
    throw new TypeError("Admin router must export an Express router");
  }

  console.log("SHOES: Admin router loaded");

  // Print registered Admin API routes at startup.
  // Supports Express router structures used by
  // different Express versions.
  const layers = adminRoutes.stack || adminRoutes.router?.stack || [];

  const registeredPaths = layers
    .filter((layer) => layer.route)
    .map((layer) => {
      const methods = Object.keys(layer.route.methods || {})
        .filter((method) => layer.route.methods[method])
        .join(",")
        .toUpperCase();

      return `${methods} /api/admin${layer.route.path}`;
    });

  console.log("SHOES: Registered admin endpoints:", registeredPaths);
} catch (error) {
  console.error("SHOES Admin API failed to load:", error);

  adminRoutes = (req, res) =>
    res.status(503).json({
      success: false,
      code: "ADMIN_API_UNAVAILABLE",
      message: "Admin API is temporarily unavailable",
    });
}

// ========================================
// EXPRESS APPLICATION
// ========================================

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

// ========================================
// SECURITY HEADERS + LOGGING
// ========================================

app.use((req, res, next) => {
  req.id = crypto.randomUUID();

  res.setHeader("X-Request-Id", req.id);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");

  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'",
  );

  if (
    req.path.startsWith("/api/me") ||
    req.path.startsWith("/api/orders") ||
    req.path.startsWith("/api/admin")
  ) {
    res.setHeader("Cache-Control", "private, no-store");
  }

  const started = Date.now();

  res.on("finish", () => {
    log.info("http", {
      id: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - started,
    });
  });

  next();
});

// ========================================
// CORS
// ========================================

app.use(corsMiddleware);

// ========================================
// STRIPE WEBHOOK
// ========================================

// Must receive the raw request body.
app.post(
  "/api/payments/stripe/webhook",
  rateLimit({
    name: "webhook",
    windowMs: 60_000,
    max: 600,
  }),
  express.raw({
    type: "application/json",
    limit: "1mb",
  }),
  stripeWebhook,
);

// ========================================
// JSON PARSER
// ========================================

app.use(
  express.json({
    limit: "100kb",
  }),
);

// ========================================
// HOME
// ========================================

app.get("/", home);

// ========================================
// PROTECTED ADMIN API
// ========================================

// Routes:
// GET /api/admin/me
// GET /api/admin/health
// GET /api/admin/stats
// GET /api/admin/orders
// GET /api/admin/users

app.use("/api/admin", adminRoutes);

// ========================================
// EXISTING STORE API
// ========================================

app.use("/api", routes);

// ========================================
// 404 HANDLER
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// ========================================
// DATABASE ERROR CODES
// ========================================

const UNAVAILABLE_CODES = new Set([
  "DB_NOT_CONFIGURED",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ECONNRESET",
  "57P01",
  "57P03",
  "53300",
  "28P01",
  "28000",
  "3D000",
]);

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request",
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body too large",
    });
  }

  if (UNAVAILABLE_CODES.has(err.code)) {
    log.error("http.dependency_unavailable", {
      id: req.id,
      path: req.path,
      code: err.code,
    });

    return res.status(503).json({
      success: false,
      code: "SERVICE_UNAVAILABLE",
      message:
        "The store is temporarily unavailable. Please try again shortly.",
      requestId: req.id,
    });
  }

  log.error("http.unhandled", {
    id: req.id,
    path: req.path,
    error: err,
  });

  return res.status(500).json({
    success: false,
    message: "Internal server error",
    requestId: req.id,
  });
});

// ========================================
// EXPORT APPLICATION
// ========================================

module.exports = app;
