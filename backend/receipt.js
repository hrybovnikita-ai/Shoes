const PDFDocument = require("pdfkit");

function generateReceipt(order, res) {
  const doc = new PDFDocument({ margin: 50 });

  const orderId = String(order.id || "DEMO");
  const items = Array.isArray(order.items) ? order.items : [];
  const total = Number(order.total || 0);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="SHOES-${orderId.replace(/[^a-zA-Z0-9_-]/g, "")}.pdf"`
  );

  doc.pipe(res);

  doc.fontSize(28).font("Helvetica-Bold").text("SHOES.");
  doc.moveDown();
  doc.fontSize(18).text("DEMO PURCHASE RECEIPT");
  doc.moveDown();

  doc.fontSize(11).font("Helvetica");
  doc.text(`Order ID: ${orderId}`);
  doc.text(`Date: ${new Date(order.date || Date.now()).toLocaleString("en-US")}`);
  doc.text(`Status: DEMO ORDER`);
  doc.moveDown();

  doc.fontSize(14).font("Helvetica-Bold").text("Items");
  doc.moveDown(0.5);

  for (const item of items) {
    const quantity = Number(item.quantity || 1);
    const price = Number(item.price || 0);
    doc.fontSize(11).font("Helvetica")
      .text(`${item.name || "Sneaker"} x${quantity} - $${(price * quantity).toFixed(2)}`);
  }

  doc.moveDown();
  doc.fontSize(16).font("Helvetica-Bold")
    .text(`Total: $${total.toFixed(2)}`);

  doc.moveDown(2);
  doc.fontSize(10).font("Helvetica")
    .text("This is a demonstration receipt.");
  doc.text("No real payment was processed.");

  doc.end();
}

module.exports = { generateReceipt };
