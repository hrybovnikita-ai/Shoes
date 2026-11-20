// Visual QA screenshots for the glass redesign (local only: preview + local backend + auth emulator).
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.E2E_BASE_URL || "http://localhost:4173";
const SHOTS = process.env.E2E_SHOTS_DIR || "/workspace/shots";
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) throw new Error("screenshots only run against localhost");
fs.mkdirSync(SHOTS, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on("console", (m) => { if (m.type() === "error") errors.push(`${page.url()} :: ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`${page.url()} :: pageerror ${e.message}`));
// Paced so the local backend read limiter (300 req/min) is not tripped.
const settle = () => page.waitForTimeout(1800);
const shot = async (name, w, full = false) => {
  await settle();
  await page.screenshot({ path: `${SHOTS}/shoes-glass-${name}-${w}.png`, fullPage: full });
};

// Signed-out shots of the login page first.
const widths = [390, 768, 1440];
for (const w of widths) {
  await page.setViewportSize({ width: w, height: w === 390 ? 844 : w === 768 ? 1024 : 900 });
  await page.goto(BASE + "/login?method=firebase");
  await page.locator("#auth-email").waitFor();
  await page.locator("#auth-email").focus();
  await shot("login", w);
}

// Seed: register via emulator, favorite one product, place one demo order, leave one item in cart.
await page.setViewportSize({ width: 1440, height: 900 });
const email = `glass+${Date.now()}@example.com`;
await page.goto(BASE + "/register");
await page.locator("#auth-name").fill("Glass Preview");
await page.locator("#auth-email").fill(email);
await page.locator("#auth-password").fill("Sneaker!2345");
await page.locator("#auth-confirm").fill("Sneaker!2345");
await page.locator(".auth-submit").click();
await page.waitForURL((u) => !/\/register/.test(u.pathname));
await page.goto(BASE + "/product/2");
await page.getByRole("button", { name: "Add to favorites" }).click();
await page.goto(BASE + "/product/3");
await page.locator(".shoe-size-grid button", { hasText: "41" }).click();
await page.locator(".shoe-actions .shoe-buy-btn").click();
await page.waitForURL(/\/checkout/);
await page.locator('input[name="name"]').fill("Glass Preview");
await page.locator('input[name="phone"]').fill("+380501234567");
await page.locator('input[name="street"]').fill("1 Khreshchatyk St");
await page.locator('select[name="country"]').selectOption("UA");
await page.locator('input[name="city"]').fill("Kyiv");
await page.locator('input[name="postalCode"]').fill("01001");
await page.locator(".checkout-submit").click();
await page.waitForURL(/\/success/);
await page.locator('[data-testid="order-number"]').waitFor();
await page.goto(BASE + "/product/1");
await page.locator(".shoe-size-grid button", { hasText: "42" }).click();
await page.locator(".shoe-actions .shoe-cart-btn").click();
await page.keyboard.press("Escape");

for (const w of widths) {
  await page.setViewportSize({ width: w, height: w === 390 ? 844 : w === 768 ? 1024 : 900 });
  await page.goto(BASE + "/");
  await page.locator('[data-testid="product-card"]').first().waitFor();
  await shot("home", w);
  await page.goto(BASE + "/shop");
  await page.locator('[data-testid="product-card"]').first().waitFor();
  await page.locator(".filter-bar, .product-grid").first().scrollIntoViewIfNeeded();
  await page.locator('[data-testid="product-card"]').first().hover().catch(() => {});
  await shot("catalog", w);
  await page.goto(BASE + "/product/1");
  await page.locator(".shoe-size-grid button").first().waitFor();
  await shot("product", w);
  await page.locator('[data-testid="open-cart"]').click();
  await page.locator('[data-testid="cart-line"]').first().waitFor();
  await shot("cart", w);
  await page.keyboard.press("Escape");
  await page.goto(BASE + "/checkout");
  await page.locator(".checkout-submit").waitFor();
  await shot("checkout", w);
  await page.goto(BASE + "/account#orders");
  await page.locator('[data-testid="order-card"]').first().waitFor();
  await page.locator("#orders").scrollIntoViewIfNeeded();
  await shot("account-orders", w);
  await page.goto(BASE + "/account#favorites");
  await page.locator('[data-testid="favorite-card"]').first().waitFor();
  await page.locator("#favorites").scrollIntoViewIfNeeded();
  await shot("account-favorites", w);
  await page.goto(BASE + "/account");
  await page.locator(".account-profile").waitFor();
  await shot("account", w);
  if (w < 1024) {
    await page.goto(BASE + "/");
    await page.locator(".menu-btn").click();
    await page.locator(".nav-links.open").waitFor();
    await shot("mobile-nav", w);
  } else {
    await page.goto(BASE + "/");
    const trigger = page.locator('[data-testid="account-menu"]');
    await trigger.waitFor();
    await trigger.click();
    await page.locator(".account-dropdown").waitFor();
    await shot("account-dropdown", w);
    await page.keyboard.press("Escape");
  }
}

// Fallbacks: reduced transparency (opaque surfaces) and light theme.
const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE + "/account#orders");
await page.locator('[data-testid="order-card"]').first().waitFor();
await shot("reduced-transparency-account", 1440);
await page.goto(BASE + "/login?method=firebase");
await shot("reduced-transparency-header", 1440);
const opaque = await page.evaluate(() => getComputedStyle(document.querySelector(".header")).backdropFilter);
await cdp.send("Emulation.setEmulatedMedia", { features: [] });
await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
await page.goto(BASE + "/");
await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
await shot("light-home", 1440);
await page.goto(BASE + "/account#orders");
await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
await page.locator('[data-testid="order-card"]').first().waitFor();
await shot("light-account", 1440);

// Horizontal overflow check on key routes at 390.
await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
const overflow = [];
await page.setViewportSize({ width: 390, height: 844 });
for (const p of ["/", "/shop", "/product/1", "/checkout", "/account", "/login"]) {
  await page.goto(BASE + p);
  await settle();
  const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (o > 1) overflow.push(`${p}: +${o}px`);
}
console.log("reduced-transparency header backdrop-filter:", opaque);
console.log("overflow at 390:", overflow.length ? overflow.join(", ") : "none");
console.log("console errors:", errors.length, errors.slice(0, 5).join("\n"));
await browser.close();
