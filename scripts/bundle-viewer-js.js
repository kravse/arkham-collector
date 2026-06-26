#!/usr/bin/env node
/**
 * Concatenates js/viewer/ partials into js/viewer-bundle.js for a single script tag.
 */
const fs = require("fs");
const path = require("path");
const { syncAllViewerModules } = require("./sync-viewer-module");

const ROOT = path.join(__dirname, "..");
const VIEWER_DIR = path.join(ROOT, "js", "viewer");

const PARTS = [
  {
    file: "01-config-dom-state.js",
    title: "Configuration, DOM references, and mutable state",
  },
  {
    file: "00-viewer-card-html.js",
    title:
      "Card HTML helpers (generated from scripts/lib/viewer-card-html.js)",
  },
  {
    file: "00-viewer-want-order-normalize.js",
    title:
      "Want order normalization (generated from scripts/lib/viewer-want-order-normalize.js)",
  },
  {
    file: "00-viewer-user-state.js",
    title:
      "Unified user state persistence (generated from scripts/lib/viewer-user-state.js)",
  },
  {
    file: "00-viewer-gist-sync.js",
    title:
      "GitHub gist sync helpers (generated from scripts/lib/viewer-gist-sync.js)",
  },
  {
    file: "00-viewer-collection-import.js",
    title:
      "Collection CSV import (generated from scripts/lib/viewer-collection-import.js)",
  },
  {
    file: "00-viewer-covers.js",
    title: "Cover source helpers (generated from scripts/lib/viewer-covers.js)",
  },
  {
    file: "00-viewer-list-crop.js",
    title:
      "List cover crop math (generated from scripts/lib/cover-list-crop.js)",
  },
  {
    file: "00-viewer-mode.js",
    title:
      "Shared read-only vs serve visibility (generated from scripts/lib/viewer-mode.js)",
  },
  {
    file: "00-viewer-filters.js",
    title: "Shared filter helpers (generated from scripts/lib/viewer-filters.js)",
  },
  {
    file: "00-viewer-tags.js",
    title:
      "Tag helpers (generated from scripts/lib/tag-normalize.js)",
  },
  {
    file: "02-books-parse.js",
    title: "Book list helpers and CSV / title parsing",
  },
  {
    file: "03-collection.js",
    title: "Collection, want list, storage, and user state",
  },
  {
    file: "00-viewer-sort.js",
    title: "Shared sort helpers (generated from scripts/lib/viewer-sort.js)",
  },
  {
    file: "00-viewer-want-order.js",
    title: "Want list order helpers (generated from scripts/lib/viewer-want-order.js)",
  },
  {
    file: "00-viewer-pointer-reorder.js",
    title:
      "Pointer reorder helpers (generated from scripts/lib/viewer-pointer-reorder.js)",
  },
  {
    file: "04-search.js",
    title: "Search chips, tag autocomplete, and compound query",
  },
  {
    file: "04-catalog.js",
    title: "Sort, search, filters, and visible book list",
  },
  {
    file: "05-render.js",
    title: "Covers, cards, stats, and main grid render",
  },
  {
    file: "06-detail-dialogs.js",
    title: "Book detail overlay, settings, and attribution dialogs",
  },
  {
    file: "07-list-cover-picker.js",
    title: "List cover crop picker in the edit dialog",
  },
  {
    file: "07-edit-api.js",
    title: "Edit dialog and dev-server PATCH / DELETE API",
  },
  {
    file: "07-edit-tags.js",
    title: "Tag editing in the dev-server edit dialog",
  },
  {
    file: "09-order.js",
    title: "Admin book order dialog",
  },
  {
    file: "10-want-order.js",
    title: "Want list priority drag reorder",
  },
  {
    file: "08-init-grid.js",
    title: "Grid and header filter event listeners",
  },
  {
    file: "08-init-detail.js",
    title: "Detail overlay and cover lightbox event listeners",
  },
  {
    file: "08-init-edit.js",
    title: "Edit dialog, settings, search, and startup",
  },
];

function writeBundle() {
  const ordered = PARTS.map((p) => path.join(VIEWER_DIR, p.file));
  const missing = ordered.filter((file) => !fs.existsSync(file));
  if (missing.length) {
    throw new Error(
      `Missing viewer partials: ${missing.map((f) => path.basename(f)).join(", ")}`,
    );
  }
  const bundle = ordered
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n\n");
  fs.writeFileSync(path.join(ROOT, "js", "viewer-bundle.js"), `${bundle}\n`);
}

function bundleViewerJs() {
  syncAllViewerModules();
  writeBundle();
}

if (require.main === module) {
  bundleViewerJs();
  console.log(
    `Wrote ${PARTS.length} files under js/viewer/ and js/viewer-bundle.js`,
  );
}

module.exports = { bundleViewerJs, PARTS, writeBundle };
