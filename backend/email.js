"use strict";
// Transactional e-mail via Resend. Disabled (returns { sent:false }) unless
// RESEND_API_KEY and EMAIL_FROM are configured. Never logs the API key.

const log = require("./lib/logger");

let client = null;
let testSender = null;

function emailEnabled() {
  return Boolean(testSender || (process.env.RESEND_API_KEY && process.env.EMAIL_FROM));
}

function getClient() {
  if (!client) {
    const { Resend } = require("resend");
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const usd = (n) => `$${(Number(n) || 0).toFixed(2)}`;

async function send({ to, subject, html, text }) {
  if (!emailEnabled()) return { sent: false, reason: "email_not_configured" };
  if (testSender) return testSender({ to, subject, html, text });
  const { data, error } = await getClient().emails.send({ from: process.env.EMAIL_FROM, to, subject, html, text });
  if (error) {
    log.warn("email.send_failed", { error: { message: error.message, name: error.name } });
    return { sent: false, reason: error.name || "send_failed" };
  }
  return { sent: true, id: data?.id };
}

async function sendOrderConfirmation(order) {
  const demo = order.paymentProvider === "demo";
  const rows = (order.items || [])
    .map((i) => `<tr><td>${esc(i.name)} — EU ${esc(i.size)}${i.color ? ` / ${esc(i.color)}` : ""} × ${esc(i.quantity)}</td><td align="right">${usd(i.price * i.quantity)}</td></tr>`)
    .join("");
  const html = `<div style="font-family:Arial,sans-serif;background:#0b0b0b;color:#fff;padding:24px">
<h1 style="margin:0">SHOES<span style="color:#b7ff35">.</span></h1>
<p>Hi ${esc(order.customer?.name)}, thanks for your order <strong>${esc(order.id)}</strong>.</p>
<table width="100%" style="color:#fff">${rows}
<tr><td>Subtotal</td><td align="right">${usd(order.subtotal)}</td></tr>
<tr><td>Discount</td><td align="right">-${usd(order.discount)}</td></tr>
<tr><td>Shipping</td><td align="right">${order.shipping ? usd(order.shipping) : "FREE"}</td></tr>
<tr><td><strong>Total</strong></td><td align="right"><strong>${usd(order.total)}</strong></td></tr></table>
<p style="color:#b7ff35">${demo ? "Demo order — no real payment was processed." : "Stripe TEST MODE — no real money moved."}</p></div>`;
  const text = `SHOES order ${order.id}\nTotal: ${usd(order.total)}\n${demo ? "Demo order — no real payment was processed." : "Stripe test mode — no real money moved."}`;
  return send({ to: order.customer?.email, subject: `SHOES order ${order.id}`, html, text });
}

async function sendClaimCode({ to, code, orderId }) {
  const html = `<div style="font-family:Arial,sans-serif"><h2>SHOES order verification</h2>
<p>Use this code to add order <strong>${esc(orderId)}</strong> to your SHOES account:</p>
<p style="font-size:28px;letter-spacing:6px"><strong>${esc(code)}</strong></p>
<p>The code expires in 15 minutes. If you did not request it, ignore this e-mail.</p></div>`;
  return send({ to, subject: "Your SHOES order verification code", html, text: `Your SHOES verification code for order ${orderId}: ${code} (expires in 15 minutes)` });
}

function __setTestSender(fn) {
  if (process.env.NODE_ENV !== "test") throw new Error("Only allowed when NODE_ENV=test");
  testSender = fn;
}

module.exports = { emailEnabled, sendOrderConfirmation, sendClaimCode, __setTestSender };
