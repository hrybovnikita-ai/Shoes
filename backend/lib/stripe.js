"use strict";
// Stripe Checkout (hosted payment page) in TEST MODE.
// - Enabled only when STRIPE_SECRET_KEY is set.
// - Live keys (sk_live_/rk_live_) are REFUSED unless the owner explicitly sets
//   STRIPE_LIVE_MODE_APPROVED=true after merchant onboarding.
// - Card data never touches the SHOES server: customers pay on Stripe's page.
// - Orders become "paid" only from a signature-verified webhook.

const log = require("./logger");

let stripeClient = null;
let testClient = null;

function keyMode(key = process.env.STRIPE_SECRET_KEY || "") {
  if (/^(sk|rk)_test_/.test(key)) return "test";
  if (/^(sk|rk)_live_/.test(key)) return "live";
  return key ? "unknown" : "none";
}

function stripeStatus() {
  const mode = keyMode();
  if (mode === "none") return { enabled: false, reason: "STRIPE_SECRET_KEY not set" };
  if (mode === "live" && process.env.STRIPE_LIVE_MODE_APPROVED !== "true") {
    return { enabled: false, reason: "Live Stripe key refused (live payments are not approved)" };
  }
  if (mode === "unknown") return { enabled: false, reason: "STRIPE_SECRET_KEY has an unexpected format" };
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return { enabled: false, reason: "STRIPE_WEBHOOK_SECRET not set (webhook verification is required)" };
  }
  return { enabled: true, mode };
}

function getStripe() {
  if (testClient) return testClient;
  if (!stripeStatus().enabled) return null;
  if (!stripeClient) {
    const Stripe = require("stripe");
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 15000 });
  }
  return stripeClient;
}

// Signature verification works offline; it only needs the webhook secret.
function constructWebhookEvent(rawBody, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
  const Stripe = require("stripe");
  return Stripe.webhooks.constructEvent(rawBody, signature, secret);
}

async function createCheckoutSession({ order, lines, totals, successUrl, cancelUrl }) {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  let discounts;
  if (totals.discountCents > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: totals.discountCents,
      currency: "usd",
      duration: "once",
      max_redemptions: 1,
      name: `${totals.promoCode} (${totals.promoPercent}% off)`,
      metadata: { order_id: order.id },
    });
    discounts = [{ coupon: coupon.id }];
  }
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: order.id,
      customer_email: order.customer_email,
      line_items: lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: "usd",
          unit_amount: l.unitPriceCents,
          product_data: {
            name: `${l.name} — EU ${l.size}${l.color ? ` / ${l.color}` : ""}`,
            ...(l.image && /^https:\/\//.test(l.image) ? { images: [l.image] } : {}),
          },
        },
      })),
      ...(discounts ? { discounts } : {}),
      shipping_options: [
        {
          shipping_rate_data: {
            display_name: totals.shippingCents === 0 ? "Free shipping" : "Standard shipping",
            type: "fixed_amount",
            fixed_amount: { amount: totals.shippingCents, currency: "usd" },
          },
        },
      ],
      metadata: { order_id: order.id },
      payment_intent_data: { metadata: { order_id: order.id } },
      success_url: successUrl,
      cancel_url: cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    },
    { idempotencyKey: `shoes-checkout-${order.id}` }
  );
  return session;
}

async function expireSession(sessionId) {
  const stripe = getStripe();
  if (!stripe || !sessionId) return null;
  try {
    return await stripe.checkout.sessions.expire(sessionId);
  } catch (err) {
    log.warn("stripe.expire_failed", { error: err });
    throw err;
  }
}

function __setStripeForTests(client) {
  if (process.env.NODE_ENV !== "test") throw new Error("Only allowed when NODE_ENV=test");
  testClient = client;
}

module.exports = { stripeStatus, getStripe, constructWebhookEvent, createCheckoutSession, expireSession, keyMode, __setStripeForTests };
