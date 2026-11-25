#!/usr/bin/env node
"use strict";
/**
 * Refresh image-sources.json and image-catalog-gaps.json from on-disk WebPs only (no network, no re-encode).
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");
const { products } = require("../data/catalog");

const OUT_DIR = path.resolve(__dirname, "../../frontend/public/images/products");
const MANIFEST = path.join(OUT_DIR, "image-sources.json");
const GAPS_PATH = path.resolve(__dirname, "../../frontend/public/image-catalog-gaps.json");
const PLACEHOLDER_BYTES = 8030;

function imageSlugForProduct(p) {
  const m = p.image.match(/\/([^/]+)\.webp$/);
  return m ? m[1] : p.slug;
}

async function looksLikeGeneratedPlaceholder(filePath) {
  try {
    const { data, info } = await sharp(filePath)
      .resize(64, 64, { fit: "inside" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let dark = 0;
    const pixels = data.length / info.channels;
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i] < 40 && data[i + 1] < 40 && data[i + 2] < 40) dark++;
    }
    return dark / pixels > 0.52 && fs.statSync(filePath).size < 22000;
  } catch {
    return true;
  }
}

async function main() {
  let priorBySlug = {};
  if (fs.existsSync(MANIFEST)) {
    try {
      for (const row of JSON.parse(fs.readFileSync(MANIFEST, "utf8"))) {
        const key = row.imageSlug || row.slug;
        if (key) priorBySlug[key] = row;
      }
    } catch {
      priorBySlug = {};
    }
  }

  const gaps = [];
  const manifest = [];

  for (const product of products) {
    const imageSlug = imageSlugForProduct(product);
    const filePath = path.join(OUT_DIR, `${imageSlug}.webp`);
    const prior = priorBySlug[imageSlug] || {};
    let placeholder = true;
    let bytes = 0;
    let sha256_12 = "";

    if (fs.existsSync(filePath)) {
      bytes = fs.statSync(filePath).size;
      const generated = await looksLikeGeneratedPlaceholder(filePath);
      placeholder = generated || bytes <= PLACEHOLDER_BYTES;
      if (!placeholder) {
        sha256_12 = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").slice(0, 12);
      }
    }

    const row = {
      id: product.id,
      slug: product.slug,
      imageSlug,
      name: product.name,
      brand: product.brand,
      bytes,
      placeholder,
      sha256_12,
      verified: !placeholder,
      provider: placeholder ? prior.provider || "placeholder" : prior.provider || "cache",
      file: placeholder ? prior.file || "placeholder.webp" : prior.file || path.basename(filePath),
      license: prior.license || (placeholder ? "internal" : "local-cache"),
      match: placeholder ? prior.match || "unresolved" : prior.match || "cached",
      note: placeholder ? prior.note || `Missing verified photo for ${product.name}` : prior.note,
      source: prior.source,
      attribution: prior.attribution,
    };

    manifest.push(row);
    if (placeholder) {
      gaps.push({ id: product.id, slug: product.slug, imageSlug, name: product.name, brand: product.brand, reason: row.note });
    }
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(GAPS_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), count: gaps.length, gaps }, null, 2));
  const verified = manifest.filter((r) => !r.placeholder).length;
  console.log(`Manifest: ${verified}/${manifest.length} verified, ${gaps.length} gaps`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});