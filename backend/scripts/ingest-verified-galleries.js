#!/usr/bin/env node
"use strict";
/**
 * Download curated multi-angle sources → WebP under public/images/galleries/{slug}/
 * Dedupes by content hash; never copies primary product webp as fake angles.
 */
require("dotenv").config({ quiet: true });
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");
const { GALLERY_BY_SLUG } = require("../data/galleryPhotoSources");
const { exists: commonsFileExists } = require("./verify-wikimedia-files");
const { buildPublicManifest, ANGLE_LABELS } = require("../data/productGalleryManifest");
const { products } = require("../data/catalog");

const ROOT = path.resolve(__dirname, "../../frontend/public/images/galleries");
const BG = { r: 245, g: 245, b: 247, alpha: 1 };
const UA = "ShoesCatalog/1.0 (gallery-ingest)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchBuf(url) {
  const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(45000) });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1500) return null;
  return buf;
}

async function resolveEntry(entry) {
  if (entry.url) {
    return fetchBuf(entry.url);
  }
  if (entry.file) {
    await sleep(500);
    const url = await commonsFileExists(entry.file);
    if (!url) return null;
    return fetchBuf(url);
  }
  return null;
}

async function main() {
  await fsp.mkdir(ROOT, { recursive: true });
  let ingested = 0;

  for (const product of products) {
    const curated = GALLERY_BY_SLUG[product.slug];
    if (!curated?.length) continue;

    const slugDir = path.join(ROOT, product.slug);
    await fsp.mkdir(slugDir, { recursive: true });
    const seen = new Set();

    const primaryPath = path.resolve(__dirname, `../../frontend/public${product.image}`);
    if (fs.existsSync(primaryPath)) {
      seen.add(crypto.createHash("sha256").update(fs.readFileSync(primaryPath)).digest("hex").slice(0, 16));
    }

    for (const entry of curated) {
      const angle = entry.angle || "detail";
      const buf = await resolveEntry(entry);
      if (!buf) {
        console.warn("— skip", product.slug, entry.file || entry.url);
        continue;
      }
      const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
      if (seen.has(hash)) {
        console.warn("— dup hash", product.slug, angle);
        continue;
      }
      seen.add(hash);
      const out = path.join(slugDir, `${angle}.webp`);
      const webp = await sharp(buf).rotate().resize(1400, 1400, { fit: "contain", background: BG }).webp({ quality: 84 }).toBuffer();
      await fsp.writeFile(out, webp);
      console.log("✓", product.slug, ANGLE_LABELS[angle] || angle);
      ingested += 1;
    }
  }

  const manifest = buildPublicManifest();
  console.log(`Ingested ${ingested} angle file(s); manifest ${Object.keys(manifest.bySlug).length} products`);
  const multi = Object.values(manifest.bySlug).filter((r) => r.items.length > 1).length;
  console.log(`Products with 2+ verified angles: ${multi}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});