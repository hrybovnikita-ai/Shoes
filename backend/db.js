"use strict";
const { Pool } = require("pg");
const { products } = require("./data");

// The pool is created lazily so a missing DATABASE_URL never crashes the API
// at import time (on Vercel that surfaced as FUNCTION_INVOCATION_FAILED with no
// CORS headers). Queries then fail with DB_NOT_CONFIGURED -> JSON 503.
class DbNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not configured");
    this.code = "DB_NOT_CONFIGURED";
    this.status = 503;
  }
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

let realPool = null;
function getPool() {
  if (realPool) return realPool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new DbNotConfiguredError();
  realPool = new Pool({ connectionString: url, ssl: sslConfig(url), max: Number(process.env.PG_POOL_MAX) || 5 });
  realPool.on("error", (err) => console.error("SHOES db pool error:", err.message));
  return realPool;
}

const lazy = (fn) => (...args) => {
  try {
    return fn(...args);
  } catch (err) {
    return Promise.reject(err);
  }
};
const pool = {
  query: lazy((...args) => getPool().query(...args)),
  connect: lazy(() => getPool().connect()),
  end: () => (realPool ? realPool.end() : Promise.resolve()),
};

// Seeds the original demo catalog. ON CONFLICT DO NOTHING: never overwrites
// existing product rows (prices / stock edited in the DB are preserved).
async function seedVariants(client = pool) {
  const table = await client.query("SELECT to_regclass('shoes_variants') AS t");
  if (!table.rows[0].t) return;
  const { rows } = await client.query("SELECT id, stock, color FROM shoes_products ORDER BY id");
  for (const p of rows) {
    const sizes = [38, 39, 40, 41, 42, 43, 44];
    let remaining = Number(p.stock) || 0;
    for (let i = 0; i < sizes.length; i++) {
      const qty = i === sizes.length - 1 ? remaining : Math.min(remaining, Math.max(1, Math.floor((p.stock || 0) / sizes.length)));
      remaining -= qty;
      if (qty <= 0) continue;
      await client.query(
        `INSERT INTO shoes_variants(product_id, size, color, stock)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (product_id, size, color) DO NOTHING`,
        [p.id, sizes[i], p.color, qty]
      );
    }
  }
}

async function catalogColumnsReady(client) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='shoes_products' AND column_name='slug' LIMIT 1`
  );
  return rows.length > 0;
}

async function seedProducts(client = pool) {
  const expanded = await catalogColumnsReady(client);
  const customizable = products.filter((p) => p.customizable).map((p) => p.id);
  for (const p of products) {
    if (expanded) {
      await client.query(
        `INSERT INTO shoes_products
           (id, slug, name, brand, category, gender, price, old_price, color, colors, materials, description,
            size_eu, size_us, size_uk, images, rating, stock, image, customizable)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,$17,$18,$19,$20)
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id,
          p.slug,
          p.name,
          p.brand,
          p.category,
          p.gender,
          p.price,
          p.oldPrice,
          p.color,
          JSON.stringify(p.colors || [p.color]),
          p.materials,
          p.description,
          JSON.stringify(p.sizeEu),
          JSON.stringify(p.sizeUs),
          JSON.stringify(p.sizeUk),
          JSON.stringify(p.images || [p.image]),
          p.rating,
          p.stock,
          p.image,
          Boolean(p.customizable),
        ]
      );
    } else {
      await client.query(
        `INSERT INTO shoes_products
           (id, name, brand, category, price, old_price, color, rating, stock, image)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.brand, p.category, p.price, p.oldPrice, p.color, p.rating, p.stock, p.image]
      );
    }
  }
  if (customizable.length) {
    try {
      await client.query("UPDATE shoes_products SET customizable = TRUE WHERE id = ANY($1::int[])", [customizable]);
    } catch (error) {
      if (error.code !== "42703") throw error;
    }
  }
  if (expanded) await seedVariants(client);
}

/** Updates only image + images JSON from the in-code catalog (does not change prices/stock). */
async function syncProductImages(client = pool) {
  const expanded = await catalogColumnsReady(client);
  let count = 0;
  for (const p of products) {
    const images = JSON.stringify(p.images || [p.image]);
    if (expanded) {
      const { rowCount } = await client.query(
        `UPDATE shoes_products SET image = $2, images = $3::jsonb WHERE id = $1`,
        [p.id, p.image, images]
      );
      if (rowCount) count += rowCount;
    } else {
      const { rowCount } = await client.query(`UPDATE shoes_products SET image = $2 WHERE id = $1`, [p.id, p.image]);
      if (rowCount) count += rowCount;
    }
  }
  return count;
}

/** Local dev: refresh catalog text/metadata from in-code catalog (does not change price/stock). */
async function syncCatalogMetadata(client = pool) {
  const expanded = await catalogColumnsReady(client);
  if (!expanded) return 0;
  let count = 0;
  for (const p of products) {
    const images = JSON.stringify(p.images || [p.image]);
    const colors = JSON.stringify(p.colors || [p.color]);
    const { rowCount } = await client.query(
      `UPDATE shoes_products SET
         slug = $2, name = $3, brand = $4, category = $5, gender = $6,
         color = $7, colors = $8::jsonb, materials = $9, description = $10,
         image = $11, images = $12::jsonb
       WHERE id = $1`,
      [
        p.id,
        p.slug,
        p.name,
        p.brand,
        p.category,
        p.gender,
        p.color,
        colors,
        p.materials,
        p.description,
        p.image,
        images,
      ]
    );
    if (rowCount) count += rowCount;
  }
  return count;
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function productRow(p) {
  const colors = parseJsonArray(p.colors);
  const images = parseJsonArray(p.images);
  return {
    id: p.id,
    slug: p.slug || null,
    name: p.name,
    brand: p.brand,
    category: p.category,
    gender: p.gender || null,
    description: p.description || null,
    materials: p.materials || null,
    price: Number(p.price),
    oldPrice: p.old_price == null ? null : Number(p.old_price),
    color: p.color,
    colors: colors.length ? colors : p.color ? [p.color] : [],
    sizes: {
      eu: parseJsonArray(p.size_eu),
      us: parseJsonArray(p.size_us),
      uk: parseJsonArray(p.size_uk),
    },
    rating: p.rating == null ? null : Number(p.rating),
    stock: p.stock,
    inventoryManaged: Boolean(p.inventory_managed),
    customizable: Boolean(p.customizable),
    image: p.image,
    images: images.length ? images : p.image ? [p.image] : [],
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
    fulfillmentStatus: o.fulfillment_status || "order_confirmed",
    trackingNumber: o.tracking_number || null,
    carrier: o.carrier || null,
    estimatedDeliveryAt: o.estimated_delivery_at ? new Date(o.estimated_delivery_at).toISOString() : null,
    trackingSimulated: Boolean(o.tracking_simulated),
  };
}

module.exports = {
  getPool,
  DbNotConfiguredError,
  pool,
  seedProducts,
  seedVariants,
  syncProductImages,
  syncCatalogMetadata,
  productRow,
  orderRow,
  parseItems,
  sslConfig,
  CANCELLABLE_STATUSES,
};
