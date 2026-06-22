const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { VIEWER_CSS_FILES } = require("../scripts/css-manifest");

function concatViewerCssFromManifest(root, destPath) {
  const parts = VIEWER_CSS_FILES.map((file) => {
    const filePath = path.join(root, "css", file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing stylesheet: css/${file}`);
    }
    return fs.readFileSync(filePath, "utf8").trimEnd();
  });
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, `${parts.join("\n\n")}\n`);
  return destPath;
}

test("VIEWER_CSS_FILES includes tags.css after cards.css", () => {
  const cardsIndex = VIEWER_CSS_FILES.indexOf("cards.css");
  const tagsIndex = VIEWER_CSS_FILES.indexOf("tags.css");
  assert.ok(cardsIndex >= 0);
  assert.ok(tagsIndex > cardsIndex);
  assert.equal(VIEWER_CSS_FILES.length, 12);
});

test("concatViewerCss includes tag chip rules from tags.css", () => {
  const root = path.join(__dirname, "..");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arkham-css-"));
  const destPath = path.join(tmpDir, "viewer.css");
  concatViewerCssFromManifest(root, destPath);
  const css = fs.readFileSync(destPath, "utf8");
  assert.match(css, /\.book-detail-tag-chip/);
  assert.match(css, /\.edit-tag-chip/);
});
