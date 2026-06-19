const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const sharp = require("sharp");
const {
  isCoverMasterFilename,
  listCoverMasterFiles,
  needsCoverShrink,
  shrinkCoverMasterInPlace,
} = require("../scripts/lib/cover-shrink");

test("isCoverMasterFilename skips build derivatives", () => {
  assert.equal(isCoverMasterFilename("the-outsider-419.jpg"), true);
  assert.equal(isCoverMasterFilename("the-outsider-419.card.webp"), false);
  assert.equal(isCoverMasterFilename("the-outsider-419.detail.webp"), false);
  assert.equal(isCoverMasterFilename("the-outsider-419.list.webp"), false);
  assert.equal(isCoverMasterFilename("notes.txt"), false);
});

test("needsCoverShrink compares longest edge to max", () => {
  assert.equal(needsCoverShrink({ width: 1200, height: 1800 }, 1600), true);
  assert.equal(needsCoverShrink({ width: 1200, height: 1500 }, 1600), false);
});

test("shrinkCoverMasterInPlace writes smaller image in place", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "arkham-cover-shrink-"));
  const filePath = path.join(tempDir, "sample-1.jpg");

  await sharp({
    create: {
      width: 2400,
      height: 3600,
      channels: 3,
      background: { r: 40, g: 80, b: 120 },
    },
  })
    .jpeg()
    .toFile(filePath);

  const beforeBytes = fs.statSync(filePath).size;
  const result = await shrinkCoverMasterInPlace(filePath, {
    sharp,
    maxEdge: 1600,
    quality: 85,
  });

  assert.equal(result.action, "shrunk");
  assert.ok(result.afterBytes < beforeBytes);
  assert.ok(result.width <= 1600);
  assert.ok(result.height <= 1600);

  const meta = await sharp(filePath).metadata();
  assert.ok(meta.width <= 1600);
  assert.ok(meta.height <= 1600);
});

test("shrinkCoverMasterInPlace skips images already within max edge", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "arkham-cover-shrink-"));
  const filePath = path.join(tempDir, "small-1.jpg");

  await sharp({
    create: {
      width: 800,
      height: 1200,
      channels: 3,
      background: { r: 10, g: 20, b: 30 },
    },
  })
    .jpeg()
    .toFile(filePath);

  const beforeBytes = fs.statSync(filePath).size;
  const result = await shrinkCoverMasterInPlace(filePath, {
    sharp,
    maxEdge: 1600,
  });

  assert.equal(result.action, "skipped");
  assert.equal(fs.statSync(filePath).size, beforeBytes);
});

test("listCoverMasterFiles ignores derivatives", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "arkham-cover-shrink-"));
  fs.writeFileSync(path.join(tempDir, "book-1.jpg"), "jpg");
  fs.writeFileSync(path.join(tempDir, "book-1.card.webp"), "webp");
  fs.writeFileSync(path.join(tempDir, "book-1.detail.webp"), "webp");

  const files = listCoverMasterFiles(tempDir);
  assert.deepEqual(files, [path.join(tempDir, "book-1.jpg")]);
});
