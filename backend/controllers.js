"use strict";
const crypto = require("node:crypto");
const inventory = require("./commerce/inventory");
const { CommerceError } = require("./commerce/common");
const customizer = require("./lib/customizer");
const tracking = require("./tracking/service");
const { pool, productRow, orderRow, parseItems, CANCELLABLE_STATUSES } = require("./db");
const { allowedSizes } = require("./data");
const { generateReceipt } = require("./receipt");
const email = require("./email");
const pricing = require("./lib/pricing");
const auth = require("./lib/auth");
const stripe = require("./lib/stripe");
const log = require("./lib/logger");
const { pendingMigrations } = require("./lib/migrate");

// ==========================================
// HELPERS
// ==========================================

const fail = (res, status, message, extra) => res.status(status).json({ success: false, message, ...(extra || {}) });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(err => {
  if (err instanceof CommerceError) return fail(res, err.status, err.message);
  next(err);
});
const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");

const str = (v) => (typeof v === "string" ? v.trim() : "");
const validText = (v, min = 1, max = 150) => typeof v === "string" && v.trim().length >= min && v.trim().length <= max;
const validEmail = (v) => typeof v === "string" && v.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const validPhone = (v) => typeof v === "string" && /^\+?[0-9][0-9 ()-]{5,19}$/.test(v.trim());
const validPostal = (v) => typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/.test(v.trim());
const ORDER_ID_RE = /^SH-[0-9a-f-]{36}$/i;

function frontendOrigin(req) {
  const configured = (process.env.FRONTEND_URL || "").split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req.get("origin");
  if (origin && configured.includes(origin)) return origin;
  if (origin && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) && process.env.NODE_ENV !== "production") return origin;
  return configured[0] || "http://localhost:5173";
}

function ownsOrder(user, order) {
  if (!user || !order) return false;
  if (order.user_id != null) return String(order.user_id) === String(user.id);
  return Boolean(order.firebase_uid && user.firebase_uid && order.firebase_uid === user.firebase_uid);
}

function receiptTokenMatches(req, order) {
  const token = req.get("x-receipt-token");
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return false;
  const expected = Buffer.from(hash(token), "hex");
  const actual = Buffer.from(order.receipt_token_hash || "", "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// Owner (signed in) or holder of the order's receipt token.
async function authorizedOrder(req, res, db, lock = false) {
  const id = String(req.params.id || "");
  if (!ORDER_ID_RE.test(id)) {
    fail(res, 404, "Order not found");
    return null;
  }
  const { rows } = await db.query(`SELECT * FROM shoes_orders WHERE id = $1 ${lock ? "FOR UPDATE" : ""}`, [id]);
  const order = rows[0];
  if (!order) {
    fail(res, 404, "Order not found");
    return null;
  }
  if (ownsOrder(req.user, order) || receiptTokenMatches(req, order)) return order;
  // Same response for "exists but not yours" and "bad token": no leak.
  fail(res, 403, "You do not have access to this order");
  return null;
}

// ==========================================
// INFO / HEALTH / CONFIG
// ==========================================

const home = (req, res) => res.json({ success: true, project: "SHOES", version: "4.0.0", message: "SHOES Backend API is running" });

const index = (req, res) =>
  res.json({
    success: true,
    project: "SHOES API",
    endpoints: [
      "GET /api/health",
      "GET /api/config",
      "GET /api/products",
      "GET /api/products/:id",
      "GET /api/products/:id/related",
      "GET /api/products/:id/reviews",
      "POST /api/products/:id/reviews (auth)",
      "POST /api/cart/quote",
      "POST /api/orders",
      "GET /api/orders/:id",
      "GET /api/orders/:id/receipt",
      "PATCH /api/orders/:id/cancel",
      "GET /api/me (auth)",
      "GET /api/me/orders (auth)",
      "GET|PUT /api/me/favorites (auth)",
      "POST /api/me/link-identity (auth)",
      "POST /api/me/orders/claim/request (auth)",
      "POST /api/me/orders/claim/confirm (auth)",
      "POST /api/payments/stripe/webhook",
      "POST /api/newsletter",
      "GET /api/stats",
    ],
  });

const health = wrap(async (req, res) => {
  await pool.query("SELECT 1");
  let pending = null;
  try {
    pending = (await pendingMigrations(pool)).length;
  } catch {
    pending = null;
  }
  res.json({
    success: true,
    status: pending ? "degraded" : "healthy",
    database: "ok",
    pendingMigrations: pending,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

const config = (req, res) => {
  const s = stripe.stripeStatus();
  res.json({
    success: true,
    features: {
      firebaseAuth: auth.firebaseEnabled(),
      clerkAuth: auth.clerkEnabled(),
      stripeCheckout: s.enabled,
      stripeMode: s.enabled ? s.mode : null,
      demoCheckout: true,
      orderClaims: email.emailEnabled(),
    },
    pricing: {
      currency: "USD",
      promoCodes: pricing.PROMO_CODES,
      freeShippingThresholdCents: pricing.FREE_SHIPPING_THRESHOLD_CENTS,
      shippingFeeCents: pricing.SHIPPING_FEE_CENTS,
      freeShippingBasis: "subtotal_before_discount",
    },
  });
};

// ==========================================
// PRODUCTS
// ==========================================

const PRODUCT_SELECT = `
  SELECT p.*,
         COALESCE(r.cnt, 0) AS review_count,
         r.avg AS review_avg,
         COALESCE(s.units, 0) AS units_sold
  FROM shoes_products p
  LEFT JOIN (SELECT product_id, COUNT(*) AS cnt, ROUND(AVG(rating)::numeric, 1) AS avg
             FROM shoes_reviews GROUP BY product_id) r ON r.product_id = p.id
  LEFT JOIN (SELECT (item->>'id')::int AS product_id, SUM((item->>'quantity')::int) AS units
             FROM shoes_orders o, jsonb_array_elements(o.items) item
             WHERE o.status IN ('DEMO_CONFIRMED', 'PAID')
             GROUP BY 1) s ON s.product_id = p.id`;

const getProducts = wrap(async (req, res) => {
  let products = (await pool.query(PRODUCT_SELECT)).rows.map(productRow);
  const search = str(req.query.search).toLowerCase().slice(0, 100);
  const category = str(req.query.category).toLowerCase();
  const brand = str(req.query.brand).toLowerCase();
  const gender = str(req.query.gender).toLowerCase();
  const { sort, inStock } = req.query;
  const minPrice = Number(req.query.minPrice);
  const maxPrice = Number(req.query.maxPrice);

  if (search) {
    products = products.filter((p) =>
      `${p.name} ${p.brand} ${p.category} ${p.color} ${p.description || ""}`.toLowerCase().includes(search)
    );
  }
  if (category && category !== "all") products = products.filter((p) => p.category.toLowerCase() === category);
  if (brand && brand !== "all") products = products.filter((p) => p.brand.toLowerCase() === brand);
  if (gender && gender !== "all") {
    const g = gender.toLowerCase();
    products = products.filter((p) => String(p.gender || "").toLowerCase() === g);
  }
  if (Number.isFinite(minPrice)) products = products.filter((p) => p.price >= minPrice);
  if (Number.isFinite(maxPrice) && maxPrice > 0) products = products.filter((p) => p.price <= maxPrice);
  if (inStock === "true") products = products.filter((p) => p.stock > 0);

  const sorters = {
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    newest: (a, b) => b.id - a.id,
    "best-selling": (a, b) => (b.unitsSold || 0) - (a.unitsSold || 0) || a.id - b.id,
  };
  if (sorters[sort]) products.sort(sorters[sort]);
  else products.sort((a, b) => a.id - b.id);

  res.json({ success: true, count: products.length, products });
});

function productId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 && id < 2 ** 31 ? id : null;
}

const getProduct = wrap(async (req, res) => {
  const id = productId(req);
  if (!id) return fail(res, 404, "Product not found");
  const { rows } = await pool.query(`${PRODUCT_SELECT} WHERE p.id = $1`, [id]);
  if (!rows.length) return fail(res, 404, "Product not found");
  res.json({ success: true, product: productRow(rows[0]) });
});

const getRelated = wrap(async (req, res) => {
  const id = productId(req);
  if (!id) return fail(res, 404, "Product not found");
  const { rows } = await pool.query("SELECT * FROM shoes_products WHERE id = $1", [id]);
  if (!rows.length) return fail(res, 404, "Product not found");
  const base = rows[0];
  const { rows: rel } = await pool.query(
    `SELECT * FROM shoes_products WHERE id <> $1
     ORDER BY (category = $2)::int * 2 + (brand = $3)::int DESC, id
     LIMIT 4`,
    [id, base.category, base.brand]
  );
  res.json({ success: true, products: rel.map(productRow) });
});

// ==========================================
// REVIEWS (real, user-submitted)
// ==========================================

function reviewRow(r) {
  return {
    id: String(r.id),
    rating: r.rating,
    title: r.title,
    body: r.body,
    author: r.author_name,
    verifiedPurchase: r.verified_purchase,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

const getReviews = wrap(async (req, res) => {
  const id = productId(req);
  if (!id) return fail(res, 404, "Product not found");
  const { rows } = await pool.query(
    "SELECT * FROM shoes_reviews WHERE product_id = $1 ORDER BY created_at DESC LIMIT 50",
    [id]
  );
  const avg = rows.length ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10 : null;
  res.json({ success: true, count: rows.length, average: avg, reviews: rows.map(reviewRow) });
});

const createReview = wrap(async (req, res) => {
  const id = productId(req);
  if (!id) return fail(res, 404, "Product not found");
  const { rating, title, body } = req.body || {};
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) return fail(res, 400, "Rating must be a whole number from 1 to 5");
  if (!validText(body, 10, 1000)) return fail(res, 400, "Review must be 10–1000 characters");
  if (title != null && title !== "" && !validText(title, 1, 100)) return fail(res, 400, "Title must be up to 100 characters");
  const exists = await pool.query("SELECT 1 FROM shoes_products WHERE id = $1", [id]);
  if (!exists.rows.length) return fail(res, 404, "Product not found");

  const purchased = await pool.query(
    `SELECT 1 FROM shoes_orders o, jsonb_array_elements(o.items) item
     WHERE (o.user_id = $1 OR (o.user_id IS NULL AND o.firebase_uid = $2))
       AND o.status IN ('DEMO_CONFIRMED','PAID') AND (item->>'id')::int = $3 LIMIT 1`,
    [req.user.id, req.user.firebase_uid, id]
  );
  const author = (req.user.display_name || (req.user.email || "SHOES member").split("@")[0]).slice(0, 60);
  const { rows } = await pool.query(
    `INSERT INTO shoes_reviews (product_id, user_id, rating, title, body, author_name, verified_purchase)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (product_id, user_id) DO UPDATE
       SET rating = EXCLUDED.rating, title = EXCLUDED.title, body = EXCLUDED.body,
           verified_purchase = EXCLUDED.verified_purchase, updated_at = NOW()
     RETURNING *`,
    [id, req.user.id, r, str(title) || null, str(body), author, purchased.rows.length > 0]
  );
  res.status(201).json({ success: true, review: reviewRow(rows[0]) });
});

// ==========================================
// PRICING (server-side, from DB prices)
// ==========================================

class OrderInputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function parseCartItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    throw new OrderInputError("Your cart must contain between 1 and 20 lines");
  }
  return items.map((item) => {
    const id = Number(item?.id);
    const quantity = Number(item?.quantity);
    const size = Number(item?.size);
    const color = item?.color == null ? "" : String(item.color).trim();
    let designId = null;
    if (item?.designId != null && item.designId !== "") {
      try {
        designId = customizer.parseDesignId(item.designId);
      } catch {
        throw new OrderInputError("Invalid custom design");
      }
    }
    if (
      !Number.isInteger(id) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > pricing.MAX_QUANTITY_PER_LINE ||
      (!allowedSizes.includes(size) && !(size >= 20 && size <= 55 && Number.isInteger(size * 2))) ||
      color.length > 40
    ) {
      throw new OrderInputError("Invalid product, size or quantity");
    }
    return { id, quantity, size, color, designId };
  });
}

// Prices a cart from DB rows. Never uses a client-supplied price.
async function priceCart(db, rawItems, rawPromo, { lock = false, reservationKey = null, userId = null } = {}) {
  const items = parseCartItems(rawItems);
  if (!pricing.isValidPromoCode(rawPromo ?? "")) throw new OrderInputError("Invalid promo code");
  const designIds = [...new Set(items.map((i) => i.designId).filter(Boolean))];
  if (designIds.length && !userId) throw new OrderInputError("Sign in to purchase a saved custom design");
  let designById = new Map();
  if (designIds.length) {
    const { rows: designs } = await db.query(
      `SELECT * FROM shoes_custom_designs WHERE id = ANY($1::uuid[]) AND user_id = $2`,
      [designIds, userId]
    );
    designById = new Map(designs.map((d) => [d.id, d]));
    for (const id of designIds) {
      if (!designById.has(id)) throw new OrderInputError("Custom design not found");
    }
  }
  const ids = [...new Set(items.map((i) => i.id))].sort((a, b) => a - b);
  const { rows } = await db.query(
    `SELECT * FROM shoes_products WHERE id = ANY($1::int[]) ORDER BY id ${lock ? "FOR UPDATE" : ""}`,
    [ids]
  );
  const byId = new Map(rows.map((p) => [p.id, p]));
  const qtyById = new Map();
  const lines = items.map((i) => {
    const p = byId.get(i.id);
    if (!p) throw new OrderInputError("A product in your cart is no longer available");
    const design = i.designId ? designById.get(i.designId) : null;
    if (design && Number(design.product_id) !== p.id) throw new OrderInputError("Custom design does not match this product");
  const displayColor = design
      ? `Custom · ${design.name}`
      : p.inventory_managed
        ? i.color
        : p.color || i.color || null;
    if (
      !design &&
      !p.inventory_managed &&
      i.color &&
      p.color &&
      i.color.toLowerCase() !== String(p.color).toLowerCase()
    ) {
      throw new OrderInputError(`${p.name} is not available in ${i.color}`);
    }
    qtyById.set(i.id, (qtyById.get(i.id) || 0) + i.quantity);
    const stockColor = design
      ? String(p.color || i.color || "")
      : p.inventory_managed
        ? i.color
        : p.color || i.color || null;
    const surcharge = design ? Number(design.surcharge_cents) || 0 : 0;
    return {
      id: p.id,
      name: design ? `${p.name} · Custom` : p.name,
      brand: p.brand,
      image: p.image,
      size: i.size,
      color: displayColor,
      stockColor,
      quantity: i.quantity,
      unitPriceCents: pricing.toCents(p.price) + surcharge,
      designId: design?.id || null,
      designName: design?.name || null,
      customization: design?.design || null,
    };
  });
  for (const [id, qty] of qtyById) {
    const p = byId.get(id);
    if (qty > p.stock) throw new OrderInputError(p.stock === 0 ? `${p.name} is out of stock` : `Only ${p.stock} left of ${p.name}`, 409);
  }
  if (!lock) {
    await inventory.validate(
      db,
      inventory.normalize(lines.map((l) => ({ ...l, color: l.stockColor || l.color }))),
      rows,
      reservationKey
    );
  }
  const totals = pricing.calculateTotals(lines, rawPromo);
  return { lines, totals, qtyById };
}

function totalsJson(t) {
  return {
    itemCount: t.itemCount,
    subtotalCents: t.subtotalCents,
    discountCents: t.discountCents,
    shippingCents: t.shippingCents,
    totalCents: t.totalCents,
    promoCode: t.promoCode || null,
    promoPercent: t.promoPercent,
    freeShippingRemainingCents: t.freeShippingRemainingCents,
  };
}

const quoteCart = wrap(async (req, res) => {
  try {
    const { lines, totals } = await priceCart(pool, req.body?.items, req.body?.promoCode ?? "", { userId: req.user?.id });
    res.json({
      success: true,
      lines: lines.map((l) => ({ id: l.id, size: l.size, color: l.color, quantity: l.quantity, unitPriceCents: l.unitPriceCents })),
      totals: totalsJson(totals),
    });
  } catch (err) {
    if (err instanceof OrderInputError) return fail(res, err.status, err.message);
    throw err;
  }
});

// ==========================================
// CREATE ORDER (demo checkout or Stripe test checkout)
// ==========================================

function parseCustomer(body) {
  const c = body?.customer || {};
  const a = c.shippingAddress || {};
  const errors = {};
  if (!validText(c.name, 2, 120)) errors.name = "Enter your full name";
  if (!validEmail(c.email)) errors.email = "Enter a valid email address";
  if (!validPhone(c.phone || "")) errors.phone = "Enter a valid phone number";
  if (!validText(a.street, 3, 200)) errors.street = "Enter your street address";
  if (a.apartment && !validText(a.apartment, 1, 100)) errors.apartment = "Apartment is too long";
  if (!validText(a.city, 2, 100)) errors.city = "Enter your city";
  if (!validText(a.country, 2, 60)) errors.country = "Select your country";
  if (!validPostal(a.postalCode || "")) errors.postalCode = "Enter a valid postal code";
  if (Object.keys(errors).length) {
    const err = new OrderInputError("Please check your checkout details");
    err.fields = errors;
    throw err;
  }
  return {
    name: c.name.trim(),
    email: c.email.trim(),
    phone: c.phone.trim(),
    address: {
      street: a.street.trim(),
      apartment: str(a.apartment) || null,
      city: a.city.trim(),
      country: a.country.trim(),
      postalCode: a.postalCode.trim().toUpperCase(),
    },
  };
}

const createOrder = wrap(async (req, res) => {
  const body = req.body || {};
  const paymentMethod = body.paymentMethod === "stripe" ? "stripe" : "demo";
  let customer;
  try {
    customer = parseCustomer(body);
    parseCartItems(body.items);
    if (!pricing.isValidPromoCode(body.promoCode ?? "")) throw new OrderInputError("Invalid promo code");
  } catch (err) {
    if (err instanceof OrderInputError) return fail(res, err.status, err.message, err.fields ? { fields: err.fields } : undefined);
    throw err;
  }

  // A signed-in customer may only create account-linked orders for their own e-mail.
  if (req.user) {
    const accountEmail = (req.identity?.email || req.user.email || "").toLowerCase();
    if (!accountEmail || accountEmail !== customer.email.toLowerCase()) {
      return fail(res, 403, "Order email must match your signed-in account email");
    }
  }

  if (paymentMethod === "stripe" && !stripe.stripeStatus().enabled) {
    return fail(res, 503, "Card payments are not configured. Use the demo checkout.");
  }

  const client = await pool.connect();
  let created;
  let lines;
  let totals;
  try {
    await client.query("BEGIN");
    try {
      ({ lines, totals } = await priceCart(client, body.items, body.promoCode ?? "", {
        lock: true,
        userId: req.user?.id,
        reservationKey: body.reservationKey,
      }));
    } catch (err) {
      await client.query("ROLLBACK");
      if (err instanceof OrderInputError) return fail(res, err.status, err.message);
      throw err;
    }
    const id = `SH-${crypto.randomUUID()}`;
    const receiptToken = crypto.randomBytes(32).toString("hex");
    const qty = new Map();
    for (const l of lines) qty.set(l.id, (qty.get(l.id) || 0) + l.quantity);
    const allocations = await inventory.consume(
      client,
      body.reservationKey,
      lines.map((l) => ({ ...l, color: l.stockColor || l.color })),
      req.user?.id
    );
    for (const [pid, q] of qty) {
      await client.query("UPDATE shoes_products SET stock = stock - $1 WHERE id = $2", [q, pid]);
    }

    const storedItems = lines.map((l) => ({
      variantId: allocations.find(
        (a) =>
          a.id === l.id &&
          a.size === l.size &&
          a.color.toLowerCase() === String(l.stockColor || l.color).toLowerCase()
      )?.variantId || null,
      id: l.id,
      name: l.name,
      brand: l.brand,
      image: l.image,
      price: pricing.centsToDollars(l.unitPriceCents),
      size: l.size,
      color: l.color,
      quantity: l.quantity,
      ...(l.designId
        ? { designId: l.designId, designName: l.designName, customization: l.customization }
        : {}),
    }));
    const isStripe = paymentMethod === "stripe";
    const { rows } = await client.query(
      `INSERT INTO shoes_orders
        (id, firebase_uid, user_id, customer_name, customer_email, customer_phone, shipping_address,
         delivery_method, items, subtotal, discount, promo_code, shipping, total, status,
         payment_provider, payment_status, receipt_token_hash, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'standard',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
       RETURNING *`,
      [
        id,
        req.user?.firebase_uid || null,
        req.user?.id || null,
        customer.name,
        customer.email,
        customer.phone,
        JSON.stringify(customer.address),
        JSON.stringify(storedItems),
        pricing.centsToDollars(totals.subtotalCents),
        pricing.centsToDollars(totals.discountCents),
        totals.promoCode || null,
        pricing.centsToDollars(totals.shippingCents),
        pricing.centsToDollars(totals.totalCents),
        isStripe ? "PENDING_PAYMENT" : "DEMO_CONFIRMED",
        isStripe ? "stripe" : "demo",
        isStripe ? "unpaid" : "demo",
        hash(receiptToken),
      ]
    );
    if (body.reservationKey) await client.query('UPDATE shoes_reservations SET order_id=$2 WHERE id=$1',[body.reservationKey,id]);
    await tracking.ensureInitialEvent(client, id);
    created = { row: rows[0], receiptToken };
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  const order = orderRow(created.row);
  log.info("order.created", { orderId: order.id, provider: order.paymentProvider, totalCents: totals.totalCents, signedIn: Boolean(req.user) });

  if (paymentMethod === "stripe") {
    const origin = frontendOrigin(req);
    try {
      const session = await stripe.createCheckoutSession({
        order: created.row,
        lines,
        totals,
        successUrl: `${origin}/success?order=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/checkout?cancelled=${encodeURIComponent(order.id)}`,
      });
      await pool.query("UPDATE shoes_orders SET stripe_session_id = $2, updated_at = NOW() WHERE id = $1", [order.id, session.id]);
      return res.status(201).json({
        success: true,
        message: "Redirecting to Stripe test checkout",
        order: { ...order },
        receiptToken: created.receiptToken,
        checkoutUrl: session.url,
      });
    } catch (err) {
      log.error("stripe.session_failed", { orderId: order.id, error: err });
      await releaseOrder(order.id, "CANCELLED", "failed");
      return fail(res, 502, "Could not start the Stripe test checkout. No payment was taken; please try again.");
    }
  }

  let emailStatus = "not_sent";
  try {
    const result = await email.sendOrderConfirmation(order);
    emailStatus = result?.sent ? "sent" : "not_sent";
  } catch (err) {
    log.warn("email.order_confirmation_failed", { orderId: order.id, error: err });
  }

  return res.status(201).json({
    success: true,
    message: "Demo order created successfully",
    order,
    receiptToken: created.receiptToken,
    emailStatus,
  });
});

// Cancels/expires an unpaid order and restocks its items, in one transaction.
// Only acts on orders that are still cancellable and not paid.
async function releaseOrder(orderId, newStatus, paymentStatus, db) {
  const client = db || (await pool.connect());
  const own = !db;
  try {
    if (own) await client.query("BEGIN");
    const { rows } = await client.query("SELECT * FROM shoes_orders WHERE id = $1 FOR UPDATE", [orderId]);
    const order = rows[0];
    if (!order || !CANCELLABLE_STATUSES.has(order.status) || order.payment_status === "paid") {
      if (own) await client.query("ROLLBACK");
      return false;
    }
    await inventory.restock(client, parseItems(order.items));
    const qty = new Map();
    for (const item of parseItems(order.items)) qty.set(item.id, (qty.get(item.id) || 0) + Number(item.quantity || 0));
    for (const [id, q] of qty) await client.query("UPDATE shoes_products SET stock = stock + $1 WHERE id = $2", [q, id]);
    await client.query(
      `UPDATE shoes_orders SET status = $2,
         payment_status = CASE WHEN payment_provider = 'demo' THEN payment_status ELSE $3 END,
         cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [orderId, newStatus, paymentStatus]
    );
    if (own) await client.query("COMMIT");
    return true;
  } catch (err) {
    if (own) await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    if (own) client.release();
  }
}

// ==========================================
// ORDER READ / RECEIPT / CANCEL
// ==========================================

const getOrder = wrap(async (req, res) => {
  const order = await authorizedOrder(req, res, pool);
  if (!order) return;
  const row = orderRow(order);
  res.json({
    success: true,
    receipt: {
      ...row,
      notice: row.paymentProvider === "demo" ? "DEMO RECEIPT - NOT PROOF OF PAYMENT" : "STRIPE TEST MODE - NO REAL MONEY MOVED",
    },
  });
});

const downloadReceipt = wrap(async (req, res) => {
  const order = await authorizedOrder(req, res, pool);
  if (!order) return;
  generateReceipt(orderRow(order), res);
});

const cancelOrder = wrap(async (req, res) => {
  const order = await authorizedOrder(req, res, pool);
  if (!order) return;
  if (!CANCELLABLE_STATUSES.has(order.status)) return fail(res, 409, "This order can no longer be cancelled");
  if (order.payment_status === "paid") return fail(res, 409, "Paid orders cannot be cancelled here");
  if (order.payment_provider === "stripe" && order.stripe_session_id) {
    try {
      const s = await stripe.expireSession(order.stripe_session_id);
      if (s && s.status === "complete") return fail(res, 409, "Payment already completed for this order");
    } catch {
      return fail(res, 409, "Could not cancel the Stripe session. If you already paid, the order will update shortly.");
    }
  }
  const changed = await releaseOrder(order.id, order.payment_provider === "demo" ? "DEMO_CANCELLED" : "CANCELLED", "expired");
  if (!changed) return fail(res, 409, "Order already cancelled");
  log.info("order.cancelled", { orderId: order.id });
  const { rows } = await pool.query("SELECT * FROM shoes_orders WHERE id = $1", [order.id]);
  const row = orderRow(rows[0]);
  res.json({ success: true, message: "Order cancelled", orderId: order.id, status: row.status, order: row });
});

// ==========================================
// ACCOUNT
// ==========================================

const getMe = (req, res) => res.json({ success: true, user: auth.publicUser(req.user, req.identity) });

const OWNED_ORDERS_WHERE = "(user_id = $1 OR (user_id IS NULL AND firebase_uid IS NOT NULL AND firebase_uid = $2))";

const getMyOrders = wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM shoes_orders WHERE ${OWNED_ORDERS_WHERE} ORDER BY created_at DESC LIMIT 100`,
    [req.user.id, req.user.firebase_uid]
  );
  res.json({ success: true, count: rows.length, orders: rows.map(orderRow) });
});

const getMyOrder = wrap(async (req, res) => {
  const order = await authorizedOrder(req, res, pool);
  if (!order) return;
  if (!ownsOrder(req.user, order)) return fail(res, 403, "You do not have access to this order");
  res.json({ success: true, order: orderRow(order) });
});

// ---------- Favorites ----------

async function favoriteIds(userId) {
  const { rows } = await pool.query("SELECT product_id FROM shoes_favorites WHERE user_id = $1 ORDER BY created_at", [userId]);
  return rows.map((r) => r.product_id);
}

const getFavorites = wrap(async (req, res) => {
  res.json({ success: true, productIds: await favoriteIds(req.user.id) });
});

// Merge (union) — never removes server favorites; local ones are added.
const mergeFavorites = wrap(async (req, res) => {
  const ids = req.body?.productIds;
  if (!Array.isArray(ids) || ids.length > 200) return fail(res, 400, "productIds must be an array (max 200)");
  const clean = [...new Set(ids.map(Number).filter((n) => Number.isInteger(n) && n > 0 && n < 2 ** 31))];
  if (clean.length) {
    await pool.query(
      `INSERT INTO shoes_favorites (user_id, product_id)
       SELECT $1, p.id FROM shoes_products p WHERE p.id = ANY($2::int[])
       ON CONFLICT DO NOTHING`,
      [req.user.id, clean]
    );
  }
  res.json({ success: true, productIds: await favoriteIds(req.user.id) });
});

const addFavorite = wrap(async (req, res) => {
  const id = productId(req);
  if (!id) return fail(res, 404, "Product not found");
  const r = await pool.query(
    `INSERT INTO shoes_favorites (user_id, product_id)
     SELECT $1, id FROM shoes_products WHERE id = $2 ON CONFLICT DO NOTHING RETURNING product_id`,
    [req.user.id, id]
  );
  const exists = r.rowCount || (await pool.query("SELECT 1 FROM shoes_products WHERE id = $1", [id])).rowCount;
  if (!exists) return fail(res, 404, "Product not found");
  res.json({ success: true, productIds: await favoriteIds(req.user.id) });
});

const removeFavorite = wrap(async (req, res) => {
  const id = productId(req);
  if (!id) return fail(res, 404, "Product not found");
  await pool.query("DELETE FROM shoes_favorites WHERE user_id = $1 AND product_id = $2", [req.user.id, id]);
  res.json({ success: true, productIds: await favoriteIds(req.user.id) });
});

// ---------- Explicit identity linking (Firebase <-> Clerk) ----------

const linkIdentity = wrap(async (req, res) => {
  const otherToken = req.body?.token;
  let other;
  try {
    other = await auth.verifyToken(otherToken);
  } catch (err) {
    return fail(res, err.status || 401, "The second sign-in could not be verified");
  }
  if (other.provider === req.identity.provider) {
    return fail(res, 400, "Sign in with the other provider to link accounts");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = (await client.query("SELECT * FROM shoes_users WHERE id = $1 FOR UPDATE", [req.user.id])).rows[0];
    const otherRow = await auth.findUserRow(client, other);
    const otherCol = auth.PROVIDER_COLUMN[other.provider];

    if (otherRow && String(otherRow.id) === String(current.id)) {
      await client.query("COMMIT");
      return res.json({ success: true, linked: true, alreadyLinked: true, user: auth.publicUser(current, req.identity) });
    }
    if (current[otherCol] && current[otherCol] !== other.providerUserId) {
      await client.query("ROLLBACK");
      return fail(res, 409, "This account is already linked to a different sign-in");
    }

    let survivor = current;
    if (otherRow) {
      // Both identities already have SHOES profiles. Fold the one without a
      // Firebase UID into the one that has it (the legacy owner of orders).
      const keep = current.firebase_uid ? current : otherRow;
      const fold = keep === current ? otherRow : current;
      if (keep.firebase_uid && fold.firebase_uid) {
        await client.query("ROLLBACK");
        return fail(res, 409, "Both sign-ins already have separate legacy accounts; they cannot be merged automatically");
      }
      const foldClerk = fold.clerk_user_id;
      await client.query(`INSERT INTO shoes_size_preferences(user_id,brand,eu,foot_cm,system)
        SELECT $1,brand,eu,foot_cm,system FROM shoes_size_preferences WHERE user_id=$2 ON CONFLICT DO NOTHING`,[keep.id,fold.id]);
      await client.query(`INSERT INTO shoes_price_alerts(user_id,product_id,target_price,active)
        SELECT $1,product_id,target_price,active FROM shoes_price_alerts WHERE user_id=$2 ON CONFLICT DO NOTHING`,[keep.id,fold.id]);
      await client.query('UPDATE shoes_price_alerts SET active=FALSE WHERE user_id=$1',[fold.id]);
      await client.query("UPDATE shoes_reservations SET status='released' WHERE user_id=$1 AND status='active'",[fold.id]);
      await client.query("UPDATE shoes_orders SET user_id = $1, updated_at = NOW() WHERE user_id = $2", [keep.id, fold.id]);
      await client.query(
        `INSERT INTO shoes_favorites (user_id, product_id, created_at)
         SELECT $1, product_id, created_at FROM shoes_favorites WHERE user_id = $2 ON CONFLICT DO NOTHING`,
        [keep.id, fold.id]
      );
      await client.query(
        `UPDATE shoes_reviews SET user_id = $1 WHERE user_id = $2
           AND product_id NOT IN (SELECT product_id FROM shoes_reviews WHERE user_id = $1)`,
        [keep.id, fold.id]
      );
      await client.query(
        "UPDATE shoes_users SET clerk_user_id = NULL, merged_into = $1, updated_at = NOW() WHERE id = $2",
        [keep.id, fold.id]
      );
      const { rows } = await client.query(
        "UPDATE shoes_users SET clerk_user_id = COALESCE(clerk_user_id, $2), updated_at = NOW() WHERE id = $1 RETURNING *",
        [keep.id, foldClerk]
      );
      survivor = rows[0];
    } else {
      const { rows } = await client.query(
        `UPDATE shoes_users SET ${otherCol} = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [current.id, other.providerUserId]
      );
      survivor = rows[0];
    }
    await client.query("COMMIT");
    log.info("identity.linked", { userId: String(survivor.id), providers: [req.identity.provider, other.provider] });
    res.json({ success: true, linked: true, user: auth.publicUser(survivor, req.identity) });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
});

// ---------- Claim a guest order (e-mailed one-time code) ----------

const CLAIM_TTL_MS = 15 * 60 * 1000;
const CLAIM_MAX_ATTEMPTS = 5;

function maskEmail(e) {
  const [u, d] = String(e).split("@");
  return `${u.slice(0, 1)}${"*".repeat(Math.max(1, u.length - 1))}@${d}`;
}

const requestClaim = wrap(async (req, res) => {
  if (!email.emailEnabled()) {
    return fail(res, 503, "Claiming guest orders is disabled until e-mail sending (RESEND_API_KEY, EMAIL_FROM) is configured");
  }
  const orderId = str(req.body?.orderId);
  const generic = { success: true, message: "If this guest order exists, a verification code was sent to its e-mail address." };
  if (!ORDER_ID_RE.test(orderId)) return fail(res, 400, "Enter a valid order number (SH-…)");
  const { rows } = await pool.query("SELECT * FROM shoes_orders WHERE id = $1", [orderId]);
  const order = rows[0];
  if (!order || order.user_id != null || order.firebase_uid != null) return res.json(generic);
  const recent = await pool.query(
    "SELECT COUNT(*)::int AS n FROM shoes_order_claims WHERE order_id = $1 AND created_at > NOW() - INTERVAL '1 hour'",
    [orderId]
  );
  if (recent.rows[0].n >= 3) return fail(res, 429, "Too many codes requested for this order. Try again later.");
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await pool.query(
    "INSERT INTO shoes_order_claims (order_id, user_id, code_hash, expires_at) VALUES ($1,$2,$3,$4)",
    [orderId, req.user.id, hash(`${orderId}:${code}`), new Date(Date.now() + CLAIM_TTL_MS)]
  );
  const sent = await email.sendClaimCode({ to: order.customer_email, code, orderId });
  if (!sent?.sent) return fail(res, 502, "Could not send the verification e-mail. Try again later.");
  res.json({ ...generic, sentTo: maskEmail(order.customer_email) });
});

const confirmClaim = wrap(async (req, res) => {
  const orderId = str(req.body?.orderId);
  const code = str(req.body?.code);
  if (!ORDER_ID_RE.test(orderId) || !/^\d{6}$/.test(code)) return fail(res, 400, "Enter the 6-digit code");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT * FROM shoes_order_claims WHERE order_id = $1 AND user_id = $2 AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [orderId, req.user.id]
    );
    const claim = rows[0];
    if (!claim || claim.expires_at < new Date() || claim.attempts >= CLAIM_MAX_ATTEMPTS) {
      await client.query("ROLLBACK");
      return fail(res, 400, "The code is invalid or expired. Request a new one.");
    }
    const ok = crypto.timingSafeEqual(Buffer.from(claim.code_hash, "hex"), Buffer.from(hash(`${orderId}:${code}`), "hex"));
    if (!ok) {
      await client.query("UPDATE shoes_order_claims SET attempts = attempts + 1 WHERE id = $1", [claim.id]);
      await client.query("COMMIT");
      return fail(res, 400, "The code is invalid or expired. Request a new one.");
    }
    const upd = await client.query(
      "UPDATE shoes_orders SET user_id = $2, updated_at = NOW() WHERE id = $1 AND user_id IS NULL AND firebase_uid IS NULL RETURNING *",
      [orderId, req.user.id]
    );
    await client.query("UPDATE shoes_order_claims SET consumed_at = NOW() WHERE id = $1", [claim.id]);
    await client.query("COMMIT");
    if (!upd.rows.length) return fail(res, 409, "This order is already linked to an account");
    log.info("order.claimed", { orderId, userId: String(req.user.id) });
    res.json({ success: true, order: orderRow(upd.rows[0]) });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
});

// ==========================================
// STRIPE WEBHOOK (raw body, signature-verified, idempotent)
// ==========================================

const stripeWebhook = wrap(async (req, res) => {
  const signature = req.get("stripe-signature");
  if (!signature || !Buffer.isBuffer(req.body)) return fail(res, 400, "Missing Stripe signature");
  let event;
  try {
    event = stripe.constructWebhookEvent(req.body, signature);
  } catch {
    log.warn("stripe.webhook_bad_signature");
    return fail(res, 400, "Invalid Stripe signature");
  }
  if (event.livemode && process.env.STRIPE_LIVE_MODE_APPROVED !== "true") {
    log.warn("stripe.live_event_refused", { eventId: event.id });
    return fail(res, 400, "Live-mode events are not accepted");
  }

  const session = event.data?.object || {};
  const orderId = session.metadata?.order_id || session.client_reference_id || null;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO shoes_payment_events (event_id, provider, type, order_id, livemode)
       VALUES ($1, 'stripe', $2, $3, $4) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [event.id, event.type, orderId, Boolean(event.livemode)]
    );
    if (!ins.rowCount) {
      await client.query("COMMIT");
      return res.json({ received: true, duplicate: true });
    }

    let outcome = "ignored";
    if (orderId && event.type.startsWith("checkout.session.")) {
      const { rows } = await client.query("SELECT * FROM shoes_orders WHERE id = $1 FOR UPDATE", [orderId]);
      const order = rows[0];
      if (!order || order.payment_provider !== "stripe") {
        outcome = "unknown_order";
      } else if (order.stripe_session_id && session.id && order.stripe_session_id !== session.id) {
        outcome = "session_mismatch";
      } else if (
        (event.type === "checkout.session.completed" && session.payment_status === "paid") ||
        event.type === "checkout.session.async_payment_succeeded"
      ) {
        const expected = pricing.toCents(order.total);
        if (session.amount_total !== expected || String(session.currency).toLowerCase() !== "usd") {
          outcome = "amount_mismatch";
          log.error("stripe.amount_mismatch", { orderId, expected, got: session.amount_total });
        } else if (order.status === "PENDING_PAYMENT") {
          await client.query(
            `UPDATE shoes_orders SET status = 'PAID', payment_status = 'paid', paid_at = NOW(),
               stripe_payment_intent_id = $2, stripe_session_id = COALESCE(stripe_session_id, $3), updated_at = NOW()
             WHERE id = $1`,
            [orderId, typeof session.payment_intent === "string" ? session.payment_intent : null, session.id || null]
          );
          outcome = "paid";
        } else {
          outcome = `no_transition_from_${order.status}`;
        }
      } else if (event.type === "checkout.session.async_payment_failed") {
        outcome = (await releaseOrder(orderId, "CANCELLED", "failed", client)) ? "failed" : "no_change";
      } else if (event.type === "checkout.session.expired") {
        outcome = (await releaseOrder(orderId, "EXPIRED", "expired", client)) ? "expired" : "no_change";
      }
    }
    await client.query("COMMIT");
    log.info("stripe.webhook", { eventId: event.id, type: event.type, orderId, outcome });
    res.json({ received: true, outcome });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err; // 500 -> Stripe retries; the event row was rolled back too
  } finally {
    client.release();
  }
});

// ==========================================
// NEWSLETTER
// ==========================================

const subscribeNewsletter = wrap(async (req, res) => {
  const addr = str(req.body?.email).toLowerCase();
  if (!validEmail(addr)) return fail(res, 400, "Enter a valid email address");
  await pool.query(
    "INSERT INTO shoes_newsletter_subscribers (email) VALUES ($1) ON CONFLICT ((lower(email))) DO NOTHING",
    [addr]
  );
  // Same answer whether or not the address was already subscribed.
  res.status(201).json({ success: true, message: "Thanks! You're on the SHOES list." });
});

// ==========================================
// STATS
// ==========================================

const getStats = wrap(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status IN ('DEMO_CONFIRMED','PAID'))::int AS active,
           COALESCE(SUM(total) FILTER (WHERE status = 'DEMO_CONFIRMED'), 0) AS demo_value
    FROM shoes_orders`);
  const count = (await pool.query("SELECT COUNT(*)::int AS count FROM shoes_products")).rows[0].count;
  const s = rows[0];
  res.json({
    success: true,
    stats: {
      totalProducts: count,
      totalOrders: s.total,
      activeOrders: s.active,
      cancelledOrders: s.total - s.active,
      demoOrderValue: Number(s.demo_value),
      currency: "USD",
      realRevenue: 0,
    },
  });
});

module.exports = {
  home,
  index,
  health,
  config,
  getProducts,
  getProduct,
  getRelated,
  getReviews,
  createReview,
  quoteCart,
  createOrder,
  getOrder,
  cancelOrder,
  downloadReceipt,
  getMe,
  getMyOrders,
  getMyOrder,
  getFavorites,
  mergeFavorites,
  addFavorite,
  removeFavorite,
  linkIdentity,
  requestClaim,
  confirmClaim,
  stripeWebhook,
  subscribeNewsletter,
  getStats,
  // exported for tests
  _internal: { priceCart, parseCustomer, ownsOrder, releaseOrder, authorizedOrder, OrderInputError },
};
