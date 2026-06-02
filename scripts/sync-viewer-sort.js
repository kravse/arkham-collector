#!/usr/bin/env node
/**
 * Copies scripts/lib/viewer-sort.js into js/viewer/00-viewer-sort.js for the
 * browser bundle (same IIFE scope as the other viewer partials).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(__dirname, "lib", "viewer-sort.js");
const TARGET = path.join(ROOT, "js", "viewer", "00-viewer-sort.js");

function syncViewerSort() {
  const source = fs.readFileSync(SOURCE, "utf8");
  const body = source.replace(/\nmodule\.exports = \{[\s\S]*$/, "");
  const output = `/* Generated from scripts/lib/viewer-sort.js — run npm run bundle-viewer */

const viewerSort = (function () {
${body.trimEnd()
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
  return {
    compareOrderTiebreak,
    compareCanonical,
    sortBooks,
  };
})();
`;
  fs.writeFileSync(TARGET, output);
}

if (require.main === module) {
  syncViewerSort();
}

module.exports = { syncViewerSort };
