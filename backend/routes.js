const router = require("express").Router();
const c = require("./controllers");

// API information
router.get("/", c.index);
router.get("/health", c.health);

// Products
router.get("/products", c.getProducts);
router.get("/products/:id", c.getProduct);

// Demo orders
router.post("/orders", c.createOrder);

// Get order information
router.get("/orders/:id", c.getOrder);

// Download PDF receipt
router.get("/orders/:id/receipt", c.downloadReceipt);

// Cancel demo order
router.patch("/orders/:id/cancel", c.cancelOrder);

// Store statistics
router.get("/stats", c.getStats);

module.exports = router;
