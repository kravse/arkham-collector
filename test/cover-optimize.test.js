const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const sharp = require("sharp");
const {
  LIST_WIDTH,
  LIST_HEIGHT,
  LIST_FOCAL_X,
  LIST_FOCAL_Y,
} = require("../scripts/lib/cover-list-crop");
const {
  coverDerivativePaths,
  applyOptimizedCoverPaths,
  optimizeCoverPaths,
} = require("../scripts/lib/cover-optimize");

test("coverDerivativePaths adds card, detail, and list webp suffixes", () => {
  assert.deepEqual(
    coverDerivativePaths("covers/the-dunwich-horror-42.jpg"),
    {
      card: "covers/the-dunwich-horror-42.card.webp",
      detail: "covers/the-dunwich-horror-42.detail.webp",
      list: "covers/the-dunwich-horror-42.list.webp",
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
        list: "covers/baker-street-irregular-232.list.webp",
      },
    ],
  ]);

  const next = applyOptimizedCoverPaths(books, optimizedBySource);
  assert.equal(next[0].coverImageFile, "covers/baker-street-irregular-232.card.webp");
  assert.equal(next[0].coverImageDetailFile, "covers/baker-street-irregular-232.detail.webp");
  assert.equal(next[0].coverImageListFile, "covers/baker-street-irregular-232.list.webp");
  assert.equal(next[1].coverImageFile, "covers/missing-book-2.png");
  assert.equal(next[1].coverImageDetailFile, undefined);
  assert.equal(next[1].coverImageListFile, undefined);
});

test("optimizeCoverPaths writes card, detail, and list webp files", async () => {
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

  const focalBySource = new Map([
    ["covers/sample-1.jpg", { x: 0.35, y: 0.55 }],
  ]);

  const { optimizedBySource, stats } = await optimizeCoverPaths(
    ["covers/sample-1.jpg"],
    {
      root: tempRoot,
      destRoot,
      sharp,
      cardWidth: 480,
      detailWidth: 960,
      focalBySource,
    },
  );

  assert.equal(stats.processed, 1);
  assert.equal(stats.missing, 0);
  assert.ok(stats.listBytes > 0);
  assert.equal(optimizedBySource.size, 1);
  assert.equal(
    optimizedBySource.get("covers/sample-1.jpg").list,
    "covers/sample-1.list.webp",
  );

  const listPath = path.join(destRoot, "covers/sample-1.list.webp");
  assert.ok(fs.existsSync(listPath));

  const listMeta = await sharp(listPath).metadata();
  assert.equal(listMeta.width, LIST_WIDTH);
  assert.equal(listMeta.height, LIST_HEIGHT);
});

test("optimizeCoverPaths uses default focal when map entry is missing", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "arkham-cover-opt-"));
  const destRoot = path.join(tempRoot, "build");
  const sourceDir = path.join(tempRoot, "covers");
  fs.mkdirSync(sourceDir, { recursive: true });

  const sourcePath = path.join(sourceDir, "sample-2.jpg");
  await sharp({
    create: {
      width: 1200,
      height: 1800,
      channels: 3,
      background: { r: 20, g: 40, b: 200 },
    },
  })
    .jpeg()
    .toFile(sourcePath);

  await optimizeCoverPaths(["covers/sample-2.jpg"], {
    root: tempRoot,
    destRoot,
    sharp,
    focalBySource: new Map(),
  });

  const listPath = path.join(destRoot, "covers/sample-2.list.webp");
  assert.ok(fs.existsSync(listPath));
  assert.equal(LIST_FOCAL_X, 0.5);
  assert.equal(LIST_FOCAL_Y, 0.7);
});
