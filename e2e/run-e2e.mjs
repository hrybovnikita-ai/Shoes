// SHOES end-to-end smoke test (Playwright library, no test runner).
// Requires: frontend served at E2E_BASE_URL (default http://localhost:4173) whose /api proxies
// to a LOCAL backend wired to a LOCAL Postgres and the Firebase Auth emulator. Never point at production.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.E2E_BASE_URL || "http://localhost:4173";
const SHOTS = process.env.E2E_SHOTS_DIR || "/workspace/shots";
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) throw new Error("E2E only runs against localhost");
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const consoleErrors = [];
async function step(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message.split("\n")[0] });
    await page.screenshot({ path: `${SHOTS}/shoes-e2e-fail-${name.replace(/\W+/g, "-")}.png` }).catch(() => {});
    console.log(`   at ${page.url()}`);
    console.log(`FAIL ${name}: ${err.message.split("\n")[0]}`);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`${page.url()} :: ${m.text()}`); });
page.on("pageerror", (e) => consoleErrors.push(`${page.url()} :: pageerror ${e.message}`));

const email = `e2e+${Date.now()}@example.com`;
const password = "Sneaker!2345";
let guestOrderId = "";
let userOrderId = "";

async function fillCheckout(p, { name = "E2E Tester", mail } = {}) {
  await p.locator('input[name="name"]').fill(name);
  if (mail && !(await p.locator('input[name="email"]').getAttribute("readonly"))) await p.locator('input[name="email"]').fill(mail);
  await p.locator('input[name="phone"]').fill("+380501234567");
  await p.locator('input[name="street"]').fill("1 Khreshchatyk St");
  await p.locator('select[name="country"]').selectOption("UA");
  await p.locator('input[name="city"]').fill("Kyiv");
  await p.locator('input[name="postalCode"]').fill("01001");
}

await step("home renders catalog", async () => {
  await page.goto(BASE + "/");
  await page.getByTestId("product-card").first().waitFor({ timeout: 15000 });
  assert((await page.getByTestId("product-card").count()) > 3, "too few product cards");
});

await step("search suggestions", async () => {
  await page.goto(BASE + "/shop?focus=search");
  const box = page.getByRole("combobox").first();
  await box.fill("air");
  await page.getByRole("option").first().waitFor({ timeout: 5000 });
});

await step("product page + add to cart", async () => {
  await page.goto(BASE + "/product/1");
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.getByTestId("stock").waitFor();
  await page.locator(".shoe-size-grid button", { hasText: "42" }).click();
  await page.locator(".shoe-actions .shoe-cart-btn").click();
  await page.getByTestId("cart-line").first().waitFor({ timeout: 5000 });
});

await step("cart promo SHOES10 applies", async () => {
  const before = await page.getByTestId("cart-total").innerText();
  await page.locator("#promo-code").fill("SHOES10");
  await page.locator("#promo-code").press("Enter");
  await page.waitForTimeout(500);
  const after = await page.getByTestId("cart-total").innerText();
  assert(before !== after, `total unchanged (${before})`);
});

await step("checkout validation blocks empty form", async () => {
  await page.goto(BASE + "/checkout");
  await page.getByTestId("checkout-total").waitFor();
  await page.locator(".checkout-submit").click();
  await page.locator(".field-error").first().waitFor({ timeout: 3000 });
  assert(page.url().includes("/checkout"), "left checkout with invalid form");
});

await step("guest demo checkout", async () => {
  await fillCheckout(page, { mail: "guest-e2e@example.com" });
  await page.locator(".checkout-submit").click();
  await page.waitForURL(/\/success/, { timeout: 15000 });
  guestOrderId = (await page.getByTestId("order-number").innerText()).trim();
  assert(guestOrderId.length > 8, "no order number");
  assert(/demo/i.test(await page.getByTestId("payment-status").innerText()), "payment status not demo");
});

await step("PDF receipt download", async () => {
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 10000 }), page.getByRole("button", { name: /receipt/i }).first().click()]);
  const path = await dl.path();
  const head = fs.readFileSync(path).subarray(0, 5).toString();
  assert(head === "%PDF-", `not a PDF (${head})`);
});

await step("register via Firebase emulator", async () => {
  await page.goto(BASE + "/register");
  await page.locator("#auth-name").fill("E2E Account");
  await page.locator("#auth-email").fill(email);
  await page.locator("#auth-password").fill(password);
  await page.locator("#auth-confirm").fill(password);
  await page.locator(".auth-submit").click();
  await page.waitForURL((u) => !/\/register/.test(u.pathname), { timeout: 15000 });
});

await step("favorite a product, shows on account", async () => {
  await page.goto(BASE + "/product/2");
  await page.getByRole("button", { name: "Add to favorites" }).click();
  await page.goto(BASE + "/account#favorites");
  await page.getByTestId("favorite-card").first().waitFor({ timeout: 8000 });
});

await step("signed-in demo order appears in My Orders", async () => {
  await page.goto(BASE + "/product/3");
  await page.locator(".shoe-size-grid button", { hasText: "41" }).click();
  await page.locator(".shoe-actions .shoe-buy-btn").click();
  await page.waitForURL(/\/checkout/);
  await page.getByTestId("checkout-total").waitFor();
  await fillCheckout(page);
  await page.locator(".checkout-submit").click();
  await page.waitForURL(/\/success/, { timeout: 15000 });
  userOrderId = (await page.getByTestId("order-number").innerText()).trim();
  await page.goto(BASE + "/account#orders");
  await page.getByTestId("order-card").first().waitFor({ timeout: 10000 });
  const text = await page.locator("[data-testid=order-card]").allInnerTexts();
  assert(text.join(" ").includes(userOrderId.slice(0, 8).toUpperCase()) || text.join(" ").includes(userOrderId), "own order missing");
  assert(!text.join(" ").includes(guestOrderId), "guest order leaked into account");
});

await step("cancel own order", async () => {
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /cancel order/i }).first().click();
  await page.getByText(/cancelled/i).first().waitFor({ timeout: 8000 });
});

await step("logout", async () => {
  await page.goto(BASE + "/account");
  await page.getByRole("button", { name: /log ?out|sign out/i }).first().click();
  await page.waitForTimeout(800);
  await page.goto(BASE + "/account");
  await page.waitForURL(/\/login/, { timeout: 8000 });
});

await step("404 page", async () => {
  await page.goto(BASE + "/definitely-missing");
  await page.getByText(/not found|404/i).first().waitFor();
});

// Responsive screenshots
const widths = [320, 390, 768, 1024, 1440];
const pages = [["home", "/"], ["product", "/product/1"], ["checkout", "/checkout"], ["login", "/login"]];
await step("responsive screenshots + no horizontal overflow", async () => {
  const overflow = [];
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => consoleErrors.push(`${w}px pageerror ${e.message}`));
    for (const [name, path] of pages) {
      await p.goto(BASE + path);
      await p.waitForLoadState("networkidle");
      await p.waitForTimeout(400);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      if (sw > w + 1) overflow.push(`${name}@${w}: ${sw}px`);
      await p.screenshot({ path: `${SHOTS}/shoes-${name}-${w}.png`, fullPage: name !== "home" });
    }
    await ctx.close();
  }
  assert(overflow.length === 0, `horizontal overflow: ${overflow.join(", ")}`);
});

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} e2e steps passed`);
const realErrors = consoleErrors.filter((e) => !/favicon/.test(e));
console.log(`console errors: ${realErrors.length}`);
realErrors.slice(0, 20).forEach((e) => console.log("  " + e));
process.exit(failed.length ? 1 : 0);
