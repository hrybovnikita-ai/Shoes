"use strict";
// Stripe: webhook signatures are generated with Stripe's own
// webhooks.generateTestHeaderString and verified by the real library
// (offline). Session creation uses a FAKE Stripe client — no network, no
// Stripe account. The hosted payment page itself is NOT exercised here.
const test = require("node:test");
const assert = require("node:assert/strict");
process.env.STRIPE_SECRET_KEY = "sk_test_dummy_for_unit_tests";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret_for_unit_tests";
const { pool, resetDb, startServer, api, customer } = require("./helpers");
const Stripe = require("stripe");
const stripeLib = require("../lib/stripe");

let server;
let base;
const created = [];
stripeLib.__setStripeForTests({
  coupons: { create: async (p) => ({ id: `coupon_${created.length}`, ...p }) },
  checkout: {
    sessions: {
      create: async (params) => {
        created.push(params);
        return { id: `cs_test_${created.length}`, url: `https://checkout.stripe.com/c/pay/cs_test_${created.length}` };
      },
      expire: async (id) => ({ id, status: "expired" }),
    },
  },
});

test.before(async () => {
  await resetDb();
  ({ server, base } = await startServer());
});
test.after(async () => {
  server.close();
  await pool.end();
});

function signed(event, secret = process.env.STRIPE_WEBHOOK_SECRET) {
  const payload = JSON.stringify(event);
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return { payload, header };
}

async function sendEvent(event, secret) {
  const { payload, header } = signed(event, secret);
  return api(base, "POST", "/payments/stripe/webhook", {
    body: payload,
    headers: { "Content-Type": "application/json", "Stripe-Signature": header },
  });
}

const completed = (id, orderId, sessionId, amount, extra = {}) => ({
  id,
  type: "checkout.session.completed",
  livemode: false,
  data: { object: { id: sessionId, object: "checkout.session", payment_status: "paid", amount_total: amount, currency: "usd", metadata: { order_id: orderId }, payment_intent: "pi_test_1", ...extra } },
});

async function stripeOrder(promoCode = "WELCOME15") {
  const r = await api(base, "POST", "/orders", {
    body: { customer: customer(), items: [{ id: 2, size: 42, quantity: 1 }], promoCode, paymentMethod: "stripe" },
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r;
}

test("config reports Stripe test mode; live keys are refused", () => {
  assert.deepEqual(stripeLib.stripeStatus(), { enabled: true, mode: "test" });
  const prev = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_live_should_be_refused";
  assert.equal(stripeLib.stripeStatus().enabled, false);
  process.env.STRIPE_SECRET_KEY = prev;
});

test("stripe checkout creates a pending order and a hosted session with exact amounts", async () => {
  const r = await stripeOrder();
  assert.match(r.body.checkoutUrl, /^https:\/\/checkout\.stripe\.com\//);
  assert.equal(r.body.order.status, "PENDING_PAYMENT");
  assert.equal(r.body.order.paymentStatus, "unpaid");
  const p = created.at(-1);
  assert.equal(p.mode, "payment");
  assert.equal(p.line_items[0].price_data.unit_amount, 18000);
  assert.equal(p.shipping_options[0].shipping_rate_data.fixed_amount.amount, 0);
  assert.ok(p.discounts[0].coupon);
  assert.equal(p.metadata.order_id, r.body.order.id);
  assert.ok(!JSON.stringify(p).includes("card_number"));
});

test("reaching the success page does NOT mark an order paid", async () => {
  const r = await stripeOrder();
  const g = await api(base, "GET", `/orders/${r.body.order.id}`, { headers: { "x-receipt-token": r.body.receiptToken } });
  assert.equal(g.body.receipt.status, "PENDING_PAYMENT");
  assert.equal(g.body.receipt.paymentProcessed, false);
});

test("webhook: bad signature rejected, valid event marks paid, duplicates are idempotent", async () => {
  const r = await stripeOrder();
  const oid = r.body.order.id;
  const sid = (await pool.query("SELECT stripe_session_id FROM shoes_orders WHERE id=$1", [oid])).rows[0].stripe_session_id;
  const ev = completed("evt_test_paid_1", oid, sid, 15300);

  assert.equal((await sendEvent(ev, "whsec_wrong")).status, 400);
  const noSig = await api(base, "POST", "/payments/stripe/webhook", { body: JSON.stringify(ev), headers: { "Content-Type": "application/json" } });
  assert.equal(noSig.status, 400);

  const ok = await sendEvent(ev);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.outcome, "paid");
  const row = (await pool.query("SELECT * FROM shoes_orders WHERE id=$1", [oid])).rows[0];
  assert.equal(row.status, "PAID");
  assert.equal(row.payment_status, "paid");

  const dup = await sendEvent(ev);
  assert.equal(dup.body.duplicate, true);
  assert.equal((await pool.query("SELECT COUNT(*)::int n FROM shoes_payment_events WHERE event_id='evt_test_paid_1'")).rows[0].n, 1);
  assert.equal((await api(base, "PATCH", `/orders/${oid}/cancel`, { headers: { "x-receipt-token": r.body.receiptToken } })).status, 409, "paid orders cannot be cancelled");
});

test("webhook: amount mismatch and session mismatch never mark paid", async () => {
  const r = await stripeOrder("");
  const oid = r.body.order.id;
  const sid = (await pool.query("SELECT stripe_session_id FROM shoes_orders WHERE id=$1", [oid])).rows[0].stripe_session_id;
  const bad = await sendEvent(completed("evt_test_amount", oid, sid, 100));
  assert.equal(bad.body.outcome, "amount_mismatch");
  const other = await sendEvent(completed("evt_test_session", oid, "cs_test_other", 18000));
  assert.equal(other.body.outcome, "session_mismatch");
  assert.equal((await pool.query("SELECT status FROM shoes_orders WHERE id=$1", [oid])).rows[0].status, "PENDING_PAYMENT");
});

test("webhook: expired session cancels and restocks; live events refused", async () => {
  const before = (await pool.query("SELECT stock FROM shoes_products WHERE id=2")).rows[0].stock;
  const r = await stripeOrder("");
  const oid = r.body.order.id;
  const sid = (await pool.query("SELECT stripe_session_id FROM shoes_orders WHERE id=$1", [oid])).rows[0].stripe_session_id;
  const exp = await sendEvent({ id: "evt_test_exp", type: "checkout.session.expired", livemode: false, data: { object: { id: sid, metadata: { order_id: oid } } } });
  assert.equal(exp.body.outcome, "expired");
  assert.equal((await pool.query("SELECT stock FROM shoes_products WHERE id=2")).rows[0].stock, before);
  const live = await sendEvent({ ...completed("evt_live", oid, sid, 18000), livemode: true });
  assert.equal(live.status, 400);
});

test("cancelling a pending Stripe order expires the session and restocks", async () => {
  const before = (await pool.query("SELECT stock FROM shoes_products WHERE id=2")).rows[0].stock;
  const r = await stripeOrder("");
  const c = await api(base, "PATCH", `/orders/${r.body.order.id}/cancel`, { headers: { "x-receipt-token": r.body.receiptToken } });
  assert.equal(c.status, 200);
  assert.equal(c.body.status, "CANCELLED");
  assert.equal((await pool.query("SELECT stock FROM shoes_products WHERE id=2")).rows[0].stock, before);
});
