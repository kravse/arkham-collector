#!/usr/bin/env node
/**
 * Splits js/viewer/_body.js into ordered partials (shared IIFE scope) or
 * concatenates partials into js/viewer-bundle.js for a single script tag.
 */
const fs = require("fs");
const path = require("path");
const { syncViewerSort } = require("./sync-viewer-sort");
const { syncViewerFilters } = require("./sync-viewer-filters");
const { syncViewerMode } = require("./sync-viewer-mode");
const { syncViewerCollectionSource } = require("./sync-viewer-collection-source");

const ROOT = path.join(__dirname, "..");
const VIEWER_DIR = path.join(ROOT, "js", "viewer");
const BODY = path.join(VIEWER_DIR, "_body.js");

const PARTS = [
  {
    file: "01-config-dom-state.js",
    title: "Configuration, DOM references, and mutable state",
    start: 1,
    end: 162,
    prefix: '(function () {\n  "use strict";\n\n',
  },
  {
    file: "00-viewer-collection-source.js",
    title:
      "Collection source URL override (generated from scripts/lib/viewer-collection-source.js)",
  },
  {
    file: "00-viewer-mode.js",
    title: "Shared read-only vs serve visibility (generated from scripts/lib/viewer-mode.js)",
  },
  {
    file: "00-viewer-filters.js",
    title: "Shared filter helpers (generated from scripts/lib/viewer-filters.js)",
  },
  {
    file: "02-books-parse.js",
    title: "Book list helpers and CSV / title parsing",
    start: 163,
    end: 325,
  },
  {
    file: "03-collection.js",
    title: "Sample and own collection, want list, localStorage",
    start: 326,
    end: 586,
  },
  {
    file: "00-viewer-sort.js",
    title: "Shared sort helpers (generated from scripts/lib/viewer-sort.js)",
  },
  {
    file: "04-catalog.js",
    title: "Sort, search, filters, and visible book list",
    start: 587,
    end: 702,
  },
  {
    file: "05-render.js",
    title: "Covers, cards, stats, and main grid render",
    start: 703,
    end: 1247,
  },
  {
    file: "06-detail-dialogs.js",
    title: "Book detail overlay, settings, and attribution dialogs",
    start: 1248,
    end: 1548,
  },
  {
    file: "07-edit-api.js",
    title: "Edit dialog and dev-server PATCH / DELETE API",
    start: 1549,
    end: 1726,
  },
  {
    file: "09-order.js",
    title: "Admin book order dialog",
  },
  {
    file: "08-init.js",
    title: "Event listeners and application startup",
    start: 1727,
    end: null,
    suffix: "\n})();\n",
  },
];

function readBodyLines() {
  return fs.readFileSync(BODY, "utf8").split("\n");
}

function sliceLines(lines, start, end) {
  const slice = lines.slice(start - 1, end == null ? lines.length : end);
  return slice.join("\n");
}

function writePartials() {
  const lines = readBodyLines();
  for (const part of PARTS) {
    let content = sliceLines(lines, part.start, part.end);
    const header = `/* ${part.title} */\n\n`;
    content = (part.prefix || "") + header + content + (part.suffix || "");
    const outPath = path.join(VIEWER_DIR, part.file);
    fs.writeFileSync(outPath, `${content.trimEnd()}\n`);
  }
}

function writeBundle() {
  const ordered = PARTS.map((p) => path.join(VIEWER_DIR, p.file));
  const bundle = ordered
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n\n");
  fs.writeFileSync(path.join(ROOT, "js", "viewer-bundle.js"), `${bundle}\n`);
}

function bundleViewerJs() {
  syncViewerSort();
  syncViewerFilters();
  syncViewerMode();
  syncViewerCollectionSource();
  if (!fs.existsSync(BODY)) {
    const partials = PARTS.map((p) => path.join(VIEWER_DIR, p.file));
    if (partials.every((file) => fs.existsSync(file))) {
      writeBundle();
      return;
    }
    throw new Error(
      `Missing ${BODY} and incomplete js/viewer/ partials — cannot bundle viewer JS.`,
    );
  }
  writePartials();
  writeBundle();
}

if (require.main === module) {
  bundleViewerJs();
  console.log(
    `Wrote ${PARTS.length} files under js/viewer/ and js/viewer-bundle.js`,
  );
}

module.exports = { bundleViewerJs };
