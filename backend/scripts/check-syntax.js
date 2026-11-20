#!/usr/bin/env node
"use strict";
// `node --check` every backend source file (no DB or network needed).
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".js")) files.push(p);
  }
})(root);
for (const f of files) execFileSync(process.execPath, ["--check", f], { stdio: "inherit" });
console.log(`Syntax OK: ${files.length} files`);
