const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  syncViewerModule,
  syncAllViewerModules,
} = require("../scripts/sync-viewer-module");
const { VIEWER_SYNC_ENTRIES } = require("../scripts/viewer-sync-config");

const ROOT = path.join(__dirname, "..");
const FILTERS_TARGET = path.join(ROOT, "js", "viewer", "00-viewer-filters.js");

test("syncViewerModule writes viewerFilters IIFE for filters entry", () => {
  const entry = VIEWER_SYNC_ENTRIES.find((e) => e.globalName === "viewerFilters");
  assert.ok(entry);
  syncViewerModule(entry);
  const output = fs.readFileSync(FILTERS_TARGET, "utf8");
  assert.match(output, /const viewerFilters = \(function \(\) \{/);
  assert.match(output, /function matchesSearch\(/);
  assert.match(output, /return \{\s*\n\s*prepareBookSearchIndex,/);
  assert.match(output, /pickRandomBook,\s*\n\s*\};\s*\n\}\)\(\);/);
});

test("syncAllViewerModules writes every configured target", () => {
  syncAllViewerModules();
  for (const entry of VIEWER_SYNC_ENTRIES) {
    const targetPath = path.join(ROOT, "js", "viewer", entry.target);
    assert.ok(fs.existsSync(targetPath), `missing ${entry.target}`);
    const output = fs.readFileSync(targetPath, "utf8");
    assert.match(
      output,
      new RegExp(`const ${entry.globalName} = \\(function \\(\\)`),
    );
    assert.doesNotMatch(output, /\brequire\(/, `${entry.target} must not use require()`);
  }
});
