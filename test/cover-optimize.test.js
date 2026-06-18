const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const sharp = require("sharp");
const {
  coverDerivativePaths,
  applyOptimizedCoverPaths,
  optimizeCoverPaths,
} = require("../scripts/lib/cover-optimize");

test("coverDerivativePaths adds card and detail webp suffixes", () => {
  assert.deepEqual(
    coverDerivativePaths("covers/the-dunwich-horror-42.jpg"),
    {
      card: "covers/the-dunwich-horror-42.card.webp",
      detail: "covers/the-dunwich-horror-42.detail.webp",
    },
  );
});

test("applyOptimizedCoverPaths rewrites cover paths for optimized sources", () => {
  const masterPath = "covers/baker-street-irregular-232.jpg";
  const books = [
    {
      id: 232,
      coverImageFile: masterPath,
    },
    {
      id: 2,
      coverImageFile: "covers/missing-book-2.png",
    },
  ];
  const optimizedBySource = new Map([
    [
      masterPath,
      {
        card: "covers/baker-street-irregular-232.card.webp",
        detail: "covers/baker-street-irregular-232.detail.webp",
      },
    ],
  ]);

  const next = applyOptimizedCoverPaths(books, optimizedBySource);
  assert.equal(next[0].coverImageFile, "covers/baker-street-irregular-232.card.webp");
  assert.equal(next[0].coverImageDetailFile, "covers/baker-street-irregular-232.detail.webp");
  assert.equal(next[1].coverImageFile, "covers/missing-book-2.png");
  assert.equal(next[1].coverImageDetailFile, undefined);
});

test("optimizeCoverPaths writes card and detail webp files", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "arkham-cover-opt-"));
  const destRoot = path.join(tempRoot, "build");
  const sourceDir = path.join(tempRoot, "covers");
  fs.mkdirSync(sourceDir, { recursive: true });

  const sourcePath = path.join(sourceDir, "sample-1.jpg");
  await sharp({
    create: {
      width: 1200,
      height: 1800,
      channels: 3,
      background: { r: 120, g: 80, b: 40 },
    },
  })
    .jpeg()
    .toFile(sourcePath);

  const { optimizedBySource, stats } = await optimizeCoverPaths(
    ["covers/sample-1.jpg"],
    {
      root: tempRoot,
      destRoot,
      sharp,
      cardWidth: 480,
      detailWidth: 960,
    },
  );

  assert.equal(stats.processed, 1);
  assert.equal(stats.missing, 0);
  assert.equal(optimizedBySource.size, 1);
  assert.equal(
    optimizedBySource.get("covers/sample-1.jpg").card,
    "covers/sample-1.card.webp",
  );

  const cardPath = path.join(destRoot, "covers/sample-1.card.webp");
  const detailPath = path.join(destRoot, "covers/sample-1.detail.webp");
  assert.ok(fs.existsSync(cardPath));
  assert.ok(fs.existsSync(detailPath));

  const cardMeta = await sharp(cardPath).metadata();
  const detailMeta = await sharp(detailPath).metadata();
  assert.ok(cardMeta.width <= 480);
  assert.ok(detailMeta.width <= 960);
  assert.equal(cardMeta.format, "webp");
  assert.equal(detailMeta.format, "webp");
});
