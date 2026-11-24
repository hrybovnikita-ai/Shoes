"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { wikimediaUrlForSlug } = require("./wikimediaOverrides");
const { localSourceForSlug, localPathForSlug } = require("./localProductPhotos");

const RESOLVED_PATH = path.join(__dirname, "sneakerPhotoResolved.json");

function loadResolved() {
  if (!fs.existsSync(RESOLVED_PATH)) return { resolved: {}, unresolved: [] };
  return JSON.parse(fs.readFileSync(RESOLVED_PATH, "utf8"));
}

function downloadUrl(source) {
  if (!source?.url) throw new Error("Missing image URL");
  return source.url;
}

function publicImagePath(slug) {
  return `/images/products/${slug}.webp`;
}

/** @param {import('./catalog').products} products */
function buildSourceBySlug(products) {
  const { resolved } = loadResolved();
  const map = new Map();
  for (const product of products) {
    const local = localSourceForSlug(product.slug);
    if (local && fs.existsSync(local.path)) {
      map.set(product.slug, local);
      continue;
    }
    const hit = resolved[product.slug] || wikimediaUrlForSlug(product.slug) || null;
    if (hit) map.set(product.slug, hit);
  }
  return map;
}

module.exports = {
  downloadUrl,
  publicImagePath,
  buildSourceBySlug,
  loadResolved,
  FALLBACK_PATH: "/images/products/fallback.webp",
  PLACEHOLDER_PATH: "/images/products/placeholder.webp",
};