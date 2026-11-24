#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { products } = require("../data/catalog");
const { IMAGE_CREDITS } = require("../data/imageCredits");

const manifestPath = path.resolve(__dirname, "../../frontend/public/images/products/image-sources.json");
const out = path.resolve(__dirname, "../../frontend/public/image-credits.json");

function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const byId = new Map(products.map((p) => [p.id, p]));
  const productsOut = manifest.map((row) => {
    const p = byId.get(row.id) || {};
    return {
      id: row.id,
      name: p.name || row.name,
      slug: row.slug,
      source: row.source || row.provider,
      file: row.file,
      license: row.license,
      attribution: row.attribution,
      match: row.match,
      note: row.note,
    };
  });
  fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), credits: IMAGE_CREDITS, products: productsOut }, null, 2));
  console.log("Wrote", out);
}

main();