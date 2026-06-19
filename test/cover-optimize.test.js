const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const sharp = require("sharp");
const {
  LIST_WIDTH,
  LIST_HEIGHT,
  LIST_FOCAL_Y,
  coverDerivativePaths,
  computeListCoverCrop,
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

test("computeListCoverCrop centers horizontally and anchors at focal Y", () => {
  const crop = computeListCoverCrop(1200, 1800, LIST_WIDTH, LIST_HEIGHT, LIST_FOCAL_Y);
  assert.equal(crop.width, 1200);
  assert.equal(crop.height, 80);
  assert.equal(crop.left, 0);
  assert.equal(crop.top, Math.round(0.7 * 1800 - 80 / 2));
});

test("computeListCoverCrop clamps top when focal point is near the bottom", () => {
  const crop = computeListCoverCrop(800, 200, LIST_WIDTH, LIST_HEIGHT, 0.95);
  assert.equal(crop.top + crop.height, 200);
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
  assert.ok(stats.listBytes > 0);
  assert.equal(optimizedBySource.size, 1);
  assert.equal(
    optimizedBySource.get("covers/sample-1.jpg").card,
    "covers/sample-1.card.webp",
  );
  assert.equal(
    optimizedBySource.get("covers/sample-1.jpg").list,
    "covers/sample-1.list.webp",
  );

  const cardPath = path.join(destRoot, "covers/sample-1.card.webp");
  const detailPath = path.join(destRoot, "covers/sample-1.detail.webp");
  const listPath = path.join(destRoot, "covers/sample-1.list.webp");
  assert.ok(fs.existsSync(cardPath));
  assert.ok(fs.existsSync(detailPath));
  assert.ok(fs.existsSync(listPath));

  const cardMeta = await sharp(cardPath).metadata();
  const detailMeta = await sharp(detailPath).metadata();
  const listMeta = await sharp(listPath).metadata();
  assert.ok(cardMeta.width <= 480);
  assert.ok(detailMeta.width <= 960);
  assert.equal(listMeta.width, LIST_WIDTH);
  assert.equal(listMeta.height, LIST_HEIGHT);
  assert.equal(cardMeta.format, "webp");
  assert.equal(detailMeta.format, "webp");
  assert.equal(listMeta.format, "webp");
});
