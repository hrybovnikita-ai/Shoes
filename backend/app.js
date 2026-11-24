"use strict";

const crypto = require("node:crypto");
const express = require("express");

const { corsMiddleware } = require("./cors");
const log = require("./lib/logger");
const { rateLimit } = require("./lib/rateLimit");

// ========================================
// LOAD EXISTING STORE API
// ========================================

// Fail startup if critical routes cannot load.
// Do not silently replace the entire API with 503.

const { home, stripeWebhook } = require("./controllers");
const { clerkWebhook } = require("./lib/clerkWebhook");
const routes = require("./routes");
const adminRoutes = require("./routes/admin");

function assertHandler(handler, name) {
  if (typeof handler !== "function") {
    throw new TypeError(`${name} must export an Express handler/router`);
  }
}

assertHandler(home, "home");
assertHandler(stripeWebhook, "stripeWebhook");
assertHandler(routes, "routes");
assertHandler(adminRoutes, "adminRoutes");

// ========================================
// EXPRESS APPLICATION
// ========================================

const app = express();

app.disable("x-powered-by");

// Set this to the number of trusted reverse proxies
// in your deployment. Default: one proxy.
const trustProxy = Number(process.env.TRUST_PROXY ?? 1);

if (!Number.isInteger(trustProxy) || trustProxy < 0) {
  throw new Error("Invalid TRUST_PROXY value");
}

app.set("trust proxy", trustProxy);

// ========================================
// REQUEST ID + SECURITY HEADERS
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

  const privatePaths = ["/api/me", "/api/orders", "/api/admin"];

  if (
    privatePaths.some(
      (path) => req.path === path || req.path.startsWith(`${path}/`),
    )
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

// IMPORTANT:
// Stripe requires the raw request body.
// This route MUST stay before express.json().

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
// CLERK WEBHOOK (raw body, signed, idempotent)
// ========================================

app.post(
  "/api/webhooks/clerk",

  rateLimit({
    name: "clerk-webhook",
    windowMs: 60_000,
    max: 600,
  }),

  express.raw({
    type: "application/json",
    limit: "512kb",
  }),

  clerkWebhook,
);

// ========================================
// BODY PARSING
// ========================================

app.use(
  express.json({
    limit: "100kb",
    strict: true,
  }),
);

// ========================================
// HOME
// ========================================

app.get("/", home);

// ========================================
// ADMIN API
// ========================================

// Authorization must remain enforced
// inside the admin router or its middleware.

app.use("/api/admin", adminRoutes);

// ========================================
// STORE API
// ========================================

// Existing endpoints are preserved:
// products, reviews, checkout, orders,
// account and other registered routes.

app.use("/api", require("./commerce/routes"));
app.use("/api", require("./customizer/routes"));
app.use("/api", require("./tracking/routes"));
app.use("/api", routes);

// ========================================
// NOT FOUND
// ========================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: "API endpoint not found",
    requestId: req.id,
  });
});

// ========================================
// DATABASE / NETWORK ERROR CODES
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
  if (res.headersSent) {
    return next(err);
  }

  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    err.type === "entity.parse.failed"
  ) {
    return res.status(400).json({
      success: false,
      code: "INVALID_JSON",
      message: "Invalid JSON request",
      requestId: req.id,
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      code: "PAYLOAD_TOO_LARGE",
      message: "Request body too large",
      requestId: req.id,
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
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal server error",
    requestId: req.id,
  });
});

// ========================================
// EXPORT
// ========================================

module.exports = app;
