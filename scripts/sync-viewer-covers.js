#!/usr/bin/env node
/**
 * Copies scripts/lib/viewer-covers.js into js/viewer/00-viewer-covers.js for the
 * browser bundle (same IIFE scope as the other viewer partials).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(__dirname, "lib", "viewer-covers.js");
const TARGET = path.join(ROOT, "js", "viewer", "00-viewer-covers.js");

function syncViewerCovers() {
  const source = fs.readFileSync(SOURCE, "utf8");
  const body = source.replace(/\nmodule\.exports = \{[\s\S]*$/, "");
  const output = `/* Generated from scripts/lib/viewer-covers.js — run npm run bundle-viewer */

const viewerCovers = (function () {
${body.trimEnd()
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
  return {
    slugifyCover,
    wikiTitleFromUrl,
    coverSlugFromBook,
    appendCoverCacheKey,
    getCoverSources,
  };
})();
`;
  fs.writeFileSync(TARGET, output);
}

if (require.main === module) {
  syncViewerCovers();
}

module.exports = { syncViewerCovers };
