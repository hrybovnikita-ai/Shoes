"use strict";

const express = require("express");

const c = require("./controllers");

const { requireAuth, optionalAuth } = require("./firebaseAdmin");

const { rateLimit } = require("./lib/rateLimit");

const router = express.Router();

// ========================================
// RATE LIMITS
// ========================================

const readLimit = rateLimit({
  name: "read",
  windowMs: 60_000,
  max: 300,
});

const writeLimit = rateLimit({
  name: "write",
  windowMs: 60_000,
  max: 30,
});

const orderLimit = rateLimit({
  name: "orders",
  windowMs: 10 * 60_000,
  max: 20,
});

const claimLimit = rateLimit({
  name: "claims",
  windowMs: 15 * 60_000,
  max: 10,
});

// ========================================
// GENERAL API
// ========================================

router.get("/", c.index);

router.get("/health", c.health);

router.get("/config", c.config);

// ========================================
// PUBLIC PRODUCT CATALOG
// ========================================

router.get("/products", readLimit, c.getProducts);

router.get("/products/:id", readLimit, c.getProduct);

router.get("/products/:id/related", readLimit, c.getRelated);

router.get("/products/:id/reviews", readLimit, c.getReviews);

router.post("/products/:id/reviews", writeLimit, requireAuth, c.createReview);

// ========================================
// SHOPPING CART
// ========================================

router.post("/cart/quote", readLimit, optionalAuth, c.quoteCart);

// ========================================
// ORDERS
// ========================================

// Guest checkout is supported.
// Signed-in orders can be linked to users.

router.post("/orders", orderLimit, optionalAuth, c.createOrder);

// The order owner or a valid receipt token
// is required for protected order access.

router.get("/orders/:id", readLimit, optionalAuth, c.getOrder);

router.get("/orders/:id/receipt", readLimit, optionalAuth, c.downloadReceipt);

router.patch("/orders/:id/cancel", writeLimit, optionalAuth, c.cancelOrder);

// ========================================
// USER ACCOUNT
// ========================================

router.get("/me", readLimit, requireAuth, c.getMe);

router.get("/me/orders", readLimit, requireAuth, c.getMyOrders);

router.get("/me/orders/:id", readLimit, requireAuth, c.getMyOrder);

// ========================================
// FAVORITES
// ========================================

router.get("/me/favorites", readLimit, requireAuth, c.getFavorites);

router.put("/me/favorites", writeLimit, requireAuth, c.mergeFavorites);

router.post("/me/favorites/:id", writeLimit, requireAuth, c.addFavorite);

router.delete("/me/favorites/:id", writeLimit, requireAuth, c.removeFavorite);

// ========================================
// IDENTITY LINKING
// ========================================

router.post("/me/link-identity", writeLimit, requireAuth, c.linkIdentity);

// ========================================
// ORDER CLAIMS
// ========================================

router.post(
  "/me/orders/claim/request",
  claimLimit,
  requireAuth,
  c.requestClaim,
);

router.post(
  "/me/orders/claim/confirm",
  claimLimit,
  requireAuth,
  c.confirmClaim,
);

// ========================================
// NEWSLETTER
// ========================================

router.post("/newsletter", writeLimit, c.subscribeNewsletter);

// ========================================
// PUBLIC STORE STATISTICS
// ========================================

// Public store statistics.
// Protected admin statistics are handled
// separately in routes/admin.js.

router.get("/stats", readLimit, c.getStats);

// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router;
