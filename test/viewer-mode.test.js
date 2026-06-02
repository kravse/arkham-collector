const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  SERVE_ONLY_UI_KEYS,
  resolveServeEnabled,
  buildUiVisibility,
  serveUiVisibility,
  serveOnlyUiVisibility,
} = require("../scripts/lib/viewer-mode");
const { applyBuildHtmlTransforms } = require("../build.js");

const ROOT = path.join(__dirname, "..");
const VIEWER_HTML = path.join(ROOT, "viewer.html");

function assertAllServeOnlyHidden(visibility, messagePrefix) {
  for (const key of SERVE_ONLY_UI_KEYS) {
    assert.equal(
      visibility[key],
      false,
      `${messagePrefix}: ${key} should be hidden`,
    );
  }
}

function assertAllServeOnlyVisible(visibility, messagePrefix) {
  for (const key of SERVE_ONLY_UI_KEYS) {
    assert.equal(
      visibility[key],
      true,
      `${messagePrefix}: ${key} should be visible`,
    );
  }
}

test("resolveServeEnabled is always false on read-only build", () => {
  assert.equal(resolveServeEnabled({ readOnly: true }), false);
  assert.equal(
    resolveServeEnabled({ readOnly: true, healthCheckOk: true }),
    false,
  );
  assert.equal(resolveServeEnabled({ readOnly: false, healthCheckOk: true }), true);
  assert.equal(resolveServeEnabled({ readOnly: false, healthCheckOk: false }), false);
});

test("buildUiVisibility hides every serve-only control", () => {
  assertAllServeOnlyHidden(
    buildUiVisibility({ hiddenCount: 12 }),
    "read-only build",
  );
});

test("read-only build hides serve-only UI even when serveEnabled is mistakenly true", () => {
  assertAllServeOnlyHidden(
    serveOnlyUiVisibility({
      readOnly: true,
      serveEnabled: true,
      hiddenCount: 12,
      protocol: "https:",
    }),
    "read-only with stray serveEnabled",
  );
});

test("serveUiVisibility shows serve-only controls when hidden books exist", () => {
  assertAllServeOnlyVisible(
    serveUiVisibility({ hiddenCount: 3, protocol: "http:" }),
    "npm run serve",
  );
});

test("serve-only hidden stat filter stays off without hidden books", () => {
  const visibility = serveUiVisibility({ hiddenCount: 0, protocol: "http:" });

  assert.equal(visibility.bookOrderButton, true);
  assert.equal(visibility.showHiddenToggle, true);
  assert.equal(visibility.hiddenStatFilter, false);
  assert.equal(visibility.cardEditButton, true);
  assert.equal(visibility.detailEditButton, true);
});

test("detail edit stays hidden on file:// even when serve is enabled", () => {
  const visibility = serveOnlyUiVisibility({
    readOnly: false,
    serveEnabled: true,
    hiddenCount: 1,
    protocol: "file:",
  });

  assert.equal(visibility.detailEditButton, false);
  assert.equal(visibility.cardEditButton, true);
});

test("applyBuildHtmlTransforms injects READ_ONLY for deploy builds", () => {
  const html = fs.readFileSync(VIEWER_HTML, "utf8");
  const built = applyBuildHtmlTransforms(html, {
    collectionJsPath: "my_collection/collection.abc123.js",
    collectionCsvPath: "my_collection/my_collection.abc123.csv",
  });

  assert.match(built, /<script>window\.READ_ONLY = true;<\/script>/);
  assert.doesNotMatch(built, /window\.READ_ONLY = false/);
});

test("built HTML still contains serve-only markup but read-only runtime hides it", () => {
  const html = fs.readFileSync(VIEWER_HTML, "utf8");
  const built = applyBuildHtmlTransforms(html);

  assert.match(built, /id="book-order-btn"/);
  assert.match(built, /id="show-hidden-wrap"/);
  assert.match(built, /id="edit-dialog"/);

  const buildVisibility = buildUiVisibility({ hiddenCount: 99 });
  assertAllServeOnlyHidden(
    buildVisibility,
    "deploy runtime visibility",
  );
});
