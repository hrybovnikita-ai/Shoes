ALTER TABLE shoes_products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE shoes_products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE shoes_products ADD COLUMN IF NOT EXISTS materials TEXT;
ALTER TABLE shoes_products ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE shoes_products ADD COLUMN IF NOT EXISTS colors JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE shoes_products ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE shoes_products ADD COLUMN IF NOT EXISTS size_eu JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE shoes_products ADD COLUMN IF NOT EXISTS size_us JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE shoes_products ADD COLUMN IF NOT EXISTS size_uk JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS shoes_products_slug_uidx ON shoes_products(slug) WHERE slug IS NOT NULL;