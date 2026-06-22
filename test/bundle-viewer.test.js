const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { bundleViewerJs, PARTS } = require("../scripts/bundle-viewer-js");

test("bundleViewerJs writes viewer-bundle.js with expected markers", () => {
  bundleViewerJs();
  const bundlePath = path.join(__dirname, "..", "js", "viewer-bundle.js");
  assert.ok(fs.existsSync(bundlePath));
  const bundle = fs.readFileSync(bundlePath, "utf8");
  assert.match(bundle, /"use strict"/);
  assert.match(bundle, /viewerFilters/);
  assert.match(bundle, /viewerTags/);
  assert.match(bundle, /function renderCardWantBadge/);
  assert.ok(bundle.length > 10_000);
});

test("every PARTS file exists under js/viewer", () => {
  const viewerDir = path.join(__dirname, "..", "js", "viewer");
  for (const part of PARTS) {
    const filePath = path.join(viewerDir, part.file);
    assert.ok(
      fs.existsSync(filePath),
      `missing partial: js/viewer/${part.file}`,
    );
  }
});
