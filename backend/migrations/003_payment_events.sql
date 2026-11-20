-- 003: processed payment-provider webhook events, for idempotency.
CREATE TABLE IF NOT EXISTS shoes_payment_events (
  event_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'stripe',
  type TEXT NOT NULL,
  order_id TEXT,
  livemode BOOLEAN NOT NULL DEFAULT FALSE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
