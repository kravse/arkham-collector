#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(__dirname, "lib", "viewer-collection-source.js");
const TARGET = path.join(ROOT, "js", "viewer", "00-viewer-collection-source.js");

function syncViewerCollectionSource() {
  const source = fs.readFileSync(SOURCE, "utf8");
  const body = source.replace(/\nmodule\.exports = \{[\s\S]*$/, "");
  const output = `/* Generated from scripts/lib/viewer-collection-source.js — run npm run bundle-viewer */

const viewerCollectionSource = (function () {
${body
  .trimEnd()
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
  return {
    parseSampleUrlOverride,
    resolveCollectionSourceOnLoad,
  };
})();
`;
  fs.writeFileSync(TARGET, output);
}

if (require.main === module) {
  syncViewerCollectionSource();
}

module.exports = { syncViewerCollectionSource };
