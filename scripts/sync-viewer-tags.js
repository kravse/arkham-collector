#!/usr/bin/env node
/**
 * Copies scripts/lib/viewer-tags.js into js/viewer/00-viewer-tags.js for the
 * browser bundle (same IIFE scope as the other viewer partials).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(__dirname, "lib", "viewer-tags.js");
const TARGET = path.join(ROOT, "js", "viewer", "00-viewer-tags.js");

function syncViewerTags() {
  const source = fs.readFileSync(SOURCE, "utf8");
  const body = source.replace(/\nmodule\.exports = \{[\s\S]*$/, "");
  const output = `/* Generated from scripts/lib/viewer-tags.js — run npm run bundle-viewer */

const viewerTags = (function () {
${body
  .trimEnd()
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
  return {
    tagKey,
    hashTagKey,
    hueDistance,
    uniqueSortedTags,
    buildTagColorMap,
    createTagColorRegistry,
  };
})();
`;
  fs.writeFileSync(TARGET, output);
}

if (require.main === module) {
  syncViewerTags();
}

module.exports = { syncViewerTags };
