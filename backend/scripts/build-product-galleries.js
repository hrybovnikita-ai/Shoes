#!/usr/bin/env node
"use strict";
const { buildPublicManifest } = require("../data/productGalleryManifest");

const manifest = buildPublicManifest();
const multi = Object.values(manifest.bySlug).filter((e) => e.items.length > 1).length;
console.log(`product-galleries.json — ${Object.keys(manifest.bySlug).length} products, ${multi} with multiple verified angles`);