const crypto = require("node:crypto");
const { pool, productRow, orderRow } = require("./db");
const { allowedSizes } = require("./data");
const { generateReceipt } = require("./receipt");
const { sendOrderConfirmation } = require("./email");
const { verifyIdToken } = require("./firebaseAdmin");

// ==========================================
// HELPERS
// ==========================================

const money = (n) =>
  Math.round((n + Number.EPSILON) * 100) / 100;

const validText = (v, max = 150) =>
  typeof v === "string" &&
  v.trim().length > 0 &&
  v.trim().length <= max;

const validEmail = (v) =>
  typeof v === "string" &&
  v.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const hash = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ==========================================
// API INFORMATION
// ==========================================

const home = (req, res) =>
  res.json({
    success: true,
    project: "SHOES",
    version: "3.1.0",
    message: "SHOES Backend API is running",
  });

// Verified identity of the caller (from the Firebase ID token).
const getMe = (req, res) => {
  const u = req.firebaseUser;
  res.json({
    success: true,
    user: {
      uid: u.uid,
      email: u.email || null,
      emailVerified: Boolean(u.email_verified),
      name: u.name || null,
      provider: u.firebase?.sign_in_provider || null,
    },
  });
};

const index = (req, res) =>
  res.json({
    success: true,
    project: "SHOES API",
    endpoints: [
      "GET /api/health",
      "GET /api/products",
      "GET /api/products/:id",
      "POST /api/orders",
      "GET /api/orders/:id",
      "GET /api/orders/:id/receipt",
      "PATCH /api/orders/:id/cancel",
      "GET /api/me",
      "GET /api/me/orders",
      "GET /api/stats",
    ],
  });

// ==========================================
// HEALTH
// ==========================================

const health = wrap(async (req, res) => {
  let database = "ok";
  try {
    await pool.query("SELECT 1");
  } catch (error) {
    database = error.code === "DB_NOT_CONFIGURED" ? "not_configured" : "unreachable";
  }

  res.status(database === "ok" ? 200 : 503).json({
    success: database === "ok",
    status: database === "ok" ? "healthy" : "degraded",
    database,
    auth: require("./firebaseAdmin").isConfigured() ? "configured" : "not_configured",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// PRODUCTS
// ==========================================

const getProducts = wrap(async (req, res) => {
  let products = (
    await pool.query("SELECT * FROM shoes_products")
  ).rows.map(productRow);

  const { search, category, brand, sort } = req.query;

  if (typeof search === "string") {
    products = products.filter((p) =>
      `${p.name} ${p.brand} ${p.category}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    );
  }

  if (typeof category === "string") {
    products = products.filter(
      (p) =>
        p.category.toLowerCase() ===
        category.toLowerCase()
    );
  }

  if (typeof brand === "string") {
    products = products.filter(
      (p) =>
        p.brand.toLowerCase() ===
        brand.toLowerCase()
    );
  }

  if (sort === "price-asc") {
    products.sort((a, b) => a.price - b.price);
  }

  if (sort === "price-desc") {
    products.sort((a, b) => b.price - a.price);
  }

  if (sort === "rating") {
    products.sort((a, b) => b.rating - a.rating);
  }

  res.json({
    success: true,
    count: products.length,
    products,
  });
});

const getProduct = wrap(async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM shoes_products WHERE id=$1",
    [Number(req.params.id) || 0]
  );

  if (!rows.length) {
    return fail(res, 404, "Product not found");
  }

  res.json({
    success: true,
    product: productRow(rows[0]),
  });
});

// ==========================================
// OPTIONAL FIREBASE AUTH
// ==========================================

async function optionalFirebaseUser(req, res) {
  const authorization = req.get("Authorization");

  // Guest checkout is allowed.
  if (!authorization) {
    return { user: null };
  }

  const match = /^Bearer (\S+)$/i.exec(authorization);

  if (!match) {
    fail(res, 401, "Invalid authorization header");
    return null;
  }

  try {
    const user = await verifyIdToken(match[1]);

    return { user };
  } catch (error) {
    if (error.code === "AUTH_NOT_CONFIGURED") {
      fail(res, 503, "Sign-in is temporarily unavailable");
    } else {
      fail(res, 401, "Invalid Firebase ID token");
    }
    return null;
  }
}

// ==========================================
// CREATE DEMO ORDER
// ==========================================

const createOrder = wrap(async (req, res) => {
  const authResult = await optionalFirebaseUser(req, res);

  if (!authResult) return;

  const firebaseUser = authResult.user;
  const { customer, items } = req.body || {};

  if (
    !customer ||
    !validText(customer.name) ||
    !validEmail(customer.email) ||
    !Array.isArray(items) ||
    !items.length ||
    items.length > 20
  ) {
    return fail(res, 400, "Invalid order information");
  }

  // Prevent a signed-in user from creating an
  // account-linked order using another email.
  if (
    firebaseUser &&
    (
      !firebaseUser.email ||
      firebaseUser.email.toLowerCase() !==
        customer.email.trim().toLowerCase()
    )
  ) {
    return fail(
      res,
      403,
      "Order email must match your Firebase account"
    );
  }

  const quantities = new Map();

  for (const item of items) {
    const id = Number(item?.id);
    const quantity = Number(item?.quantity);
    const size = Number(item?.size);

    if (
      !Number.isInteger(id) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10 ||
      !allowedSizes.includes(size)
    ) {
      return fail(
        res,
        400,
        "Invalid product, size or quantity"
      );
    }

    quantities.set(
      id,
      (quantities.get(id) || 0) + quantity
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ids = [...quantities.keys()].sort(
      (a, b) => a - b
    );

    const { rows } = await client.query(
      `SELECT *
       FROM shoes_products
       WHERE id = ANY($1::int[])
       ORDER BY id
       FOR UPDATE`,
      [ids]
    );

    const byId = new Map(
      rows.map((p) => [p.id, productRow(p)])
    );

    const orderItems = [];

    for (const item of items) {
      const product = byId.get(Number(item.id));

      if (!product) {
        await client.query("ROLLBACK");

        return fail(
          res,
          400,
          "Invalid product, size or quantity"
        );
      }

      orderItems.push({
        id: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        size: Number(item.size),
        quantity: Number(item.quantity),
      });
    }

    // Check inventory.
    for (const [id, quantity] of quantities) {
      const product = byId.get(id);

      if (!product || quantity > product.stock) {
        await client.query("ROLLBACK");

        return fail(
          res,
          409,
          product
            ? `Not enough stock for ${product.name}`
            : "Product not found"
        );
      }
    }

    // Calculate prices on the server.
    const subtotal = money(
      orderItems.reduce(
        (sum, item) =>
          sum + item.price * item.quantity,
        0
      )
    );

    const shipping = subtotal >= 150 ? 0 : 12;
    const total = money(subtotal + shipping);

    const id = `SH-${crypto.randomUUID()}`;

    const receiptToken = crypto
      .randomBytes(32)
      .toString("hex");

    // Update inventory.
    for (const [productId, quantity] of quantities) {
      await client.query(
        `UPDATE shoes_products
         SET stock = stock - $1
         WHERE id = $2`,
        [quantity, productId]
      );
    }

    // Save order with Firebase UID.
    const { rows: created } = await client.query(
      `INSERT INTO shoes_orders
       (
         id,
         firebase_uid,
         customer_name,
         customer_email,
         items,
         subtotal,
         shipping,
         total,
         status,
         receipt_token_hash
       )
       VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10
       )
       RETURNING *`,
      [
        id,
        firebaseUser?.uid || null,
        customer.name.trim(),
        customer.email.trim(),
        JSON.stringify(orderItems),
        subtotal,
        shipping,
        total,
        "DEMO_CONFIRMED",
        hash(receiptToken),
      ]
    );

    await client.query("COMMIT");

    const savedOrder = orderRow(created[0]);
    let emailStatus = "not_sent";

    // ======================================
    // RESEND EMAIL CONFIRMATION
    // ======================================

    try {
      console.log(
        "SHOES: Sending confirmation for order",
        savedOrder.id
      );

      const result = await sendOrderConfirmation({
        ...savedOrder,
        customerName: customer.name.trim(),
        customerEmail: customer.email.trim(),
        items: orderItems,
      });

      if (result?.sent) {
        emailStatus = "sent";

        console.log(
          "SHOES: Email accepted by Resend",
          result.id
        );
      } else {
        console.warn(
          "SHOES: Email not sent",
          result?.reason || "unknown"
        );
      }
    } catch (emailError) {
      console.error(
        "SHOES: Email sending failed:",
        emailError.message
      );
    }

    return res.status(201).json({
      success: true,
      message: "Demo order created successfully",
      order: savedOrder,
      receiptToken,
      emailStatus,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
});

// ==========================================
// RECEIPT ACCESS
// ==========================================

async function authorizedOrder(
  req,
  res,
  client,
  lock = false
) {
  const token = req.get("x-receipt-token");

  const { rows } = await client.query(
    `SELECT *
     FROM shoes_orders
     WHERE id = $1
     ${lock ? "FOR UPDATE" : ""}`,
    [req.params.id]
  );

  if (!rows.length) {
    fail(res, 404, "Order not found");
    return null;
  }

  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    fail(res, 403, "Invalid receipt access token");
    return null;
  }

  const expected = Buffer.from(hash(token), "hex");

  const actual = Buffer.from(
    rows[0].receipt_token_hash,
    "hex"
  );

  if (
    expected.length !== actual.length ||
    !crypto.timingSafeEqual(expected, actual)
  ) {
    fail(res, 403, "Invalid receipt access token");
    return null;
  }

  return rows[0];
}

// ==========================================
// GET ORDER
// ==========================================

const getOrder = wrap(async (req, res) => {
  const order = await authorizedOrder(
    req,
    res,
    pool
  );

  if (!order) return;

  res.json({
    success: true,
    receipt: {
      ...orderRow(order),
      notice:
        "DEMO RECEIPT - NOT PROOF OF PAYMENT",
    },
  });
});

// ==========================================
// CANCEL DEMO ORDER
// ==========================================

const cancelOrder = wrap(async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const order = await authorizedOrder(
      req,
      res,
      client,
      true
    );

    if (!order) {
      await client.query("ROLLBACK");
      return;
    }

    if (order.status === "DEMO_CANCELLED") {
      await client.query("ROLLBACK");

      return fail(
        res,
        409,
        "Order already cancelled"
      );
    }

    const quantities = new Map();

    for (const item of order.items) {
      quantities.set(
        item.id,
        (quantities.get(item.id) || 0) +
          item.quantity
      );
    }

    for (const [id, quantity] of quantities) {
      await client.query(
        `UPDATE shoes_products
         SET stock = stock + $1
         WHERE id = $2`,
        [quantity, id]
      );
    }

    await client.query(
      `UPDATE shoes_orders
       SET status = 'DEMO_CANCELLED'
       WHERE id = $1`,
      [order.id]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Demo order cancelled",
      orderId: order.id,
      status: "DEMO_CANCELLED",
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
});

// ==========================================
// STORE STATISTICS
// ==========================================

const getStats = wrap(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (
        WHERE status = 'DEMO_CONFIRMED'
      )::int AS active,
      COALESCE(
        SUM(total) FILTER (
          WHERE status = 'DEMO_CONFIRMED'
        ),
        0
      ) AS value
    FROM shoes_orders
  `);

  const count = Number(
    (
      await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM shoes_products`
      )
    ).rows[0].count
  );

  const stats = rows[0];

  res.json({
    success: true,
    stats: {
      totalProducts: count,
      totalDemoOrders: stats.total,
      activeDemoOrders: stats.active,
      cancelledDemoOrders:
        stats.total - stats.active,
      demoOrderValue: Number(stats.value),
      currency: "USD",
      realRevenue: 0,
    },
  });
});

// ==========================================
// DOWNLOAD PDF RECEIPT
// ==========================================

const downloadReceipt = wrap(async (req, res) => {
  const order = await authorizedOrder(
    req,
    res,
    pool
  );

  if (!order) return;

  generateReceipt(orderRow(order), res);
});

// ==========================================
// MY ORDERS - FIREBASE AUTH
// ==========================================

const getMyOrders = wrap(async (req, res) => {
  const uid = req.firebaseUser.uid;

  const { rows } = await pool.query(
    `SELECT *
     FROM shoes_orders
     WHERE firebase_uid = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [uid]
  );

  res.json({
    success: true,
    count: rows.length,
    orders: rows.map(orderRow),
  });
});

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  home,
  index,
  health,
  getProducts,
  getProduct,
  createOrder,
  getOrder,
  cancelOrder,
  getStats,
  downloadReceipt,
  getMyOrders,
  getMe,
};
