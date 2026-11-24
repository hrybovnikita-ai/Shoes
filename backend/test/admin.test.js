"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { pool, resetDb, startServer, api, tokenFor } = require("./helpers");
let server, base;
const admin = tokenFor("firebase", "revenue-admin", "admin@example.test");
const customer = tokenFor("firebase", "revenue-customer", "customer@example.test");
test.before(async () => {
  await resetDb();
  ({server, base} = await startServer());
  await api(base, "GET", "/admin/me", {token: admin});
  await pool.query("UPDATE shoes_users SET role = 'admin' WHERE firebase_uid = 'revenue-admin'");
});
test.after(async () => { server?.close(); await pool.end(); });
test("admin statistics reject anonymous and customer access", async () => {
  assert.equal((await api(base, "GET", "/admin/stats")).status, 401);
  assert.equal((await api(base, "GET", "/admin/stats", {token: customer})).status, 403);
});
test("empty revenue is zero; only confirmed non-demo payments count", async () => {
  const empty = await api(base, "GET", "/admin/stats", {token: admin});
  assert.equal(empty.status, 200);
  assert.equal(Number(empty.body.stats.revenue), 0);
  const fixtures = [
    ["paid", "stripe", new Date(), "10.10"],
    ["paid", "stripe", new Date(), "20.20"],
    ["paid", "stripe", null, "900.00"],
    ["paid", "demo", new Date(), "900.00"],
    ["demo", "demo", null, "900.00"],
    ["pending", "stripe", new Date(), "900.00"],
    ["failed", "stripe", new Date(), "900.00"],
    ["unpaid", "stripe", new Date(), "900.00"],
    ["expired", "stripe", null, "900.00"],
  ];
  for (const [i, [status, provider, paidAt, total]] of fixtures.entries()) {
    await pool.query(`INSERT INTO shoes_orders
      (id, customer_name, customer_email, items, subtotal, shipping, total,
       status, receipt_token_hash, payment_status, payment_provider, paid_at)
      VALUES ($1, 'Test', 'test@example.test', '[]', $2, 0, $2, 'CONFIRMED', 'test', $3, $4, $5)`,
      [`revenue-${i}`, total, status, provider, paidAt]);
  }
  const result = await api(base, "GET", "/admin/stats", {token: admin});
  assert.equal(result.status, 200);
  assert.equal(Number(result.body.stats.revenue), 30.30);
  assert.equal(result.body.stats.paid_orders, 2);
  assert.equal(result.body.stats.orders, 9);
  assert.equal(result.body.stats.unpaid_orders, 1);
});
