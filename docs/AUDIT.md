# SHOES audit & upgrade notes (branch `feature/full-stack-upgrade`)

The existing app was kept and extended — not rebuilt. Black / white / neon-green
`#b7ff35` identity preserved; a light theme now actually works.

## Root cause: "My Orders shows 0"
`frontend/src/api.js` defined `createOrder(customer, items)` while `CheckoutPage`
called `createOrder(customer, items, firebaseToken)`. The third argument was silently
dropped, so **no `Authorization` header was ever sent**; the backend's optional-auth
middleware saw a guest and stored every order with `firebase_uid = NULL`.
`GET /api/me/orders` filters by the signed-in UID, so it correctly returned nothing.
(The promo code was also sent inside `customer`, where the backend ignored it, so
discounts were never applied server-side.)

Fix: the API client now attaches the token; orders get `user_id` (+ `firebase_uid`);
My Orders queries `user_id = me OR (user_id IS NULL AND firebase_uid = my uid)`.
Historical guest orders (NULL owner) are **not** auto-attached — the user can claim
one only with a 6-digit code e-mailed to the order's address (requires Resend; the
endpoint returns 503 until e-mail is configured).

## Other bugs fixed
| Area | Bug |
|---|---|
| backend/email.js | File was empty → `sendOrderConfirmation` undefined; implemented with Resend (no-op if not configured) |
| backend/db.js | SSL forced for `127.0.0.1` / `sslmode=disable` → local DBs could not connect |
| backend | Prices/totals trusted from client in places; now re-priced server-side in integer cents with row locks + stock checks |
| backend | No rate limiting, no structured logs, no security headers, migrations ran implicitly on boot |
| frontend/index.html | **No `<meta name="viewport">`** → mobile browsers rendered the desktop layout zoomed out |
| frontend/firebase.js | Threw at import when env was missing → white screen |
| AccountPage | Ignored favorites props; spread a Firebase `User` (lost methods) |
| Cart | Dedupe ignored color; legacy `shoes_cart` key now migrated to `shoes-cart-v2` |
| Favorites | Key `shoes-favorites-v2` preserved; now shared across pages/tabs and synced to the server when signed in |
| SuccessPage | Cart cleared only when clicking "continue"; now after the order is confirmed |
| Styles | Light theme broken by hard-coded dark colors; 3-column benefits grid for 4 items; footer overflowed at 320 px |
| Newsletter | Fake "subscribed" message; now stored (`shoes_newsletter_subscribers`) |
| Footer | Instagram/Pinterest links pointed at generic homepages; removed |
| Lint | `react-hooks/set-state-in-effect` errors in ProductPage/SuccessPage (eslint now clean) |
| AuthPage | `console.log` of user UIDs removed; verification e-mail sent on register |

## Features added
Search suggestions, category/brand/price/in-stock filters, sorts (incl. best-selling
from real orders), stock indicators, recently viewed, related products, real reviews
(verified-purchase badge, one per user), toasts, skeletons, error boundary, empty
states, mobile nav, theme persistence, SEO meta + JSON-LD + robots.txt, lazy images
& lazy routes, accessible labels/focus states, checkout field validation, promo codes,
free-shipping progress bar, order detail cards, PDF receipts, order cancel (restocks),
account dashboard (overview, orders, claim, favorites, profile, security/linking,
preferences), Stripe test-mode checkout, Clerk opt-in. See `PAYMENTS.md`,
`CLERK_SETUP.md`, `MIGRATIONS.md`, `TESTING.md`.

## Security / privacy
* Every `/api/me/*` route verifies the token on the server; order access is owner or
  per-order receipt token only; cross-user access returns 403.
* Rate limits per route group; JSON logs; keys like authorization, token, secret, password, api key, database_url, card, cvv are redacted.
* No card data ever reaches the server (Stripe hosted Checkout).
* No credentials in the repo; `.env.example` files contain names only.

## Known remaining issues
* Real Stripe hosted checkout and real Clerk sign-in untested (no keys available).
* Guest-order claim needs `RESEND_API_KEY` + `EMAIL_FROM` with a verified domain.
* Rate limiter is in-memory (per serverless instance); use a shared store if abuse appears.
* Product catalog is still seeded demo data; `frontend/src/data/catalog.js` is the offline fallback.
* `backend/server.backup.js` is the owner's file, kept unchanged.
