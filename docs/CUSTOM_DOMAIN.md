# Custom domain: `shoes.is-a.dev`

Prepares SHOES for **dual frontends** without dropping the existing Vercel URL.

| URL | Role |
|---|---|
| `https://shoes-red-alpha.vercel.app` | Current production (keep) |
| `https://shoes.is-a.dev` | Custom domain (after is-a.dev PR merge) |

No database reset. Users, orders, favorites, and Neon data are unchanged.

## Built-in backend allowlist (`backend/cors.js`)

These browser origins are allowed **without** setting `CORS_ORIGINS`:

- `https://shoes-red-alpha.vercel.app`
- `https://shoes.is-a.dev`
- Local Vite ports (`localhost` / `127.0.0.1` on 5173–5175, 4173)

API auth uses **Bearer tokens**, not cookies (`Access-Control-Allow-Credentials` is not set).

## Production environment variables (examples only)

Set these in **Vercel → Backend project** after you deploy this commit (values are placeholders).

### Backend (Vercel / Neon)

```env
DATABASE_URL=postgresql://…@…neon.tech/…?sslmode=require
FRONTEND_URL=https://shoes-red-alpha.vercel.app,https://shoes.is-a.dev
CORS_ORIGINS=
CLERK_AUTHORIZED_PARTIES=http://localhost:5173,http://127.0.0.1:5173,https://shoes-red-alpha.vercel.app,https://shoes.is-a.dev
FIREBASE_PROJECT_ID=your-firebase-project-id
CLERK_SECRET_KEY=sk_live_…or_sk_test_…
CLERK_WEBHOOK_SIGNING_SECRET=whsec_…
```

Notes:

- `CLERK_AUTHORIZED_PARTIES` is **unioned** with built-in HTTPS origins in `backend/lib/auth.js` so both production domains accept Clerk session JWTs even if one URL is omitted. In **`NODE_ENV=production`**, `localhost` / `127.0.0.1` entries from env are **dropped** (dev parties must not be trusted in production).
- `FRONTEND_URL` drives Stripe checkout `successUrl` / `cancelUrl` when the request has no `Origin` header; when `Origin` is present, any **CORS-allowed** origin is used (`frontendOrigin` in `controllers.js`).
- Neon: keep the same `DATABASE_URL`; only CORS/Clerk/front URLs change.

### Frontend (Vercel)

```env
VITE_API_URL=https://<your-backend-host>.vercel.app/api
VITE_SOCKET_URL=https://<your-backend-host>.vercel.app
VITE_CLERK_PUBLISHABLE_KEY=pk_live_…or_pk_test_…
VITE_FIREBASE_API_KEY=…
VITE_FIREBASE_AUTH_DOMAIN=…
VITE_FIREBASE_PROJECT_ID=…
VITE_FIREBASE_APP_ID=…
```

Use the **same** frontend env on both domains (Vercel serves one deployment to all attached domains).

## Clerk Dashboard (after DNS is live)

1. **Configure → Domains**  
   Add **Satellite** or **primary** domains as required by your Clerk plan:  
   `shoes-red-alpha.vercel.app`, `shoes.is-a.dev`.

2. **User & authentication → Social connections**  
   Ensure Google OAuth redirect URLs include both frontends (Clerk usually manages this per domain).

3. **Webhooks**  
   Point to production API only, e.g. `https://<backend>/api/webhooks/clerk`  
   Events: `user.created`, `user.updated`, `user.deleted`.  
   Signing secret → backend `CLERK_WEBHOOK_SIGNING_SECRET`.

4. **Authorized parties**  
   Match `CLERK_AUTHORIZED_PARTIES` above for local dev; HTTPS production hosts are also enforced in code.

5. **Production instance**  
   When moving from `pk_test_` / `sk_test_` to live keys, update **both** Vercel projects in one maintenance window (no key rotation in this prep commit).

## Firebase Console

1. **Authentication → Settings → Authorized domains**  
   Add `shoes.is-a.dev` ( `shoes-red-alpha.vercel.app` is typically auto-allowed on Vercel ).

2. Keep existing Firebase users; linking to Clerk remains manual via **Link accounts**.

## Vercel Dashboard (after is-a.dev PR merge)

1. **Frontend project → Settings → Domains**  
   Add `shoes.is-a.dev` → wait until **Valid** (A record `216.198.79.1`, TXT on `_vercel` from register repo).

2. **Keep** `shoes-red-alpha.vercel.app` attached (do not remove).

3. **Backend project**  
   No new domain required unless you want a custom API hostname; CORS already allows both frontends.

4. Redeploy backend + frontend after env updates so builds pick up new values.

## Security checklist (no code changes required)

| Topic | SHOES behavior |
|---|---|
| Cookies / CSRF | API is stateless JWT (Firebase/Clerk); no session cookies on API |
| SameSite / Secure | Clerk/Firebase handle auth cookies on their domains; app stores receipt tokens in `sessionStorage` where used |
| CORS | Explicit allowlist; unknown origins get no `Access-Control-Allow-Origin` |
| Redirects | Stripe return URLs use validated `Origin` or configured `FRONTEND_URL` |

## Blockers (outside this repo)

1. Merge [is-a-dev/register#62772](https://github.com/is-a-dev/register/pull/62772) (maintainer).
2. DNS A + TXT propagation for `shoes.is-a.dev`.
3. Vercel domain verification.
4. Your approval to update **production** Vercel env and redeploy.

## Verify after go-live

```bash
curl -sI -H "Origin: https://shoes.is-a.dev" https://<backend>/api/health
# Expect Access-Control-Allow-Origin: https://shoes.is-a.dev

cd frontend && npm run lint && npm run build
cd backend && npm test
```

Browser: sign in (Clerk + Firebase legacy), favorites, checkout, My Account from **both** URLs.