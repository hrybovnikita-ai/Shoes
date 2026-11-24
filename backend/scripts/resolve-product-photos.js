#!/usr/bin/env node
"use strict";
require("dotenv").config({ quiet: true });
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const { products } = require("../data/catalog");
const { wikimediaUrlForSlug } = require("../data/wikimediaOverrides");

const OUT = path.join(__dirname, "../data/sneakerPhotoResolved.json");

async function fetchWithRetry(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "ShoesCatalog/1.0 (Wikimedia Commons; demo store)" },
    });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
      continue;
    }
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1500) return null;
    return buf;
  }
  return null;
}

async function validateSneakerPhoto(buf) {
  try {
    const meta = await sharp(buf).metadata();
    if (!meta.width || !meta.height || meta.width < 180) return false;
    const ratio = meta.width / meta.height;
    return ratio <= 3.2 && ratio >= 0.3;
  } catch {
    return false;
  }
}

async function resolveOne(product) {
  const wiki = wikimediaUrlForSlug(product.slug);
  if (!wiki) return null;
  await new Promise((r) => setTimeout(r, 900));
  const buf = await fetchWithRetry(wiki.url);
  if (!buf || !(await validateSneakerPhoto(buf))) return null;
  return { slug: product.slug, ...wiki, title: wiki.file, validated: true };
}

async function main() {
  const resolved = {};
  const unresolved = [];
  for (const product of products) {
    process.stdout.write(`${product.slug}… `);
    const hit = await resolveOne(product).catch((e) => ({ error: e.message }));
    if (hit && !hit.error) {
      resolved[product.slug] = hit;
      console.log(hit.file);
    } else {
      unresolved.push({ id: product.id, slug: product.slug, name: product.name, brand: product.brand });
      console.log("—");
    }
  }
  await fs.writeFile(OUT, JSON.stringify({ resolved, unresolved, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`\nResolved ${Object.keys(resolved).length}/${products.length}, unresolved ${unresolved.length}`);
}

main();