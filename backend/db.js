
const { Pool } = require("pg");
const { products } = require("./data");

// The pool is created lazily so a missing DATABASE_URL never crashes the API at
// import time; queries then fail with a clear DB_NOT_CONFIGURED error (-> 503).
class DbNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not configured");
    this.code = "DB_NOT_CONFIGURED";
    this.status = 503;
  }
}

function sslConfig(url) {
  if (/sslmode=disable/i.test(url)) return false;
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    // keep TLS on for anything we cannot parse
  }
  return ["localhost", "127.0.0.1", "::1"].includes(host) ? false : { rejectUnauthorized: true };
}

let realPool = null;
function getPool() {
  if (realPool) return realPool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new DbNotConfiguredError();
  realPool = new Pool({ connectionString: url, ssl: sslConfig(url), max: 5 });
  realPool.on("error", (err) => console.error("SHOES db pool error:", err.message));
  return realPool;
}

const pool = {
  query: (...args) => {
    try {
      return getPool().query(...args);
    } catch (err) {
      return Promise.reject(err);
    }
  },
  connect: () => {
    try {
      return getPool().connect();
    } catch (err) {
      return Promise.reject(err);
    }
  },
};

async function initDb() {
  // ==========================================
  // PRODUCTS TABLE
  // ==========================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shoes_products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      category TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      old_price NUMERIC(10,2),
      color TEXT,
      rating NUMERIC(3,1),
      stock INTEGER NOT NULL CHECK (stock >= 0),
      image TEXT NOT NULL
    )
  `);

  // ==========================================
  // ORDERS TABLE
  // ==========================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shoes_orders (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      firebase_uid TEXT,

      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,

      items JSONB NOT NULL,

      subtotal NUMERIC(10,2) NOT NULL,
      shipping NUMERIC(10,2) NOT NULL,
      total NUMERIC(10,2) NOT NULL,

      status TEXT NOT NULL,
      receipt_token_hash TEXT NOT NULL
    )
  `);

  // ==========================================
  // MIGRATION FOR EXISTING DATABASES
  // ==========================================

  // Adds Firebase UID to existing orders
  // without deleting any previous data.

  await pool.query(`
    ALTER TABLE shoes_orders
    ADD COLUMN IF NOT EXISTS firebase_uid TEXT
  `);

  // ==========================================
  // DATABASE INDEXES
  // ==========================================

  // Speeds up the My Orders page.

  await pool.query(`
    CREATE INDEX IF NOT EXISTS
    idx_shoes_orders_firebase_uid
    ON shoes_orders(firebase_uid, created_at DESC)
  `);

  // ==========================================
  // SEED PRODUCTS
  // ==========================================

  for (const p of products) {
    await pool.query(
      `INSERT INTO shoes_products
       (
         id,
         name,
         brand,
         category,
         price,
         old_price,
         color,
         rating,
         stock,
         image
       )
       VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10
       )
       ON CONFLICT (id) DO NOTHING`,
      [
        p.id,
        p.name,
        p.brand,
        p.category,
        p.price,
        p.oldPrice,
        p.color,
        p.rating,
        p.stock,
        p.image,
      ]
    );
  }

  console.log(
    "SHOES: PostgreSQL database initialized"
  );
}

// ==========================================
// PRODUCT RESPONSE FORMAT
// ==========================================

function productRow(p) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,

    price: Number(p.price),
    oldPrice:
      p.old_price == null
        ? null
        : Number(p.old_price),

    color: p.color,
    rating:
      p.rating == null
        ? null
        : Number(p.rating),

    stock: p.stock,
    image: p.image,
  };
}

// ==========================================
// ORDER RESPONSE FORMAT
// ==========================================

function orderRow(o) {
  return {
    id: o.id,

    date: new Date(o.created_at).toISOString(),

    customer: {
      name: o.customer_name,
      email: o.customer_email,
    },

    items: o.items,

    subtotal: Number(o.subtotal),
    shipping: Number(o.shipping),
    total: Number(o.total),

    currency: "USD",
    status: o.status,

    paymentProcessed: false,
  };
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  pool,
  getPool,
  sslConfig,
  DbNotConfiguredError,
  initDb,
  productRow,
  orderRow,
};
