const express = require("express");
const cors = require("cors");
const crypto = require("node:crypto");

const app = express();
const PORT = process.env.PORT || 5000;

app.disable("x-powered-by");

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
  ],
}));

app.use(express.json({ limit: "100kb" }));

// =====================================
// PRODUCTS DATABASE (DEMO)
// =====================================

const products = [
  {
    id: 1,
    name: "Nike Air Max 270",
    brand: "Nike",
    category: "Running",
    price: 150,
    oldPrice: 185,
    color: "Red",
    rating: 4.9,
    stock: 20,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900",
  },
  {
    id: 2,
    name: "Adidas Ultraboost",
    brand: "Adidas",
    category: "Running",
    price: 180,
    oldPrice: 220,
    color: "White",
    rating: 4.8,
    stock: 15,
    image:
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=900",
  },
  {
    id: 3,
    name: "Nike Air Jordan",
    brand: "Nike",
    category: "Lifestyle",
    price: 210,
    oldPrice: 250,
    color: "Black",
    rating: 4.9,
    stock: 12,
    image:
      "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=900",
  },
  {
    id: 4,
    name: "New Balance Classic",
    brand: "New Balance",
    category: "Lifestyle",
    price: 135,
    oldPrice: 165,
    color: "Grey",
    rating: 4.7,
    stock: 18,
    image:
      "https://images.unsplash.com/photo-1539185441755-769473a23570?w=900",
  },
  {
    id: 5,
    name: "Converse All Star",
    brand: "Converse",
    category: "Casual",
    price: 85,
    oldPrice: 110,
    color: "Black",
    rating: 4.8,
    stock: 25,
    image:
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=900",
  },
  {
    id: 6,
    name: "Nike Street Edition",
    brand: "Nike",
    category: "Lifestyle",
    price: 165,
    oldPrice: 195,
    color: "White",
    rating: 4.6,
    stock: 14,
    image:
      "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=900",
  },
];

// Temporary orders storage
const orders = new Map();
const allowedSizes = [7, 8, 8.5, 9, 9.5, 10, 11, 12];

// =====================================
// HELPERS
// =====================================

function money(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function findProduct(id) {
  return products.find(
    (product) => product.id === Number(id)
  );
}

function validEmail(email) {
  return (
    typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function validText(value, max = 150) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= max
  );
}

// =====================================
// HOME / HEALTH
// =====================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    project: "SHOES",
    version: "2.0.0",
    message: "SHOES Backend API is running",
  });
});

app.get("/api", (req, res) => {
  res.json({
    success: true,
    project: "SHOES API",
    endpoints: [
      "GET /api/health",
      "GET /api/products",
      "GET /api/products/:id",
      "POST /api/orders",
      "GET /api/orders/:id",
      "PATCH /api/orders/:id/cancel",
      "GET /api/stats",
    ],
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// =====================================
// PRODUCTS
// =====================================

app.get("/api/products", (req, res) => {
  let result = [...products];

  const { search, category, brand, sort } = req.query;

  if (typeof search === "string") {
    const query = search.toLowerCase().trim();

    result = result.filter((product) =>
      `${product.name} ${product.brand} ${product.category}`
        .toLowerCase()
        .includes(query)
    );
  }

  if (typeof category === "string") {
    result = result.filter(
      (product) =>
        product.category.toLowerCase() ===
        category.toLowerCase()
    );
  }

  if (typeof brand === "string") {
    result = result.filter(
      (product) =>
        product.brand.toLowerCase() ===
        brand.toLowerCase()
    );
  }

  if (sort === "price-asc") {
    result.sort((a, b) => a.price - b.price);
  }

  if (sort === "price-desc") {
    result.sort((a, b) => b.price - a.price);
  }

  if (sort === "rating") {
    result.sort((a, b) => b.rating - a.rating);
  }

  res.json({
    success: true,
    count: result.length,
    products: result,
  });
});

app.get("/api/products/:id", (req, res) => {
  const product = findProduct(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  res.json({
    success: true,
    product,
  });
});

// =====================================
// DEMO ORDERS
// =====================================

app.post("/api/orders", (req, res) => {
  const { customer, items } = req.body || {};

  if (
    !customer ||
    !validText(customer.name) ||
    !validEmail(customer.email) ||
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 20
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid order information",
    });
  }

  const orderItems = [];

  for (const item of items) {
    const product = findProduct(item.id);
    const quantity = Number(item.quantity);
    const size = Number(item.size);

    if (
      !product ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10 ||
      !allowedSizes.includes(size)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product, size or quantity",
      });
    }

    orderItems.push({
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      size,
      quantity,
    });
  }

  // Check stock, including repeated product IDs
  const requested = new Map();

  for (const item of orderItems) {
    requested.set(
      item.id,
      (requested.get(item.id) || 0) + item.quantity
    );
  }

  for (const [id, quantity] of requested) {
    const product = findProduct(id);

    if (quantity > product.stock) {
      return res.status(409).json({
        success: false,
        message: `Not enough stock for ${product.name}`,
      });
    }
  }

  const subtotal = money(
    orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
  );

  const shipping = subtotal >= 150 ? 0 : 12;
  const total = money(subtotal + shipping);

  const orderId = `SH-${crypto.randomUUID()}`;

  // A random secret protects access to this demo receipt.
  const receiptToken = crypto.randomBytes(32).toString("hex");

  const order = {
    id: orderId,
    date: new Date().toISOString(),
    customer: {
      name: customer.name.trim(),
      email: customer.email.trim(),
    },
    items: orderItems,
    subtotal,
    shipping,
    total,
    currency: "USD",
    status: "DEMO_CONFIRMED",
    paymentProcessed: false,
    receiptToken,
  };

  // Reduce demo stock
  for (const [id, quantity] of requested) {
    findProduct(id).stock -= quantity;
  }

  orders.set(orderId, order);

  const { receiptToken: secret, ...publicOrder } = order;

  res.status(201).json({
    success: true,
    message: "Demo order created successfully",
    order: publicOrder,
    receiptToken: secret,
  });
});

// =====================================
// RECEIPTS
// =====================================

function authorizeOrder(req, res, next) {
  const order = orders.get(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  const token = req.get("x-receipt-token");

  if (
    typeof token !== "string" ||
    token.length !== order.receiptToken.length ||
    !crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(order.receiptToken)
    )
  ) {
    return res.status(403).json({
      success: false,
      message: "Invalid receipt access token",
    });
  }

  req.order = order;
  next();
}

app.get("/api/orders/:id", authorizeOrder, (req, res) => {
  const { receiptToken, ...receipt } = req.order;

  res.json({
    success: true,
    receipt: {
      ...receipt,
      notice: "DEMO RECEIPT - NOT PROOF OF PAYMENT",
    },
  });
});

// =====================================
// CANCEL DEMO ORDER
// =====================================

app.patch(
  "/api/orders/:id/cancel",
  authorizeOrder,
  (req, res) => {
    const order = req.order;

    if (order.status === "DEMO_CANCELLED") {
      return res.status(409).json({
        success: false,
        message: "Order already cancelled",
      });
    }

    const quantities = new Map();

    for (const item of order.items) {
      quantities.set(
        item.id,
        (quantities.get(item.id) || 0) + item.quantity
      );
    }

    for (const [id, quantity] of quantities) {
      findProduct(id).stock += quantity;
    }

    order.status = "DEMO_CANCELLED";

    res.json({
      success: true,
      message: "Demo order cancelled",
      orderId: order.id,
      status: order.status,
    });
  }
);

// =====================================
// PUBLIC DEMO STATISTICS
// =====================================

app.get("/api/stats", (req, res) => {
  const allOrders = [...orders.values()];
  const activeOrders = allOrders.filter(
    (order) => order.status === "DEMO_CONFIRMED"
  );

  res.json({
    success: true,
    stats: {
      totalProducts: products.length,
      totalDemoOrders: allOrders.length,
      activeDemoOrders: activeOrders.length,
      cancelledDemoOrders:
        allOrders.length - activeOrders.length,
      demoOrderValue: money(
        activeOrders.reduce(
          (sum, order) => sum + order.total,
          0
        )
      ),
      currency: "USD",
      realRevenue: 0,
    },
  });
});

// =====================================
// ERROR HANDLING
// =====================================

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request",
    });
  }

  console.error(err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// =====================================
// START SERVER
// =====================================

app.listen(PORT, () => {
  console.log("");
  console.log("==================================");
  console.log("SHOES BACKEND v2.0");
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
  console.log("Mode: DEMO");
  console.log("==================================");
});
