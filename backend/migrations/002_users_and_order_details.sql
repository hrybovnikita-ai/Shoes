-- 002: internal users table (Firebase + Clerk identity mapping) and richer
-- order details. ADDITIVE ONLY: no column is dropped, renamed or rewritten.

CREATE TABLE IF NOT EXISTS shoes_users (
  id BIGSERIAL PRIMARY KEY,
  firebase_uid TEXT UNIQUE,
  clerk_user_id TEXT UNIQUE,
  email TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  display_name TEXT,
  avatar_url TEXT,
  -- set when a user explicitly links two sign-ins and this row was folded
  -- into another one; the row is kept (never deleted) for auditability.
  merged_into BIGINT REFERENCES shoes_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shoes_users_email ON shoes_users (lower(email));

ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES shoes_users(id);
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS promo_code TEXT;
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS delivery_method TEXT;
-- 'demo' = demo checkout, no money moved (all orders created before this migration)
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'demo';
-- demo | unpaid | paid | failed | expired
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'demo';
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shoes_orders_stripe_session
  ON shoes_orders (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shoes_orders_user
  ON shoes_orders (user_id, created_at DESC);

-- Backfill: one internal user per Firebase UID that already owns orders,
-- then point those orders at it. Ownership does not change (the same
-- Firebase UID still owns the same orders); no guest order is touched.
INSERT INTO shoes_users (firebase_uid, email)
SELECT DISTINCT ON (firebase_uid) firebase_uid, lower(customer_email)
FROM shoes_orders
WHERE firebase_uid IS NOT NULL
ORDER BY firebase_uid, created_at DESC
ON CONFLICT (firebase_uid) DO NOTHING;

UPDATE shoes_orders o
SET user_id = u.id
FROM shoes_users u
WHERE o.user_id IS NULL
  AND o.firebase_uid IS NOT NULL
  AND o.firebase_uid = u.firebase_uid;
