# Payments

## Providers
* **Demo checkout** (default, always available). Labelled "Demo — no real payment".
  Creates a real order with `payment_provider='demo'`, `payment_status='demo'`. No money moves.
* **Stripe Checkout, TEST MODE** — enabled only when the backend has both
  `STRIPE_SECRET_KEY` (`sk_test_…`) and `STRIPE_WEBHOOK_SECRET`.
  Live keys (`sk_live_…`) are refused unless `STRIPE_LIVE_MODE_APPROVED=true`
  — do not set that without an explicit decision.
* Lemon Squeezy is **not** used (merchant-of-record for digital goods; not suitable
  for physical sneakers without confirming eligibility).

SHOES never receives card numbers or CVV: the customer pays on Stripe's hosted page
(Apple Pay / Google Pay appear there automatically when the device supports them).

## Pricing (shared, integer cents)
`backend/lib/pricing.js` (CommonJS) and `frontend/src/lib/pricing.js` (ESM) are
identical; a parity test enforces it. The **backend re-prices every order** from the
database — client prices/totals are ignored.

* Promo codes: `SHOES10` = 10 %, `WELCOME15` = 15 % (case-insensitive, one per order).
* Discount = `round(subtotal × pct / 100)` in cents.
* **Shipping is decided on the pre-discount subtotal**: free when the subtotal is
  ≥ $150.00, otherwise $10.00. (A $160 cart with WELCOME15 still ships free.)
* Total = subtotal − discount + shipping.

## Order lifecycle (Stripe)
1. `POST /api/orders` with `paymentMethod: "stripe"` → order `PENDING_PAYMENT`,
   stock reserved, a Checkout Session is created (idempotency key `shoes-checkout-<orderId>`,
   `metadata.order_id`) → browser redirects to Stripe.
2. The **webhook is the only thing that marks an order paid**:
   `POST /api/payments/stripe/webhook` (raw body, signature verified with `STRIPE_WEBHOOK_SECRET`).
   * `checkout.session.completed` (payment_status=paid) / `async_payment_succeeded` → `PAID`
     — only if amount, currency and session id match the order.
   * `async_payment_failed` → `CANCELLED`, `checkout.session.expired` → `EXPIRED`; stock is restored.
   * Every event id is stored in `shoes_payment_events`; replays are no-ops (idempotent).
3. The success page polls the order and shows "Waiting for payment confirmation" until the webhook lands.
4. Cancelling on Stripe returns to `/checkout?cancelled=<id>`; the pending order is cancelled and the session expired.

## Set up Stripe test mode
1. Stripe Dashboard → toggle **Test mode** → Developers → API keys → copy `sk_test_…`.
2. Developers → Webhooks → Add endpoint:
   `https://<your-backend-domain>/api/payments/stripe/webhook`
   Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`. Copy the signing secret `whsec_…`.
3. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on the backend (Vercel project **shoes-backend**), redeploy.
4. Local: `stripe listen --forward-to localhost:5000/api/payments/stripe/webhook` and use the printed `whsec_…`.
5. Pay with test card `4242 4242 4242 4242`, any future date, any CVC.

## What was tested
* Webhook signature verification, amount/currency checks, idempotent replays, expiry/failure
  restocking and cancel → session expiry: unit/API tests using Stripe's real
  `generateTestHeaderString` + `constructEvent` and a fake Stripe client.
* **Not tested:** the real hosted Stripe Checkout page and a real Stripe test-mode
  round trip — no Stripe test keys were available. Do this once you add keys (steps above).
