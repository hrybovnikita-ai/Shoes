-- 001 baseline: the schema that backend/db.js initDb() created before
-- migrations existed. Fully idempotent (IF NOT EXISTS) so it is a no-op on
-- the existing production database and creates the tables on a fresh one.

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
);

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
);

ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS firebase_uid TEXT;

CREATE INDEX IF NOT EXISTS idx_shoes_orders_firebase_uid
  ON shoes_orders (firebase_uid, created_at DESC);
