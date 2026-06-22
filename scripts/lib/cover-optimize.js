const fs = require("fs");
const path = require("path");
const { findCoverMasterPath } = require("./covers-files");
const {
  LIST_WIDTH,
  LIST_HEIGHT,
  LIST_FOCAL_X,
  LIST_FOCAL_Y,
  computeListCoverCrop,
} = require("./cover-list-crop");
const { coverSourceKey, coverDerivativePaths } = require("./covers-shared");

const CARD_MAX_WIDTH = 480;
const DETAIL_MAX_WIDTH = 960;
const WEBP_QUALITY = 80;

function applyOptimizedCoverPaths(books, optimizedBySource) {
  const lookup =
    optimizedBySource instanceof Map
      ? optimizedBySource
      : new Map(Object.entries(optimizedBySource || {}));

  return books.map((book) => {
    const master = findCoverMasterPath(book, books);
    if (!master) {
      return book;
    }
    const optimized = lookup.get(coverSourceKey(master));
    if (!optimized) {
      return book;
    }
    return {
      ...book,
      coverImageFile: optimized.card,
      coverImageDetailFile: optimized.detail,
      coverImageListFile: optimized.list,
    };
  });
}

async function writeOptimizedCoverVariants(
  sourcePath,
  relativeSource,
  destRoot,
  sharp,
  options = {},
) {
  const cardWidth = options.cardWidth ?? CARD_MAX_WIDTH;
  const detailWidth = options.detailWidth ?? DETAIL_MAX_WIDTH;
  const listWidth = options.listWidth ?? LIST_WIDTH;
  const listHeight = options.listHeight ?? LIST_HEIGHT;
  const listFocalX = options.listFocalX ?? LIST_FOCAL_X;
  const listFocalY = options.listFocalY ?? LIST_FOCAL_Y;
  const quality = options.quality ?? WEBP_QUALITY;
  const derivatives = coverDerivativePaths(relativeSource);
  const cardAbs = path.join(destRoot, derivatives.card);
  const detailAbs = path.join(destRoot, derivatives.detail);
  const listAbs = path.join(destRoot, derivatives.list);

  fs.mkdirSync(path.dirname(cardAbs), { recursive: true });
  fs.mkdirSync(path.dirname(detailAbs), { recursive: true });
  fs.mkdirSync(path.dirname(listAbs), { recursive: true });

  const image = sharp(sourcePath).rotate();
  const metadata = await image.metadata();
  const crop = computeListCoverCrop(
    metadata.width,
    metadata.height,
    listWidth,
    listHeight,
    listFocalX,
    listFocalY,
  );

  await image
    .clone()
    .resize({ width: cardWidth, withoutEnlargement: true })
    .webp({ quality })
    .toFile(cardAbs);
  await image
    .clone()
    .resize({ width: detailWidth, withoutEnlargement: true })
    .webp({ quality })
    .toFile(detailAbs);
  await image
    .clone()
    .extract(crop)
    .resize(listWidth, listHeight)
    .webp({ quality })
    .toFile(listAbs);

  return {
    card: derivatives.card.replace(/\\/g, "/"),
    detail: derivatives.detail.replace(/\\/g, "/"),
    list: derivatives.list.replace(/\\/g, "/"),
    cardBytes: fs.statSync(cardAbs).size,
    detailBytes: fs.statSync(detailAbs).size,
    listBytes: fs.statSync(listAbs).size,
  };
}

async function optimizeCoverPaths(coverPaths, options = {}) {
  const root = options.root || process.cwd();
  const destRoot = options.destRoot;
  if (!destRoot) {
    throw new Error("optimizeCoverPaths requires destRoot");
  }

  let sharp = options.sharp;
  if (!sharp) {
    sharp = require("sharp");
  }

  const focalBySource =
    options.focalBySource instanceof Map ? options.focalBySource : new Map();

  const optimizedBySource = new Map();
  const stats = {
    processed: 0,
    missing: 0,
    cardBytes: 0,
    detailBytes: 0,
    listBytes: 0,
  };

  for (const relativePath of coverPaths) {
    const normalized = coverSourceKey(relativePath);
    const sourcePath = path.join(root, normalized);
    if (!fs.existsSync(sourcePath)) {
      stats.missing += 1;
      continue;
    }

    const focal = focalBySource.get(normalized) || {
      x: LIST_FOCAL_X,
      y: LIST_FOCAL_Y,
    };
    const result = await writeOptimizedCoverVariants(
      sourcePath,
      normalized,
      destRoot,
      sharp,
      {
        ...options,
        listFocalX: focal.x,
        listFocalY: focal.y,
      },
    );
    optimizedBySource.set(normalized, result);
    stats.processed += 1;
    stats.cardBytes += result.cardBytes;
    stats.detailBytes += result.detailBytes;
    stats.listBytes += result.listBytes;
  }

  return { optimizedBySource, stats };
}

module.exports = {
  CARD_MAX_WIDTH,
  DETAIL_MAX_WIDTH,
  LIST_WIDTH,
  LIST_HEIGHT,
  LIST_FOCAL_X,
  LIST_FOCAL_Y,
  WEBP_QUALITY,
  coverDerivativePaths,
  coverSourceKey,
  computeListCoverCrop,
  applyOptimizedCoverPaths,
  writeOptimizedCoverVariants,
  optimizeCoverPaths,
};
