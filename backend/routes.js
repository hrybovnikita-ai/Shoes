"use strict";
const router = require("express").Router();
const c = require("./controllers");
const { requireAuth, optionalAuth } = require("./firebaseAdmin");
const { rateLimit } = require("./lib/rateLimit");

const readLimit = rateLimit({ name: "read", windowMs: 60_000, max: 300 });
const writeLimit = rateLimit({ name: "write", windowMs: 60_000, max: 30 });
const orderLimit = rateLimit({ name: "orders", windowMs: 10 * 60_000, max: 20 });
const claimLimit = rateLimit({ name: "claims", windowMs: 15 * 60_000, max: 10 });

// Info
router.get("/", c.index);
router.get("/health", c.health);
router.get("/config", c.config);

// Catalog (public)
router.get("/products", readLimit, c.getProducts);
router.get("/products/:id", readLimit, c.getProduct);
router.get("/products/:id/related", readLimit, c.getRelated);
router.get("/products/:id/reviews", readLimit, c.getReviews);
router.post("/products/:id/reviews", writeLimit, requireAuth, c.createReview);

// Cart pricing (server-validated)
router.post("/cart/quote", readLimit, c.quoteCart);

// Orders: guest checkout allowed; signed-in orders are linked to the account.
router.post("/orders", orderLimit, optionalAuth, c.createOrder);
// Access: the signed-in owner OR the order's receipt token (x-receipt-token).
router.get("/orders/:id", readLimit, optionalAuth, c.getOrder);
router.get("/orders/:id/receipt", readLimit, optionalAuth, c.downloadReceipt);
router.patch("/orders/:id/cancel", writeLimit, optionalAuth, c.cancelOrder);

// My account (every route verifies the user on the server)
router.get("/me", readLimit, requireAuth, c.getMe);
router.get("/me/orders", readLimit, requireAuth, c.getMyOrders);
router.get("/me/orders/:id", readLimit, requireAuth, c.getMyOrder);
router.get("/me/favorites", readLimit, requireAuth, c.getFavorites);
router.put("/me/favorites", writeLimit, requireAuth, c.mergeFavorites);
router.post("/me/favorites/:id", writeLimit, requireAuth, c.addFavorite);
router.delete("/me/favorites/:id", writeLimit, requireAuth, c.removeFavorite);
router.post("/me/link-identity", writeLimit, requireAuth, c.linkIdentity);
router.post("/me/orders/claim/request", claimLimit, requireAuth, c.requestClaim);
router.post("/me/orders/claim/confirm", claimLimit, requireAuth, c.confirmClaim);

// Newsletter
router.post("/newsletter", writeLimit, c.subscribeNewsletter);

// Store statistics
router.get("/stats", readLimit, c.getStats);

module.exports = router;
