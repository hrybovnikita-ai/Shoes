# Testing

All tests run against **local** services only. The test helper refuses any database
whose name does not end in `_test` or whose host is not local.

## Backend (node:test)
```bash
# Postgres 17 locally, a database named shoes_test
cd backend
TEST_DATABASE_URL=postgres://USER@127.0.0.1:5432/shoes_test npm test
npm run check   # syntax check of every backend file
```
Covers pricing (incl. frontend/backend parity), migrations (legacy DB upgrade keeps
data), auth isolation, orders, cancel, receipts, favorites, reviews, linking, claims,
newsletter, rate limiting and Stripe webhooks (real signature verification with
`generateTestHeaderString`, fake Stripe client).

## Frontend
```bash
cd frontend && npx eslint . && npm run build
```

## End-to-end (Playwright) — `e2e/run-e2e.mjs`
Needs: Firebase Auth emulator (`firebase emulators:start --only auth --project demo-shoes`),
backend with `FIREBASE_PROJECT_ID=demo-shoes FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`
and a migrated+seeded local DB on port 5000, and the frontend built with
`VITE_FIREBASE_PROJECT_ID=demo-shoes VITE_FIREBASE_API_KEY=fake-api-key VITE_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 …`
served by `vite preview` (port 4173, proxies `/api`).
```bash
cd e2e && npm install && npx playwright install chromium && npm test
```
Flows: catalog, search suggestions, product → cart, promo, checkout validation,
guest demo order, PDF receipt, register, favorites → account, signed-in order shows
in My Orders (guest order does not), cancel, logout, 404, and screenshots at
320/390/768/1024/1440 with a horizontal-overflow check.

## CI
A GitHub Actions workflow is ready at `docs/ci/ci.yml` (backend tests on a Postgres
service + frontend lint/build). It is not in `.github/workflows/` because the token
used to push this branch lacks the `workflow` scope. To enable it:
`mkdir -p .github/workflows && git mv docs/ci/ci.yml .github/workflows/ci.yml`, commit, push.

## Visual QA screenshots (glass redesign)

With the same local stack as the e2e suite running (preview on :4173, local backend, Firebase Auth emulator):

```bash
cd e2e && node glass-shots.mjs
```

Writes `shoes-glass-*.png` (390 / 768 / 1440) to `$E2E_SHOTS_DIR` (default `/workspace/shots`): home, catalog, product,
login, account (overview / orders / favorites), cart drawer, checkout, mobile nav, account dropdown, a
`prefers-reduced-transparency: reduce` fallback and the light theme. It also reports horizontal overflow at 390px and
console errors. It is paced to stay under the local backend's read rate limit. It refuses to run against anything other than localhost.
