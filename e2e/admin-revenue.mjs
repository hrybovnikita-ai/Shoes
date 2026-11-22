// Run with the normal Vite dev server available at E2E_BASE_URL.
// Uses real local PostgreSQL and Express; only browser identity is stubbed.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { pool, resetDb, startServer, api, tokenFor } = require('../backend/test/helpers');
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173';
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error('Localhost only');
let server, browser;
try {
  browser = await chromium.launch();
  const live = await browser.newPage();
  await live.goto(BASE);
  await live.getByTestId('product-card').first().waitFor();
  console.log('PASS live storefront renders products');
  await live.goto(BASE + '/admin');
  await live.waitForURL(/\/login/);
  console.log('PASS live admin requires sign-in');
  await live.close();

  await resetDb();
  const started = await startServer();
  server = started.server;
  const token = tokenFor('firebase', 'dashboard-test-admin', 'admin@example.test');
  await api(started.base, 'GET', '/admin/me', {token});
  await pool.query("UPDATE shoes_users SET role = 'admin' WHERE firebase_uid = 'dashboard-test-admin'");
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/src/auth/AuthContext.jsx*', route => route.fulfill({
    contentType: 'application/javascript',
    body: `const getToken = async () => ${JSON.stringify(token)};
      const state = {ready: true, user: {uid: 'dashboard-test-admin'}, getToken, getFirebaseToken: getToken};
      export const useAuth = () => state;
      export const AuthProvider = ({children}) => children;`,
  }));
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const response = await fetch(started.base + url.pathname.slice(4) + url.search, {
      method: request.method(), headers: request.headers(),
      ...(request.postData() ? {body: request.postData()} : {}),
    });
    await route.fulfill({status: response.status, contentType: 'application/json', body: await response.text()});
  });
  await page.goto(BASE + '/admin');
  const revenue = page.locator('.admin-stat').filter({hasText: 'Revenue'}).locator('h2');
  await revenue.filter({hasText: '$0.00'}).waitFor();
  console.log('PASS empty paid revenue renders $0.00');
  for (const [id, status, provider, paidAt, total] of [
    ['paid-a', 'paid', 'stripe', new Date(), '10.10'],
    ['paid-b', 'paid', 'stripe', new Date(), '20.20'],
    ['demo', 'demo', 'demo', null, '999.00'],
    ['unconfirmed', 'paid', 'stripe', null, '999.00'],
    ['pending', 'pending', 'stripe', null, '999.00'],
    ['failed', 'failed', 'stripe', null, '999.00'],
    ['unpaid', 'unpaid', 'stripe', null, '999.00'],
  ]) {
    await pool.query(`INSERT INTO shoes_orders
      (id, customer_name, customer_email, items, subtotal, shipping, total,
       status, receipt_token_hash, payment_status, payment_provider, paid_at)
      VALUES ($1, 'Test', 'test@example.test', '[]', $2, 0, $2, 'CONFIRMED', 'test', $3, $4, $5)`,
      [id, total, status, provider, paidAt]);
  }
  await page.reload();
  await revenue.filter({hasText: '$30.30'}).waitFor();
  assert.match(await page.locator('.admin-panel').innerText(), /Paid orders: 2/);
  assert.equal(await page.locator('.shoes-admin').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(9, 11, 9)');
  assert.equal(await page.locator('.admin-sidebar h2 span').evaluate(el => getComputedStyle(el).color), 'rgb(185, 255, 50)');
  console.log('PASS real PostgreSQL revenue renders $30.30; black/lime design preserved');
  await page.getByRole('button', {name: 'Products', exact: true}).click();
  await page.getByRole('textbox', {name: 'Search products'}).fill('Jordan');
  await page.getByRole('cell', {name: 'Nike Air Jordan', exact: true}).waitFor();
  await page.getByRole('button', {name: 'Orders', exact: true}).click();
  await page.getByRole('cell', {name: '#paid-a', exact: true}).waitFor();
  await page.getByRole('button', {name: 'Users', exact: true}).click();
  await page.getByRole('cell', {name: 'admin@example.test', exact: true}).waitFor();
  console.log('PASS product search, orders and users tabs');
  assert.deepEqual(errors, []);
  console.log('PASS no browser runtime errors');
} finally {
  await browser?.close();
  server?.close();
  await pool.end();
}
