"use strict";
const PDFDocument = require("pdfkit");

const usd = (n) => `$${(Number(n) || 0).toFixed(2)}`;

function paymentLine(order) {
  if (order.paymentProvider === "demo") return "Demo order — no real payment was processed";
  if (order.paymentStatus === "paid") return "Paid via Stripe (TEST MODE — no real money moved)";
  return `Stripe TEST MODE — payment ${order.paymentStatus}`;
}

// Writes a PDF receipt for an order (as returned by db.orderRow) to `res`.
function generateReceipt(order, res) {
  const doc = new PDFDocument({ margin: 50, info: { Title: `SHOES receipt ${order.id}` } });
  const orderId = String(order.id || "ORDER");
  const items = Array.isArray(order.items) ? order.items : [];

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Disposition", `attachment; filename="SHOES-${orderId.replace(/[^a-zA-Z0-9_-]/g, "")}.pdf"`);
  doc.pipe(res);

  doc.fontSize(28).font("Helvetica-Bold").text("SHOES.");
  doc.moveDown(0.5);
  doc.fontSize(16).text(order.paymentProvider === "demo" ? "DEMO PURCHASE RECEIPT" : "ORDER RECEIPT (TEST MODE)");
  doc.moveDown();

  doc.fontSize(11).font("Helvetica");
  doc.text(`Order number: ${orderId}`);
  doc.text(`Date: ${new Date(order.date || Date.now()).toLocaleString("en-US", { timeZone: "UTC" })} UTC`);
  doc.text(`Order status: ${String(order.status || "").replaceAll("_", " ")}`);
  doc.text(`Payment: ${paymentLine(order)}`);
  doc.text(`Customer: ${order.customer?.name || ""} <${order.customer?.email || ""}>`);
  const a = order.shippingAddress;
  if (a && typeof a === "object") {
    doc.text(`Ship to: ${[a.street, a.apartment, a.city, a.postalCode, a.country].filter(Boolean).join(", ")}`);
  }
  doc.moveDown();

  doc.fontSize(14).font("Helvetica-Bold").text("Items");
  doc.moveDown(0.4);
  doc.fontSize(11).font("Helvetica");
  for (const item of items) {
    const quantity = Number(item.quantity || 1);
    const price = Number(item.price || 0);
    doc.text(
      `${item.name || "Sneaker"} — EU ${item.size ?? "-"}${item.color ? ` / ${item.color}` : ""}  ×${quantity}  @ ${usd(price)}  =  ${usd(price * quantity)}`
    );
  }
  doc.moveDown();
  doc.text(`Subtotal: ${usd(order.subtotal)}`);
  doc.text(`Discount${order.promoCode ? ` (${order.promoCode})` : ""}: -${usd(order.discount)}`);
  doc.text(`Shipping: ${Number(order.shipping) ? usd(order.shipping) : "FREE"}`);
  doc.moveDown(0.3);
  doc.fontSize(16).font("Helvetica-Bold").text(`Total: ${usd(order.total)} USD`);
  doc.moveDown(2);
  doc.fontSize(9).font("Helvetica").fillColor("#555555")
    .text("SHOES is a portfolio demonstration store. This document is not a tax invoice.");
  doc.end();
}

module.exports = { generateReceipt };
