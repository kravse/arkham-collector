#!/usr/bin/env node
/**
 * Copies scripts/lib/viewer-filters.js into js/viewer/00-viewer-filters.js for the
 * browser bundle (same IIFE scope as the other viewer partials).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(__dirname, "lib", "viewer-filters.js");
const TARGET = path.join(ROOT, "js", "viewer", "00-viewer-filters.js");

function syncViewerFilters() {
  const source = fs.readFileSync(SOURCE, "utf8");
  const body = source.replace(/\nmodule\.exports = \{[\s\S]*$/, "");
  const output = `/* Generated from scripts/lib/viewer-filters.js — run npm run bundle-viewer */

const viewerFilters = (function () {
${body
  .trimEnd()
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
  return {
    prepareBookSearchIndex,
    parseSearchQuery,
    formatTagSearchQuery,
    matchesTagSearch,
    matchesSearch,
    isMagazineIssue,
    passesHiddenVisibility,
    passesBookVisibility,
    passesMycroftImprintFilter,
    isCollected,
    isOrdered,
    isInCollection,
    passesCollectionFilter,
    passesWantFilter,
    filterVisibleBooks,
    cycleMycroftFilter,
    cycleCollectionFilter,
    hasAnyOrderedBooks,
    pickRandomBook,
  };
})();
`;
  fs.writeFileSync(TARGET, output);
}

if (require.main === module) {
  syncViewerFilters();
}

module.exports = { syncViewerFilters };
