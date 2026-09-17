#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const SKIP_DIRS = new Set([".git", "node_modules", "_site"]);
const SKIP_FILES = new Set(["brand-scan.js"]);

const needles = [
  bytes(106, 104, 108, 97, 99, 121),
  bytes(106, 111, 101, 121, 108, 97, 122, 121),
  bytes(106, 111, 101, 121),
  bytes(76, 97, 99, 121),
  bytes(74, 111, 101),
].map(function (s) {
  return s.toLowerCase();
});

function bytes() {
  return Buffer.from([].slice.call(arguments)).toString("utf8");
}

const hits = [];

function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    if (SKIP_DIRS.has(entry.name)) return;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      return;
    }
    if (SKIP_FILES.has(entry.name)) return;
    const text = fs.readFileSync(full, "utf8").toLowerCase();
    needles.forEach(function (n) {
      if (text.indexOf(n) !== -1) hits.push(full + " contains a banned personal-name token");
    });
  });
}

walk(path.join(__dirname, ".."));

if (hits.length) {
  hits.forEach(function (h) {
    console.error(h);
  });
  process.exit(1);
}

console.log("Brand lock OK — TortleTech / @TORTLE420 only.");
