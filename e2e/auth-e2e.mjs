// SHOES auth + catalog e2e against a LOCAL stack only:
// frontend (vite preview, :4173) -> backend on another origin (:5000, real CORS)
// -> local Postgres, with the Firebase Auth emulator (project demo-shoes).
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.E2E_BASE_URL || "http://localhost:4173";
const API = process.env.E2E_API_URL || "http://127.0.0.1:5000/api";
const EMU = process.env.E2E_AUTH_EMULATOR || "http://127.0.0.1:9099";
const SHOTS = process.env.E2E_SHOTS_DIR || "/workspace/shots";
for (const u of [BASE, API, EMU]) if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(u)) throw new Error("local only");
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const consoleErrors = [];
const assert = (c, m) => { if (!c) throw new Error(m); };
let page;
async function step(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS ${name}`); }
  catch (e) {
    results.push({ name, ok: false }); console.log(`FAIL ${name}: ${e.message.split("\n")[0]} @ ${page?.url()}`);
    await page?.screenshot({ path: `${SHOTS}/shoes-auth-fail-${name.replace(/\W+/g, "-")}.png` }).catch(() => {});
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
page = await context.newPage();
page.setDefaultTimeout(10000);
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror " + e.message));

const email = `auth-e2e-${Date.now()}@example.com`;
const password = "Sneaker!2345";
const newPassword = "Sneaker!6789";

await step("catalog loads from the cross-origin API (CORS)", async () => {
  const apiResp = page.waitForResponse((r) => r.url().startsWith(API + "/products"));
  await page.goto(BASE + "/");
  const r = await apiResp;
  assert(r.status() === 200, `products status ${r.status()}`);
  assert((await r.headerValue("access-control-allow-origin")) === new URL(BASE).origin, "missing ACAO");
  const body = await r.json();
  assert(body.products?.length > 0, "no products");
});

await step("protected /account shows sign-in gate when signed out", async () => {
  await page.goto(BASE + "/account");
  await page.getByText("Sign in required").waitFor();
});

await step("register with email/password", async () => {
  await page.goto(BASE + "/register");
  await page.locator('input[name="name"]').fill("Auth Tester");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirm"]').fill(password);
  await page.locator(".auth-submit").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/register"));
  await page.getByRole("button", { name: "Log Out" }).waitFor();
});

await step("session persists after reload; /account accessible", async () => {
  await page.reload();
  await page.getByRole("button", { name: "Log Out" }).waitFor();
  await page.goto(BASE + "/account");
  await page.getByText(email).first().waitFor();
});

await step("backend verifies the Firebase ID token (GET /api/me)", async () => {
  const res = await page.evaluate(async (api) => {
    const req = indexedDB.open("firebaseLocalStorageDb");
    const db = await new Promise((ok, no) => { req.onsuccess = () => ok(req.result); req.onerror = no; });
    const rows = await new Promise((ok) => { const r = db.transaction("firebaseLocalStorage").objectStore("firebaseLocalStorage").getAll(); r.onsuccess = () => ok(r.result); });
    const token = rows.find((x) => x.value?.stsTokenManager)?.value.stsTokenManager.accessToken;
    const r = await fetch(api + "/me", { headers: { Authorization: `Bearer ${token}` } });
    return { status: r.status, body: await r.json() };
  }, API);
  assert(res.status === 200, `status ${res.status} ${JSON.stringify(res.body)}`);
  assert(res.body.user.email === email, "email mismatch");
});

await step("logout", async () => {
  await page.goto(BASE + "/");
  await page.getByRole("button", { name: "Log Out" }).click();
  await page.getByRole("button", { name: /sign in/i }).first().waitFor();
  await page.reload();
  await page.goto(BASE + "/account");
  await page.getByText("Sign in required").waitFor();
});

await step("wrong password -> friendly invalid-credential message with reset/Google actions", async () => {
  await page.goto(BASE + "/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("WrongPass!000");
  await page.locator(".auth-submit").click();
  const err = page.getByTestId("auth-error");
  await err.waitFor();
  const text = await err.innerText();
  assert(/couldn't sign you in|Incorrect password/i.test(text), text);
  await err.getByRole("button", { name: "Reset password" }).waitFor();
  await err.getByRole("button", { name: "Continue with Google" }).waitFor();
  await page.screenshot({ path: `${SHOTS}/shoes-auth-login-error-1440.png` });
});

await step("password reset e-mail (emulator) and sign-in with the new password", async () => {
  await page.getByTestId("auth-error").getByRole("button", { name: "Reset password" }).click();
  await page.locator(".auth-success").waitFor();
  const codes = await (await fetch(`${EMU}/emulator/v1/projects/demo-shoes/oobCodes`)).json();
  const oob = codes.oobCodes.filter((c) => c.email === email && c.requestType === "PASSWORD_RESET").pop();
  assert(oob, "no reset code issued");
  const r = await fetch(`${EMU}/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=fake-api-key`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oobCode: oob.oobCode, newPassword }),
  });
  assert(r.ok, `reset failed ${r.status}`);
  await page.goto(BASE + "/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(newPassword);
  await page.locator(".auth-submit").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  await page.getByRole("button", { name: "Log Out" }).waitFor();
});

await step("register with an existing e-mail shows sign-in / Google hint", async () => {
  await page.getByRole("button", { name: "Log Out" }).click();
  await page.goto(BASE + "/register");
  await page.locator('input[name="name"]').fill("Dup Tester");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirm"]').fill(password);
  await page.locator(".auth-submit").click();
  const err = page.getByTestId("auth-error");
  await err.waitFor();
  await err.getByRole("button", { name: "Sign in instead" }).waitFor();
});

await step("with email-enumeration protection ON (like production): invalid-credential message", async () => {
  const cfg = await fetch(`${EMU}/emulator/v1/projects/demo-shoes/config`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailPrivacyConfig: { enableImprovedEmailPrivacy: true } }),
  });
  assert(cfg.ok, `emulator config ${cfg.status}`);
  await page.goto(BASE + "/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("WrongPass!000");
  await page.locator(".auth-submit").click();
  const err = page.getByTestId("auth-error");
  await err.waitFor();
  const text = await err.innerText();
  await fetch(`${EMU}/emulator/v1/projects/demo-shoes/config`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailPrivacyConfig: { enableImprovedEmailPrivacy: false } }),
  });
  assert(/couldn't sign you in/i.test(text), text);
  await err.getByRole("button", { name: "Continue with Google" }).waitFor();
  await page.screenshot({ path: `${SHOTS}/shoes-auth-invalid-credential-1440.png` });
});

await step("screenshots desktop + mobile", async () => {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    for (const [name, path] of [["home", "/"], ["login", "/login"], ["register", "/register"], ["account-gate", "/account"]]) {
      await p.goto(BASE + path);
      await p.waitForLoadState("networkidle");
      await p.screenshot({ path: `${SHOTS}/shoes-auth-${name}-${w}.png`, fullPage: name !== "home" });
    }
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    await ctx.close();
    assert(sw <= w + 1, `horizontal overflow at ${w}: ${sw}`);
  }
});

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} auth e2e steps passed`);
const errs = consoleErrors.filter((e) => !/SHOES Firebase Auth:|auth\/invalid-credential|auth\/email-already-in-use|400 \(Bad Request\)|Failed to load resource/.test(e));
console.log(`unexpected console errors: ${errs.length}`);
errs.slice(0, 10).forEach((e) => console.log("  " + e));
process.exit(failed ? 1 : 0);
