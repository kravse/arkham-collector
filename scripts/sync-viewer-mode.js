#!/usr/bin/env node
/**
 * Copies scripts/lib/viewer-mode.js into js/viewer/00-viewer-mode.js for the
 * browser bundle (same IIFE scope as the other viewer partials).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(__dirname, "lib", "viewer-mode.js");
const TARGET = path.join(ROOT, "js", "viewer", "00-viewer-mode.js");

function syncViewerMode() {
  const source = fs.readFileSync(SOURCE, "utf8");
  const body = source.replace(/\nmodule\.exports = \{[\s\S]*$/, "");
  const output = `/* Generated from scripts/lib/viewer-mode.js — run npm run bundle-viewer */

const viewerMode = (function () {
${body
  .trimEnd()
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
  return {
    resolveServeEnabled,
    shouldShowBookOrderButton,
    shouldShowShowHiddenToggle,
    shouldShowHiddenStatFilter,
    shouldRenderCardEditButton,
    shouldRenderDetailEditButton,
    serveOnlyUiVisibility,
    buildUiVisibility,
    serveUiVisibility,
  };
})();
`;
  fs.writeFileSync(TARGET, output);
}

if (require.main === module) {
  syncViewerMode();
}

module.exports = { syncViewerMode };
