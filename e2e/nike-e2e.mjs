// Nike colorways UI check + screenshots (Playwright library). Localhost only; the
// backend behind the preview must point at a NON-production database.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.E2E_BASE_URL || "http://localhost:4173";
const SHOTS = process.env.E2E_SHOTS_DIR || "/workspace/shots";
const PLACE_ORDER = process.env.NIKE_E2E_ORDER === "1";
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) throw new Error("only runs against localhost");
fs.mkdirSync(SHOTS, { recursive: true });

const COLORS = ["Purple", "Green", "Orange", "Yellow", "Black"];
const results = [];
const consoleErrors = [];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`${page.url()} :: ${m.text()}`); });
page.on("pageerror", (e) => consoleErrors.push(`${page.url()} :: pageerror ${e.message}`));
const pause = (ms = 350) => page.waitForTimeout(ms);
// Lazy images only load near the viewport: scroll through, then wait for them.
async function loadImages(p) {
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await p.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
async function step(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS ${name}`); }
  catch (err) {
    results.push({ name, ok: false });
    await page.screenshot({ path: `${SHOTS}/shoes-nike-fail-${name.replace(/\W+/g, "-")}.png` }).catch(() => {});
    console.log(`FAIL ${name}: ${err.message.split("\n")[0]} (at ${page.url()})`);
  }
}
const grid = () => page.locator("#shop [data-testid=product-card]");
async function gridNames(expected) {
  if (expected != null) await page.locator("#shop .result-count").filter({ hasText: new RegExp(`^${expected} products`) }).waitFor({ timeout: 5000 }).catch(() => {});
  else await page.locator("#shop .result-count").filter({ hasText: /products/ }).waitFor();
  await page.waitForTimeout(150);
  return page.locator("#shop [data-testid=product-card] h3").allInnerTexts();
}

await step("Shop by Color section lists 5 colors", async () => {
  await page.goto(BASE + "/");
  await page.getByTestId("color-card").first().waitFor({ timeout: 15000 });
  const cards = await page.getByTestId("color-card").allInnerTexts();
  assert(cards.length === 5, `expected 5 color cards, got ${cards.length}`);
  COLORS.forEach((c) => assert(cards.some((t) => t.includes(c)), `missing ${c} card`));
  await loadImages(page);
  await page.locator("#colors").scrollIntoViewIfNeeded();
  await pause(600);
  await page.locator("#colors").screenshot({ path: `${SHOTS}/shoes-nike-home-colors-1280.png` });
});

await step("color card opens filtered collection", async () => {
  await page.getByTestId("color-card").filter({ hasText: "Purple" }).click();
  await page.waitForURL(/color=Purple/);
  const names = await gridNames(5);
  assert(names.length === 5, `purple grid has ${names.length}`);
  assert(/Our Collection · Purple/.test(await page.locator("#shop h2").first().innerText()), "heading lacks color");
});

for (const c of COLORS) {
  await step(`color chip ${c} → matching products (5 new Nike)`, async () => {
    await page.goto(BASE + "/shop");
    await grid().first().waitFor({ timeout: 15000 });
    await page.locator(`#shop .color-filter[data-color="${c}"]`).click();
    await page.waitForURL(new RegExp(`color=${c}`));
    // Black also matches the two original black products (ids 3 and 5).
    const expected = c === "Black" ? 7 : 5;
    const names = await gridNames(expected);
    assert(names.length === expected, `${c}: ${names.length} cards (${names.join(" | ")})`);
    assert(await page.locator(`#shop .color-filter[data-color="${c}"]`).getAttribute("aria-pressed") === "true", "chip not pressed");
    await loadImages(page);
    await page.locator("#shop").screenshot({ path: `${SHOTS}/shoes-nike-collection-${c.toLowerCase()}-1280.png` });
    await pause(500);
  });
}

await step("All colors chip restores the full collection (31)", async () => {
  await page.goto(BASE + "/shop?color=Black");
  await grid().first().waitFor({ timeout: 15000 });
  await page.locator('#shop .color-filter[data-color="All"]').click();
  await page.waitForTimeout(400);
  const n = (await gridNames(31)).length;
  assert(n === 31, `All shows ${n}`);
});

await step("search by style code and colorway", async () => {
  await page.goto(BASE + "/shop?focus=search");
  const box = page.getByRole("combobox").first();
  await box.fill("DD1391-700");
  await page.getByRole("option").filter({ hasText: "Michigan" }).first().waitFor({ timeout: 5000 });
  await box.fill("pollen");
  await page.getByRole("option").filter({ hasText: "Pollen" }).first().waitFor({ timeout: 5000 });
  await page.screenshot({ path: `${SHOTS}/shoes-nike-search-1280.png` });
});

await step("favorite a Nike item keeps shoes-favorites-v2 format", async () => {
  await page.evaluate(() => localStorage.setItem("shoes-favorites-v2", JSON.stringify([2])));
  await page.goto(BASE + "/shop?color=Yellow");
  await grid().first().waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: /Add Air Jordan 1 Retro High OG "Pollen" to favorites/ }).click();
  await pause();
  const fav = await page.evaluate(() => JSON.parse(localStorage.getItem("shoes-favorites-v2")));
  assert(Array.isArray(fav) && fav.includes(2) && fav.includes(120), `favorites = ${JSON.stringify(fav)}`);
});

await step("women's product page: details, EU 36–42 only, add to cart", async () => {
  await page.goto(BASE + "/product/116");
  await page.getByRole("heading", { level: 1 }).waitFor();
  const h1 = await page.getByRole("heading", { level: 1 }).innerText();
  assert(/Yellow Strike/.test(h1), `h1 = ${h1}`);
  const body = await page.locator("main").innerText();
  assert(body.includes("DQ4694-700"), "style code not shown");
  assert(await page.locator(".shoe-description").count() === 1, "no description");
  const sizes = (await page.locator(".shoe-size-grid button").allInnerTexts()).map((s) => s.trim());
  assert(sizes.includes("36") && sizes.includes("42") && !sizes.includes("43"), `sizes = ${sizes.join(",")}`);
  await page.locator(".shoe-size-grid button", { hasText: "38" }).click();
  await loadImages(page);
  await page.screenshot({ path: `${SHOTS}/shoes-nike-product-116-1280.png`, fullPage: true });
  await page.locator(".shoe-actions .shoe-cart-btn").click();
  await page.getByTestId("cart-line").first().waitFor({ timeout: 5000 });
  const line = await page.getByTestId("cart-line").first().innerText();
  assert(/Yellow Strike/.test(line), `cart line = ${line}`);
  await page.screenshot({ path: `${SHOTS}/shoes-nike-cart-1280.png` });
});

if (PLACE_ORDER) {
  await step("demo guest checkout of a Nike item (server-priced)", async () => {
    await page.goto(BASE + "/checkout");
    await page.getByTestId("checkout-total").waitFor();
    const total = await page.getByTestId("checkout-total").innerText();
    assert(/150/.test(total) || /\$/.test(total), `total = ${total}`);
    await page.locator('input[name="name"]').fill("Nike E2E");
    await page.locator('input[name="email"]').fill("nike-e2e@example.com");
    await page.locator('input[name="phone"]').fill("+380501234567");
    await page.locator('input[name="street"]').fill("1 Khreshchatyk St");
    await page.locator('select[name="country"]').selectOption("UA");
    await page.locator('input[name="city"]').fill("Kyiv");
    await page.locator('input[name="postalCode"]').fill("01001");
    await page.locator(".checkout-submit").click();
    await page.waitForURL(/\/success/, { timeout: 20000 });
    assert(/demo/i.test(await page.getByTestId("payment-status").innerText()), "not a demo payment");
  });
}

await step("responsive 375/768/1280: no horizontal overflow", async () => {
  const overflow = [];
  const shots = [["home", "/"], ["collection-green", "/shop?color=Green"], ["product-104", "/product/104"]];
  for (const w of [375, 768, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => consoleErrors.push(`${w}px pageerror ${e.message}`));
    for (const [name, path] of shots) {
      await p.goto(BASE + path);
      await p.waitForLoadState("networkidle");
      await loadImages(p);
      if (name === "home") await p.locator("#colors").scrollIntoViewIfNeeded();
      await p.waitForTimeout(600);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      if (sw > w + 1) overflow.push(`${name}@${w}: ${sw}px`);
      await p.screenshot({ path: `${SHOTS}/shoes-nike-${name}-${w}.png`, fullPage: name !== "home" });
    }
    await ctx.close();
  }
  assert(overflow.length === 0, `horizontal overflow: ${overflow.join(", ")}`);
});

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} nike steps passed`);
const realErrors = consoleErrors.filter((e) => !/favicon/.test(e));
console.log(`console errors: ${realErrors.length}`);
realErrors.slice(0, 20).forEach((e) => console.log("  " + e));
process.exit(failed.length ? 1 : 0);
