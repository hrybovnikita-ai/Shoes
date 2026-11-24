-- 005: newsletter sign-ups from the storefront footer (e-mail only).
CREATE TABLE IF NOT EXISTS shoes_newsletter_subscribers (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'footer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shoes_newsletter_email ON shoes_newsletter_subscribers (lower(email));
