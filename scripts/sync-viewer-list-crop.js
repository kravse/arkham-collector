#!/usr/bin/env node
/**
 * Copies scripts/lib/cover-list-crop.js into js/viewer/00-viewer-list-crop.js for the
 * browser bundle (same IIFE scope as the other viewer partials).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(__dirname, "lib", "cover-list-crop.js");
const TARGET = path.join(ROOT, "js", "viewer", "00-viewer-list-crop.js");

function syncViewerListCrop() {
  const source = fs.readFileSync(SOURCE, "utf8");
  let body = source.replace(/\nmodule\.exports = \{[\s\S]*$/, "");
  body = body.replace(
    /const \{ findCoverMasterPath \} = require\("\.\/covers-files"\);\n/,
    "",
  );
  body = body.replace(/function getEditForBook[\s\S]*?\n}\n\nfunction buildListFocalByMaster[\s\S]*?\n}\n\n/, "");
  body = body.replace(/function parseListCoverFocusField[\s\S]*?\n}\n\nfunction parseListCoverFocusPatch[\s\S]*?\n}\n\n/, "");
  body = body.replace(/function applyListCoverFocusPatch[\s\S]*?\n}\n\n/, "");
  body = body.replace(/function coverSourceKey[\s\S]*?\n}\n\n/, "");

  const output = `/* Generated from scripts/lib/cover-list-crop.js — run npm run bundle-viewer */

const viewerListCrop = (function () {
${body.trimEnd()
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
  return {
    LIST_WIDTH,
    LIST_HEIGHT,
    LIST_FOCAL_X,
    LIST_FOCAL_Y,
    isDefaultListCoverFocus,
    resolveListCoverFocus,
    getListCoverImagePresentation,
    getListCoverCacheKey,
    computeListCoverCrop,
    computeListCoverPreviewLayout,
  };
})();
`;
  fs.writeFileSync(TARGET, output);
}

if (require.main === module) {
  syncViewerListCrop();
}

module.exports = { syncViewerListCrop };
