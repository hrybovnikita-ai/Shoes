# Database migrations

Plain SQL files in `backend/migrations/`, applied in order by `backend/lib/migrate.js`.
All are **additive** (CREATE … IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / backfills);
nothing is dropped, renamed or reset. Applied files are recorded in
`shoes_schema_migrations` with a checksum; a changed applied file aborts the run.
A Postgres advisory lock prevents concurrent runners.

| File | What it does |
|---|---|
| `001_baseline.sql` | The schema the old `initDb()` created (idempotent; a no-op on the current DB) |
| `002_users_and_order_details.sql` | `shoes_users`; new order columns (user_id, discount, promo_code, phone, shipping_address, delivery_method, payment_*, stripe_*, paid_at, cancelled_at, updated_at); backfills users from existing `firebase_uid` orders and sets `user_id` |
| `003_payment_events.sql` | `shoes_payment_events` (Stripe webhook idempotency) |
| `004_favorites_reviews_claims.sql` | `shoes_favorites`, `shoes_reviews`, `shoes_order_claims` |
| `005_newsletter.sql` | `shoes_newsletter_subscribers` |

**None of these were run against the production database.** They were run against a
local Postgres 17, including a test that builds the *old* schema with data and
upgrades it, checking that every existing row survives.

## What you run (owner)
Recommended: first against a **Neon branch** of production, then production.

```bash
cd backend
npm install
# point DATABASE_URL at the Neon branch (in your shell or backend/.env)
npm run migrate:status     # lists applied / pending
npm run migrate:dry-run    # lists the files that would be applied; read-only
npm run migrate            # applies pending migrations in one transaction each
npm run migrate:status     # should show 5 applied, 0 pending
```
Then repeat with the production `DATABASE_URL` once you are happy, **before**
deploying this branch to production. `GET /api/health` reports `pendingMigrations`.

Notes
* The server never auto-migrates unless `AUTO_MIGRATE=true`; the Vercel function
  (`backend/api/index.js`) never migrates.
* `npm run seed` only inserts missing demo products (`ON CONFLICT DO NOTHING`).
* Take a Neon backup/branch before migrating production.
