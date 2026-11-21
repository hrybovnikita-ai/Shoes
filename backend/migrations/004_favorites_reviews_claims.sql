-- 004: account favorites, product reviews and guest-order claim codes.

CREATE TABLE IF NOT EXISTS shoes_favorites (
  user_id BIGINT NOT NULL REFERENCES shoes_users(id),
  product_id INTEGER NOT NULL REFERENCES shoes_products(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS shoes_reviews (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES shoes_products(id),
  user_id BIGINT NOT NULL REFERENCES shoes_users(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  author_name TEXT NOT NULL,
  verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_shoes_reviews_product ON shoes_reviews (product_id, created_at DESC);

-- One-time codes e-mailed to a guest order's address so a signed-in user can
-- prove they own that order before it is attached to their account.
CREATE TABLE IF NOT EXISTS shoes_order_claims (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES shoes_orders(id),
  user_id BIGINT NOT NULL REFERENCES shoes_users(id),
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shoes_order_claims_order ON shoes_order_claims (order_id, created_at DESC);
