"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("./helpers");
const { migrate, status } = require("../lib/migrate");
const { seedProducts } = require("../db");

// Recreates the schema exactly as the old initDb() left it, with orders
// owned by Firebase UIDs and guest orders, then runs the new migrations.
test("migrations upgrade a legacy database without losing data", async () => {
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await pool.query(`
    CREATE TABLE shoes_products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, brand TEXT NOT NULL,
      category TEXT NOT NULL, price NUMERIC(10,2) NOT NULL, old_price NUMERIC(10,2), color TEXT,
      rating NUMERIC(3,1), stock INTEGER NOT NULL CHECK (stock >= 0), image TEXT NOT NULL);
    CREATE TABLE shoes_orders (id TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      firebase_uid TEXT, customer_name TEXT NOT NULL, customer_email TEXT NOT NULL, items JSONB NOT NULL,
      subtotal NUMERIC(10,2) NOT NULL, shipping NUMERIC(10,2) NOT NULL, total NUMERIC(10,2) NOT NULL,
      status TEXT NOT NULL, receipt_token_hash TEXT NOT NULL);
    CREATE INDEX idx_shoes_orders_firebase_uid ON shoes_orders(firebase_uid, created_at DESC);`);
  await seedProducts();
  await pool.query("UPDATE shoes_products SET stock = 3 WHERE id = 1"); // edited in DB
  const ins = (id, uid, email) =>
    pool.query(
      `INSERT INTO shoes_orders (id, firebase_uid, customer_name, customer_email, items, subtotal, shipping, total, status, receipt_token_hash)
       VALUES ($1,$2,'N',$3,'[{"id":1,"quantity":1,"size":42,"price":150}]',150,0,150,'DEMO_CONFIRMED','ab')`,
      [id, uid, email]
    );
  await ins("SH-legacy-1", "uidA", "A@Example.com");
  await ins("SH-legacy-2", "uidA", "a@example.com");
  await ins("SH-legacy-3", "uidB", "b@example.com");
  await ins("SH-guest-1", null, "guest@example.com");

  const applied = await migrate(pool);
  assert.equal(applied.length, 5);

  const orders = (await pool.query("SELECT * FROM shoes_orders ORDER BY id")).rows;
  assert.equal(orders.length, 4, "no order lost");
  const users = (await pool.query("SELECT * FROM shoes_users ORDER BY firebase_uid")).rows;
  assert.deepEqual(users.map((u) => u.firebase_uid), ["uidA", "uidB"]);
  const byId = Object.fromEntries(orders.map((o) => [o.id, o]));
  assert.equal(String(byId["SH-legacy-1"].user_id), String(users[0].id));
  assert.equal(String(byId["SH-legacy-2"].user_id), String(users[0].id));
  assert.equal(String(byId["SH-legacy-3"].user_id), String(users[1].id));
  assert.equal(byId["SH-guest-1"].user_id, null, "guest orders are never auto-assigned");
  assert.equal(byId["SH-legacy-1"].payment_provider, "demo");
  assert.equal(byId["SH-legacy-1"].payment_status, "demo");
  assert.equal(byId["SH-legacy-1"].firebase_uid, "uidA", "legacy column untouched");
  assert.equal((await pool.query("SELECT stock FROM shoes_products WHERE id=1")).rows[0].stock, 3, "products untouched");

  // Re-running is a no-op; seeding never overwrites.
  assert.deepEqual(await migrate(pool), []);
  await seedProducts();
  assert.equal((await pool.query("SELECT stock FROM shoes_products WHERE id=1")).rows[0].stock, 3);
  assert.ok((await status(pool)).every((m) => m.applied && !m.checksumMismatch));
});

test("dry-run changes nothing", async () => {
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const names = await migrate(pool, { dryRun: true });
  assert.equal(names.length, 5);
  const t = await pool.query("SELECT to_regclass('shoes_orders') AS t");
  assert.equal(t.rows[0].t, null);
});

test.after(() => pool.end());
