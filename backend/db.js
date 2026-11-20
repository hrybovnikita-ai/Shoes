"use strict";
const { Pool } = require("pg");
const { products } = require("./data");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required (PostgreSQL/Neon)");
}

// Local databases (localhost / 127.0.0.1 / ?sslmode=disable) connect without
// TLS; every other host requires verified TLS (Neon).
function sslConfig(url) {
  try {
    const u = new URL(url);
    const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(u.hostname);
    if (local || u.searchParams.get("sslmode") === "disable") return false;
  } catch {
    // fall through to TLS
  }
  return { rejectUnauthorized: true };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig(process.env.DATABASE_URL),
  max: Number(process.env.PG_POOL_MAX) || 5,
});

// Seeds the original demo catalog. ON CONFLICT DO NOTHING: never overwrites
// existing product rows (prices / stock edited in the DB are preserved).
async function seedProducts(client = pool) {
  for (const p of products) {
    await client.query(
      `INSERT INTO shoes_products
         (id, name, brand, category, price, old_price, color, rating, stock, image)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.name, p.brand, p.category, p.price, p.oldPrice, p.color, p.rating, p.stock, p.image]
    );
  }
}

function productRow(p) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: Number(p.price),
    oldPrice: p.old_price == null ? null : Number(p.old_price),
    color: p.color,
    rating: p.rating == null ? null : Number(p.rating),
    stock: p.stock,
    image: p.image,
    ...(p.review_count != null ? { reviewCount: Number(p.review_count) } : {}),
    ...(p.review_avg != null ? { reviewAverage: Number(p.review_avg) } : {}),
    ...(p.units_sold != null ? { unitsSold: Number(p.units_sold) } : {}),
  };
}

function parseItems(items) {
  if (Array.isArray(items)) return items;
  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

const CANCELLABLE_STATUSES = new Set(["DEMO_CONFIRMED", "PENDING_PAYMENT"]);

function orderRow(o) {
  const paymentProvider = o.payment_provider || "demo";
  const paymentStatus = o.payment_status || "demo";
  return {
    id: o.id,
    orderNumber: o.id,
    date: new Date(o.created_at).toISOString(),
    customer: {
      name: o.customer_name,
      email: o.customer_email,
      ...(o.customer_phone ? { phone: o.customer_phone } : {}),
    },
    shippingAddress: o.shipping_address || null,
    deliveryMethod: o.delivery_method || "standard",
    items: parseItems(o.items),
    subtotal: Number(o.subtotal),
    discount: Number(o.discount || 0),
    promoCode: o.promo_code || null,
    shipping: Number(o.shipping),
    total: Number(o.total),
    currency: "USD",
    status: o.status,
    paymentProvider,
    paymentStatus,
    paymentProcessed: paymentStatus === "paid",
    paidAt: o.paid_at ? new Date(o.paid_at).toISOString() : null,
    cancelledAt: o.cancelled_at ? new Date(o.cancelled_at).toISOString() : null,
    canCancel: CANCELLABLE_STATUSES.has(o.status) && paymentStatus !== "paid",
  };
}

module.exports = { pool, seedProducts, productRow, orderRow, parseItems, sslConfig, CANCELLABLE_STATUSES };
