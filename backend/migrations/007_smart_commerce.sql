-- Additive upgrade. Existing stock stays unallocated until an admin assigns it.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
ALTER TABLE shoes_products ADD COLUMN inventory_managed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE shoes_products ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE shoes_variants (
 id BIGSERIAL PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES shoes_products(id),
 size NUMERIC(4,1) NOT NULL CHECK(size BETWEEN 20 AND 55),
 color TEXT NOT NULL CHECK(length(color) BETWEEN 1 AND 40),
 stock INTEGER NOT NULL CHECK(stock >= 0), version INTEGER NOT NULL DEFAULT 1,
 UNIQUE(product_id,size,color)
);
CREATE TABLE shoes_reservations (
 id UUID PRIMARY KEY, user_id BIGINT REFERENCES shoes_users(id), fingerprint TEXT NOT NULL,
 items JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','released','expired','consumed')),
 expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 order_id TEXT UNIQUE REFERENCES shoes_orders(id)
);
CREATE INDEX shoes_reservation_expiry ON shoes_reservations(expires_at) WHERE status='active';
CREATE TABLE shoes_reservation_lines (
 reservation_id UUID REFERENCES shoes_reservations(id), product_id INTEGER REFERENCES shoes_products(id),
 variant_id BIGINT REFERENCES shoes_variants(id), quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 100),
 PRIMARY KEY(reservation_id,product_id,variant_id)
);
-- Legacy reservations use the JSON items; managed stock additionally uses variant lines.
CREATE INDEX shoes_reservation_variant ON shoes_reservation_lines(variant_id);
CREATE TABLE shoes_size_charts (
 brand TEXT NOT NULL, eu NUMERIC(4,1) NOT NULL, us NUMERIC(4,1) NOT NULL,
 uk NUMERIC(4,1) NOT NULL, foot_cm NUMERIC(4,1) NOT NULL CHECK(foot_cm BETWEEN 15 AND 40),
 source TEXT NOT NULL, PRIMARY KEY(brand,eu)
);
-- Generic adult approximation, explicitly labelled; never represented as a brand chart.
INSERT INTO shoes_size_charts(brand,eu,us,uk,foot_cm,source) VALUES
 ('generic',36,4,3,22.5,'Approximate adult sizing; US men / unisex'),
 ('generic',37,5,4,23.5,'Approximate adult sizing; US men / unisex'),
 ('generic',38,6,5,24,'Approximate adult sizing; US men / unisex'),
 ('generic',39,6.5,5.5,24.5,'Approximate adult sizing; US men / unisex'),
 ('generic',40,7,6,25,'Approximate adult sizing; US men / unisex'),
 ('generic',41,8,7,26,'Approximate adult sizing; US men / unisex'),
 ('generic',42,9,8,26.5,'Approximate adult sizing; US men / unisex'),
 ('generic',43,10,9,27.5,'Approximate adult sizing; US men / unisex'),
 ('generic',44,10.5,9.5,28,'Approximate adult sizing; US men / unisex'),
 ('generic',45,11.5,10.5,29,'Approximate adult sizing; US men / unisex'),
 ('generic',46,12,11,29.5,'Approximate adult sizing; US men / unisex');
CREATE TABLE shoes_size_preferences (
 user_id BIGINT REFERENCES shoes_users(id), brand TEXT NOT NULL,
 eu NUMERIC(4,1) NOT NULL CHECK(eu BETWEEN 20 AND 55),
 foot_cm NUMERIC(4,1) CHECK(foot_cm BETWEEN 15 AND 40),
 system TEXT NOT NULL CHECK(system IN ('EU','US','UK')), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(user_id,brand)
);
CREATE TABLE shoes_price_history (
 id BIGSERIAL PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES shoes_products(id),
 price NUMERIC(10,2) NOT NULL CHECK(price>=0), previous_price NUMERIC(10,2),
 recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX shoes_price_timeline ON shoes_price_history(product_id,recorded_at DESC);
INSERT INTO shoes_price_history(product_id,price) SELECT id,price FROM shoes_products;
CREATE TABLE shoes_price_alerts (
 id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES shoes_users(id),
 product_id INTEGER NOT NULL REFERENCES shoes_products(id), target_price NUMERIC(10,2) NOT NULL CHECK(target_price>0),
 active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id,product_id)
);
CREATE TABLE shoes_price_notifications (
 id BIGSERIAL PRIMARY KEY, alert_id BIGINT NOT NULL REFERENCES shoes_price_alerts(id),
 history_id BIGINT NOT NULL REFERENCES shoes_price_history(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 email_status TEXT NOT NULL DEFAULT 'pending', first_attempt_at TIMESTAMPTZ,
 email_payload JSONB, sent_at TIMESTAMPTZ, UNIQUE(alert_id,history_id)
);
CREATE TABLE shoes_commerce_outbox (
 id BIGSERIAL PRIMARY KEY, product_id INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE FUNCTION shoes_product_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
   INSERT INTO shoes_price_history(product_id,price) VALUES(NEW.id,NEW.price);
 ELSIF NEW.price IS DISTINCT FROM OLD.price THEN
   INSERT INTO shoes_price_history(product_id,price,previous_price) VALUES(NEW.id,NEW.price,OLD.price);
 END IF;
 INSERT INTO shoes_commerce_outbox(product_id) VALUES(NEW.id);
 RETURN NEW;
END $$;
CREATE TRIGGER shoes_product_change AFTER INSERT OR UPDATE ON shoes_products FOR EACH ROW EXECUTE FUNCTION shoes_product_changed();
CREATE FUNCTION shoes_variant_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO shoes_commerce_outbox(product_id) VALUES(NEW.product_id);
 RETURN NEW;
END $$;
CREATE TRIGGER shoes_variant_change AFTER INSERT OR UPDATE ON shoes_variants FOR EACH ROW EXECUTE FUNCTION shoes_variant_changed();
INSERT INTO shoes_commerce_outbox(product_id) SELECT id FROM shoes_products;
CREATE INDEX shoes_product_text ON shoes_products USING gin ((lower(name || ' ' || brand || ' ' || category)) gin_trgm_ops);
