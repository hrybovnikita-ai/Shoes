# Production auth + CORS incident (2026-11-20)

## Error 2 — "No 'Access-Control-Allow-Origin' header" on /api/products
**Root cause: the backend function crashed before Express could answer.**
Every request to `shoes-backend-liard.vercel.app` (/, /api, /api/health, /api/products, and
OPTIONS preflights) returned `HTTP 500 text/plain`, `x-vercel-error: FUNCTION_INVOCATION_FAILED`.
Vercel runtime logs for the production deployment (commit `4ef1022`, branch `main`):

    Error [ERR_REQUIRE_ESM]: require() of ES Module .../node_modules/jose/dist/webapi/index.js
    from .../node_modules/jwks-rsa/src/utils.js not supported.

`firebase-admin@14` depends on `jwks-rsa@4`, which `require()`s the ESM-only `jose@6`.
That relies on Node's newer require(esm) support, which Vercel's function loader does not
provide, so importing `firebase-admin/auth` (done at the top of `firebaseAdmin.js` and
`controllers.js`) killed the function. A crashed function returns Vercel's own 500 page,
which has no CORS headers — hence the browser's CORS message. Reproducible locally with
`node --no-experimental-require-module -e "require('firebase-admin/auth')"`.

Latent issues that would have surfaced right after:
* `vercel.json` rewrote `/api/(.*)` → `/api`; for Express-preset projects Vercel now passes the
  rewritten path to the app, so `/api/products` would have been handled as `/api`.
* The backend project only has `DATABASE_URL`; `FRONTEND_URL` is not set, so the old CORS
  allowlist contained only localhost and the old code answered the production origin with an
  error (500) — again without CORS headers. `FIREBASE_PROJECT_ID` is not set either, so ID-token
  verification could not work.

Fix: `firebase-admin@^13.10` (jwks-rsa 3 / jose 4, CommonJS); lazy, crash-proof init of
Firebase Admin and the DB pool (missing config → JSON 503); explicit CORS module with the
production origin built in; CORS headers on every response incl. 404/5xx; JSON everywhere;
`vercel.json` rewrite and the unused `api/index.js` removed (Vercel's Express preset uses `app.js`).

## Error 1 — Firebase `auth/invalid-credential` (identitytoolkit HTTP 400)
**Not caused by the app code or the Firebase config.** Checked (read-only):
* Production bundle has all four `VITE_FIREBASE_*` values; apiKey has the right shape;
  `authDomain` = `<projectId>.firebaseapp.com` (consistent, project `shoes-store-5606a`).
* Public project config lists `shoes-red-alpha.vercel.app` as an **authorized domain**.
* `auth/invalid-credential` itself proves the Email/Password provider is enabled
  (a disabled provider returns `auth/operation-not-allowed`).
* `createAuthUri` returns no `registered` field → **email-enumeration protection is ON**.
  With it on, Firebase returns the same `INVALID_LOGIN_CREDENTIALS` for (a) a wrong password,
  (b) an e-mail that has no account in this project, and (c) an account that only has Google
  sign-in (no password). The app cannot tell these apart — only the Firebase console can.

What to check in Firebase console (project shoes-store-5606a):
1. Authentication → Users: search your e-mail. Not listed → the account was created in another
   project (e.g. a different local `.env.local`) → register again. Provider shows only Google →
   use Continue with Google (or, once signed in with Google, add a password via "Forgot password").
   Listed with Email/Password → the password is wrong → use "Forgot password?".
2. Authentication → Sign-in method: Email/Password and Google enabled.
3. Authentication → Settings → Authorized domains: keep `shoes-red-alpha.vercel.app`.

App changes: clearer error copy with inline "Reset password" / "Continue with Google" /
"Sign in instead" actions, Google popup with redirect fallback, no UID logging, robust API client.
