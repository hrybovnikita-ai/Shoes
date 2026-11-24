"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { pool, resetDb, startServer, api, tokenFor, customer } = require("./helpers");

let server;
let base;
const alice = tokenFor("firebase", "track-alice", "alice-track@example.test");
const bob = tokenFor("firebase", "track-bob", "bob-track@example.test");
const admin = tokenFor("firebase", "track-admin", "admin-track@example.test");

test.before(async () => {
  await resetDb();
  ({ server, base } = await startServer());
  await api(base, "GET", "/admin/me", { token: admin });
  await pool.query("UPDATE shoes_users SET role = 'admin' WHERE firebase_uid = 'track-admin'");
});

test.after(async () => {
  server?.close();
  await pool.end();
});

test("fulfillment transitions, customer tracking, and access control", async () => {
  const placed = await api(base, "POST", "/orders", {
    token: alice,
    body: {
      customer: customer({ email: "alice-track@example.test" }),
      items: [{ id: 2, size: 42, color: "White", quantity: 1 }],
      paymentMethod: "demo",
    },
  });
  assert.equal(placed.status, 201);
  const orderId = placed.body.order.id;

  const tracking = await api(base, "GET", `/orders/${orderId}/tracking`, { token: alice });
  assert.equal(tracking.status, 200);
  assert.equal(tracking.body.tracking.fulfillmentStatus, "order_confirmed");
  assert.ok(tracking.body.tracking.events.length >= 1);

  const denied = await api(base, "GET", `/orders/${orderId}/tracking`, { token: bob });
  assert.equal(denied.status, 403);

  const advance = await api(base, "PATCH", `/admin/orders/${orderId}/fulfillment`, {
    token: admin,
    body: { status: "processing", message: "Picking items in warehouse" },
  });
  assert.equal(advance.status, 200);
  assert.equal(advance.body.tracking.fulfillmentStatus, "processing");

  const bad = await api(base, "PATCH", `/admin/orders/${orderId}/fulfillment`, {
    token: admin,
    body: { status: "delivered" },
  });
  assert.equal(bad.status, 409);

  const packed = await api(base, "PATCH", `/admin/orders/${orderId}/fulfillment`, {
    token: admin,
    body: { status: "packed", message: "Box sealed" },
  });
  assert.equal(packed.status, 200);

  const shipped = await api(base, "PATCH", `/admin/orders/${orderId}/fulfillment`, {
    token: admin,
    body: {
      status: "shipped",
      trackingNumber: "SHOES-DEMO-001",
      carrier: "SHOES Logistics",
      estimatedDeliveryAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    },
  });
  assert.equal(shipped.status, 200);
  assert.equal(shipped.body.tracking.trackingNumber, "SHOES-DEMO-001");
  assert.equal(shipped.body.tracking.trackingSimulated, true);
});