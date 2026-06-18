#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(__dirname, "lib", "viewer-collection-import.js");
const TARGET = path.join(
  ROOT,
  "js",
  "viewer",
  "00-viewer-collection-import.js",
);

function syncViewerCollectionImport() {
  const source = fs.readFileSync(SOURCE, "utf8");
  const body = source.replace(/\nmodule\.exports = \{[\s\S]*$/, "");
  const output = `/* Generated from scripts/lib/viewer-collection-import.js — run npm run bundle-viewer */

const viewerCollectionImport = (function () {
${body
  .trimEnd()
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
  return {
    parseCollectionCsv,
    matchCollectionImportRows,
    matchBookIdForRow,
  };
})();
`;
  fs.writeFileSync(TARGET, output);
}

if (require.main === module) {
  syncViewerCollectionImport();
}

module.exports = { syncViewerCollectionImport };
