"use strict";

/**
 * Verified multi-angle sources per slug (distinct files only — same model).
 * Expand as you find CC/PDM product photography; run npm run ingest:galleries.
 */
const GALLERY_BY_SLUG = {
  "new-balance-new-balance-2002r": [],
  "nike-nike-air-force-1-07": [],
  "nike-nike-dunk-low": [],
  "nike-nike-sb-stefan-janoski": [],
  "under-armour-ua-hovr-phantom": [
    {
      angle: "three-quarter",
      provider: "openverse",
      url: "https://live.staticflickr.com/828/41280799615_5e08513da0_b.jpg",
      label: "Pair with HOVR box",
      license: "CC BY-SA 2.0",
      match: "close",
    },
  ],
  "reebok-reebok-nano": [
    {
      angle: "side",
      provider: "wikimedia",
      file: "Nano 3.0.jpg",
      label: "Studio pair — lateral",
      license: "Wikimedia Commons",
      match: "close",
    },
  ],
};

module.exports = { GALLERY_BY_SLUG };