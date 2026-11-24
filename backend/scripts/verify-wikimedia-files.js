#!/usr/bin/env node
"use strict";
const crypto = require("crypto");

function commonsDirect(filename) {
  const normalized = filename.trim().replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(normalized)}?width=1200`;
}

async function exists(filename) {
  const url = commonsDirect(filename);
  try {
    const r = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { Range: "bytes=0-4095", "User-Agent": "ShoesCatalog/1.0 (educational ecommerce demo)" },
    });
    const ok = r.ok && (r.headers.get("content-type") || "").startsWith("image/");
    return ok ? url : null;
  } catch {
    return null;
  }
}

async function firstHit(candidates) {
  for (const file of candidates) {
    const url = await exists(file);
    if (url) return { file, url };
  }
  return null;
}

module.exports = { commonsDirect, exists, firstHit };