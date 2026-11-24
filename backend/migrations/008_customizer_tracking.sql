CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE shoes_products
  ADD COLUMN IF NOT EXISTS customizable BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE shoes_products SET customizable = TRUE WHERE id IN (1, 2, 3, 4, 5);

CREATE TABLE IF NOT EXISTS shoes_custom_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES shoes_users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES shoes_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  design JSONB NOT NULL,
  surcharge_cents INTEGER NOT NULL DEFAULT 0 CHECK (surcharge_cents >= 0 AND surcharge_cents <= 50000),
  preview JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shoes_designs_user ON shoes_custom_designs(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS shoes_designs_product ON shoes_custom_designs(product_id);

ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'order_confirmed';
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMPTZ;
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS tracking_provider TEXT;
ALTER TABLE shoes_orders ADD COLUMN IF NOT EXISTS tracking_simulated BOOLEAN NOT NULL DEFAULT FALSE;

DO $$ BEGIN
  ALTER TABLE shoes_orders ADD CONSTRAINT shoes_orders_fulfillment_status_chk
    CHECK (fulfillment_status IN (
      'order_confirmed', 'processing', 'packed', 'shipped',
      'out_for_delivery', 'delivered', 'cancelled'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS shoes_order_status_events (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES shoes_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT,
  actor_user_id BIGINT REFERENCES shoes_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shoes_order_events_order ON shoes_order_status_events(order_id, created_at);