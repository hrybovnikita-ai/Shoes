const { Pool } = require("pg");
const { products } = require("./data");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required (PostgreSQL/Neon)");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: true },
  max: 5,
});

async function initDb() {
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
      stock INTEGER NOT NULL CHECK(stock >= 0),
      image TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shoes_orders (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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

  for (const p of products) {
    await pool.query(
      `INSERT INTO shoes_products
       (id,name,brand,category,price,old_price,color,rating,stock,image)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      [
        p.id, p.name, p.brand, p.category,
        p.price, p.oldPrice, p.color,
        p.rating, p.stock, p.image,
      ]
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
    oldPrice: Number(p.old_price),
    color: p.color,
    rating: Number(p.rating),
    stock: p.stock,
    image: p.image,
  };
}

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

module.exports = { pool, initDb, productRow, orderRow };
