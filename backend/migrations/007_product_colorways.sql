-- 007: product detail columns for the Nike colorway catalog.
-- Additive only: new nullable columns + a partial unique index. Existing rows
-- keep NULL in every new column, so the original catalog is unchanged.

ALTER TABLE shoes_products ADD COLUMN IF NOT EXISTS style_code TEXT;
ALTER TABLE shoes_products ADD COLUMN IF NOT EXISTS colorway TEXT;
ALTER TABLE shoes_products ADD COLUMN IF NOT EXISTS description TEXT;
-- Available EU sizes. NULL = the store-wide EU 36–46 range (legacy behaviour).
ALTER TABLE shoes_products ADD COLUMN IF NOT EXISTS sizes INTEGER[];

-- One row per official Nike style code: the same release can never be
-- inserted twice (seed uses ON CONFLICT DO NOTHING against this index).
CREATE UNIQUE INDEX IF NOT EXISTS shoes_products_style_code_key
  ON shoes_products (upper(style_code))
  WHERE style_code IS NOT NULL;

-- Case-insensitive color filter.
CREATE INDEX IF NOT EXISTS idx_shoes_products_color_lower
  ON shoes_products (lower(color));
