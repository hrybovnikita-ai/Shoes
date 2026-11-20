
const router = require("express").Router();

const c = require("./controllers");
const { requireAuth } = require("./firebaseAdmin");

// ==========================================
// API INFORMATION
// ==========================================

router.get("/", c.index);
router.get("/health", c.health);

// ==========================================
// PRODUCTS
// ==========================================

router.get("/products", c.getProducts);
router.get("/products/:id", c.getProduct);

// ==========================================
// MY ACCOUNT - PROTECTED ROUTES
// ==========================================

router.get("/me", requireAuth, c.getMe);

router.get(
  "/me/orders",
  requireAuth,
  c.getMyOrders
);

// ==========================================
// DEMO ORDERS
// ==========================================

router.post("/orders", c.createOrder);

// Get order information
router.get("/orders/:id", c.getOrder);

// Download PDF receipt
router.get(
  "/orders/:id/receipt",
  c.downloadReceipt
);

// Cancel demo order
router.patch(
  "/orders/:id/cancel",
  c.cancelOrder
);

// ==========================================
// STORE STATISTICS
// ==========================================

router.get("/stats", c.getStats);

module.exports = router;
