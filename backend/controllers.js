const crypto = require("node:crypto");
const { pool, productRow, orderRow } = require("./db");
const { allowedSizes } = require("./data");
const { generateReceipt } = require("./receipt");

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

const hash = (t) =>
  crypto.createHash("sha256").update(t).digest("hex");

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const home = (req, res) =>
  res.json({
    success: true,
    project: "SHOES",
    version: "3.0.0",
    message: "SHOES Backend API is running",
  });

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
      "PATCH /api/orders/:id/cancel",
      "GET /api/stats",
    ],
  });

const health = wrap(async (req, res) => {
  await pool.query("SELECT 1");

  res.json({
    success: true,
    status: "healthy",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

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
      (p) => p.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (typeof brand === "string") {
    products = products.filter(
      (p) => p.brand.toLowerCase() === brand.toLowerCase()
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

const createOrder = wrap(async (req, res) => {
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
      return fail(res, 400, "Invalid product, size or quantity");
    }

    quantities.set(id, (quantities.get(id) || 0) + quantity);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ids = [...quantities.keys()].sort((a, b) => a - b);

    const { rows } = await client.query(
      `SELECT * FROM shoes_products
       WHERE id=ANY($1::int[])
       ORDER BY id FOR UPDATE`,
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
        return fail(res, 400, "Invalid product, size or quantity");
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

    for (const [id, quantity] of quantities) {
      const p = byId.get(id);

      if (quantity > p.stock) {
        await client.query("ROLLBACK");
        return fail(
          res,
          409,
          `Not enough stock for ${p.name}`
        );
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

    const id = `SH-${crypto.randomUUID()}`;
    const receiptToken = crypto.randomBytes(32).toString("hex");

    for (const [productId, quantity] of quantities) {
      await client.query(
        `UPDATE shoes_products
         SET stock=stock-$1 WHERE id=$2`,
        [quantity, productId]
      );
    }

    const { rows: created } = await client.query(
      `INSERT INTO shoes_orders
       (id,customer_name,customer_email,items,
        subtotal,shipping,total,status,receipt_token_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        id,
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

    res.status(201).json({
      success: true,
      message: "Demo order created successfully",
      order: orderRow(created[0]),
      receiptToken,
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
});

async function authorizedOrder(req, res, client, lock = false) {
  const token = req.get("x-receipt-token");

  const { rows } = await client.query(
    `SELECT * FROM shoes_orders
     WHERE id=$1${lock ? " FOR UPDATE" : ""}`,
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

  const a = Buffer.from(hash(token), "hex");
  const b = Buffer.from(rows[0].receipt_token_hash, "hex");

  if (
    a.length !== b.length ||
    !crypto.timingSafeEqual(a, b)
  ) {
    fail(res, 403, "Invalid receipt access token");
    return null;
  }

  return rows[0];
}

const getOrder = wrap(async (req, res) => {
  const o = await authorizedOrder(req, res, pool);
  if (!o) return;

  res.json({
    success: true,
    receipt: {
      ...orderRow(o),
      notice: "DEMO RECEIPT - NOT PROOF OF PAYMENT",
    },
  });
});

const cancelOrder = wrap(async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const o = await authorizedOrder(req, res, client, true);

    if (!o) {
      await client.query("ROLLBACK");
      return;
    }

    if (o.status === "DEMO_CANCELLED") {
      await client.query("ROLLBACK");
      return fail(res, 409, "Order already cancelled");
    }

    const quantities = new Map();

    for (const item of o.items) {
      quantities.set(
        item.id,
        (quantities.get(item.id) || 0) + item.quantity
      );
    }

    for (const [id, quantity] of quantities) {
      await client.query(
        `UPDATE shoes_products
         SET stock=stock+$1 WHERE id=$2`,
        [quantity, id]
      );
    }

    await client.query(
      "UPDATE shoes_orders SET status='DEMO_CANCELLED' WHERE id=$1",
      [o.id]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Demo order cancelled",
      orderId: o.id,
      status: "DEMO_CANCELLED",
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
});

const getStats = wrap(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (
        WHERE status='DEMO_CONFIRMED'
      )::int AS active,
      COALESCE(
        SUM(total) FILTER (
          WHERE status='DEMO_CONFIRMED'
        ), 0
      ) AS value
    FROM shoes_orders
  `);

  const count = Number(
    (
      await pool.query(
        "SELECT COUNT(*)::int AS count FROM shoes_products"
      )
    ).rows[0].count
  );

  const s = rows[0];

  res.json({
    success: true,
    stats: {
      totalProducts: count,
      totalDemoOrders: s.total,
      activeDemoOrders: s.active,
      cancelledDemoOrders: s.total - s.active,
      demoOrderValue: Number(s.value),
      currency: "USD",
      realRevenue: 0,
    },
  });
});


const downloadReceipt = wrap(async (req, res) => {
  const order = await authorizedOrder(req, res, pool);

  if (!order) return;

  const receipt = orderRow(order);

  generateReceipt(receipt, res);
});


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
};
