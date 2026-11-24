#!/usr/bin/env node
"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");

const ASSETS = process.env.CURSOR_ASSETS_DIR
  ? path.resolve(process.env.CURSOR_ASSETS_DIR)
  : path.resolve(
      process.env.USERPROFILE || process.env.HOME,
      ".cursor/projects/c-Users-Desktop-Shoes/assets"
    );
const OUT = path.resolve(__dirname, "../../frontend/public/images/product-sources");

/** Cursor assets UUID → repo filename (see localProductPhotos.js). */
const COPY_MAP = [
  ["image-b55b3255-c644-4473-a349-e253370121eb.png", "nike-air-max-270.png"],
  ["image-7058c9fc-64f6-452e-b40c-874b5b146c1c.png", "nike-air-force-1.png"],
  ["image-fd8b7882-df48-49ff-900c-d83e03d97504.png", "nike-air-max-90.png"],
  ["image-f3f198d4-35b8-4953-a597-e005c7a57184.png", "nike-dunk-low-panda.png"],
  ["image-241bcd15-182a-4401-bc51-9f0d7dbf3955.png", "nike-blazer-mid.png"],
  ["image-89a98771-7aca-468d-858f-5a9d9896015c.png", "nike-lebron.png"],
  ["image-1884ab31-7ef8-4719-b2e8-c323e3011948.png", "jordan-1-chicago.png"],
  ["image-988d9e78-4b45-4d2e-8743-6ff78566678f.png", "jordan-4-military-blue.png"],
  ["image-8ae2c069-51a6-49f0-82b2-b4d074c93829.png", "jordan-11-bred-low.png"],
];

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  for (const [src, dest] of COPY_MAP) {
    const from = path.join(ASSETS, src);
    const to = path.join(OUT, dest);
    try {
      await fs.copyFile(from, to);
      console.log("✓", dest);
    } catch (e) {
      console.error("✗", dest, e.message);
    }
  }
}

main();