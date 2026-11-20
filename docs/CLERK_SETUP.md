# Clerk setup (optional, additive)

Firebase Authentication is and stays the **default** SHOES sign-in. Clerk is an
opt-in second provider behind a compatibility layer. With no Clerk env vars the
app behaves exactly as Firebase-only (verified by the test suite and e2e run).

## How it works

| Layer | Firebase | Clerk |
|---|---|---|
| Frontend | `src/firebase.js` + `auth/AuthContext.jsx` | `auth/ClerkRoot.jsx` (lazy chunk, loaded only when `VITE_CLERK_PUBLISHABLE_KEY` is set) |
| Token sent to API | Firebase ID token | Clerk session JWT |
| Backend verification | `firebase-admin` `verifyIdToken` | `@clerk/backend` `verifyToken` (+ `authorizedParties`) |
| Routing | token `iss` = `https://securetoken.google.com/<project>` | any other issuer |

Both providers map onto one internal table, `shoes_users`
(`firebase_uid`, `clerk_user_id`). Every protected route resolves the caller to a
`shoes_users.id` on the server; the frontend never decides who owns data.

## Account linking — never silent

* Signing in with Clerk using the same e-mail as an existing Firebase account does
  **not** merge anything. It creates a separate, empty Clerk profile.
* Linking happens only through **Account → Security → Link accounts**, which calls
  `POST /api/me/link-identity` with a fresh token from the *other* provider. The user
  therefore proves ownership of **both** sign-ins (password / Google re-auth).
* When both sides already have a profile, the Clerk-only profile is folded into the
  Firebase one (orders, favorites, reviews move over). The folded row is **kept**
  with `merged_into` set — nothing is deleted. If both sides carry legacy Firebase
  data the request is refused (409) for manual review.
* No account is ever unlinked or deleted by code.

## Enable it

1. Create a Clerk application (Development instance first) at https://dashboard.clerk.com.
   Enable the sign-in methods you want (e-mail, Google…).
2. Frontend env (`frontend/.env.local` locally; Vercel project **shoes** → Settings → Environment Variables):
   * `VITE_CLERK_PUBLISHABLE_KEY` — `pk_test_…` (publishable, safe for the browser).
3. Backend env (`backend/.env`; Vercel project **shoes-backend**):
   * `CLERK_SECRET_KEY` — `sk_test_…` (secret, backend only).
   * `CLERK_AUTHORIZED_PARTIES` — comma-separated frontend origins, e.g.
     `http://localhost:5173,https://shoes-red-alpha.vercel.app`.
4. In Clerk → Domains / allowed origins, add the same origins.
5. Apply the database migrations first (see `MIGRATIONS.md`), then deploy.

`GET /api/config` reports `features.clerkAuth: true|false` so you can check the backend picked it up.

## Not done / out of scope
* No user was migrated from Firebase to Clerk. No placeholder keys were created.
* Clerk was not tested against a real Clerk instance (no keys were available);
  the backend Clerk path is covered by unit tests with a test verifier only.
