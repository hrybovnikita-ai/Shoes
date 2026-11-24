#!/usr/bin/env node
"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const OUT = path.resolve(__dirname, "../../frontend/public/images/products");

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <rect width="1200" height="1200" fill="#f0f0f3"/>
  <path fill="#b8b8be" d="M260 720c40-180 220-250 380-210 40 12 70 8 110-25 90-75 200-95 310-70 50 12 95 45 130 95 25 35 30 80 15 120-25 65-95 110-175 125-200 40-420 30-600-5-55-12-110-18-170-30z"/>
  <ellipse cx="400" cy="810" rx="70" ry="22" fill="#a0a0a8"/>
  <ellipse cx="720" cy="790" rx="85" ry="26" fill="#a0a0a8"/>
  <text x="600" y="980" text-anchor="middle" font-family="system-ui,sans-serif" font-size="42" fill="#6b6b73">Product image pending</text>
</svg>`;

async function writeVariants(bg) {
  const base = path.join(OUT, "placeholder");
  const pipe = (w) =>
    sharp(Buffer.from(SVG))
      .resize(w, w, { fit: "contain", background: bg })
      .webp({ quality: 82 });
  await pipe(1200).toFile(`${base}.webp`);
  await pipe(800).toFile(`${base}-800.webp`);
  await pipe(400).toFile(`${base}-400.webp`);
  const fallbackTargets = ["fallback.webp", "fallback-800.webp", "fallback-400.webp"];
  for (const target of fallbackTargets) {
    const src = path.join(OUT, `placeholder${target.replace("fallback", "")}`);
    await fs.copyFile(src, path.join(OUT, target));
  }
}

writeVariants({ r: 240, g: 240, b: 243, alpha: 1 }).then(() => console.log("Placeholder WebP written"));