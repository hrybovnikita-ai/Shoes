# Clerk authentication (production setup)

Firebase remains supported for **legacy SHOES accounts**. Clerk is the **primary sign-in UI** when `VITE_CLERK_PUBLISHABLE_KEY` is set. Both providers map to `shoes_users` on the server; the browser never decides `user_id`.

## Architecture audit summary

| Layer | Implementation |
|---|---|
| Frontend SDK | `@clerk/react` — `ClerkProvider` in `auth/ClerkRoot.jsx` (lazy-loaded) |
| Sign-in UI | `SignIn` / `SignUp` on `/login` and `/register` (`auth/ClerkAuthPanel.jsx`) |
| Legacy sign-in | Firebase forms at `/login?method=firebase` |
| API tokens | `Authorization: Bearer <Firebase ID token or Clerk session JWT>` |
| Backend verify | `backend/lib/auth.js` — `firebase-admin` + `@clerk/backend` `verifyToken` |
| User rows | `shoes_users.firebase_uid`, `shoes_users.clerk_user_id` (unique, additive migration `002`) |
| Webhooks | `POST /api/webhooks/clerk` — signed, idempotent sync (`user.created`, `user.updated`, `user.deleted`) |
| Account linking | **Manual only** — `POST /api/me/link-identity` with tokens from **both** providers |
| Admin | `shoes_users.role` — checked server-side on `/api/admin/*` |

**Not done automatically:** linking by e-mail, merging duplicate profiles, or deleting user rows.

## Environment variables

### Frontend (`frontend/.env.local`)

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_…
```

Never put `sk_` or webhook secrets in the frontend.

### Backend (`backend/.env`)

```env
CLERK_SECRET_KEY=sk_test_…
CLERK_PUBLISHABLE_KEY=pk_test_…          # optional mirror for scripts
CLERK_WEBHOOK_SIGNING_SECRET=whsec_…
CLERK_AUTHORIZED_PARTIES=http://localhost:5173,https://your-production-domain
```

Also keep existing `FIREBASE_PROJECT_ID` / `GOOGLE_APPLICATION_CREDENTIALS` for legacy tokens.

`GET /api/config` returns `features.clerkAuth` and `features.firebaseAuth`.

## Clerk Dashboard checklist

1. Create application (Development first).
2. **User & authentication** → enable Email + Password, Google OAuth, e-mail verification, password reset.
3. **Domains** → allow your frontend origins (same as `CLERK_AUTHORIZED_PARTIES`).
4. **Webhooks** → endpoint `https://<api-host>/api/webhooks/clerk`, subscribe to `user.created`, `user.updated`, `user.deleted`; copy **Signing secret** to `CLERK_WEBHOOK_SIGNING_SECRET`.

For local webhooks use [Clerk CLI](https://clerk.com/docs/guides/development/webhooks/syncing#with-a-local-tunnel) or ngrok → `http://localhost:5000/api/webhooks/clerk`.

## Migrate existing Firebase users

1. Deploy backend + migrations (no DB reset).
2. Turn on Clerk env vars; users sign up / sign in with Clerk (new `clerk_user_id` row).
3. In **My Account → Security**, user signs in once with the **legacy Firebase** method and calls **Link accounts** — proves both identities.
4. Orders, favorites, reviews, carts, and commerce data move to the surviving row per server rules in `linkIdentity`.

## If credentials are missing

The app runs in **Firebase-only** mode (current default for this repo). Clerk UI and webhooks stay disabled until keys are set — no placeholder keys are shipped.

## Verification commands

```bash
cd frontend && npm run lint && npm run build
cd backend && npm test
```

After changing dependencies, **restart the Vite dev server** (stale HMR can show a white screen if a module failed to resolve once).