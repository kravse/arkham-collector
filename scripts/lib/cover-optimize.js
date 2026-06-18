const fs = require("fs");
const path = require("path");

const CARD_MAX_WIDTH = 480;
const DETAIL_MAX_WIDTH = 960;
const WEBP_QUALITY = 80;

function coverDerivativePaths(relativePath) {
  const normalized = String(relativePath || "").replace(/\\/g, "/");
  const parsed = path.posix.parse(normalized);
  const base = parsed.dir ? `${parsed.dir}/${parsed.name}` : parsed.name;
  return {
    card: `${base}.card.webp`,
    detail: `${base}.detail.webp`,
  };
}

function coverSourceKey(relativePath) {
  return String(relativePath || "").replace(/\\/g, "/");
}

function applyOptimizedCoverPaths(books, optimizedBySource) {
  const lookup =
    optimizedBySource instanceof Map
      ? optimizedBySource
      : new Map(Object.entries(optimizedBySource || {}));

  return books.map((book) => {
    const source = book.coverEditPath || book.coverImageFile;
    if (!source) {
      return book;
    }
    const optimized = lookup.get(coverSourceKey(source));
    if (!optimized) {
      return book;
    }
    const { coverEditPath: _coverEditPath, ...rest } = book;
    return {
      ...rest,
      coverImageFile: optimized.card,
      coverImageDetailFile: optimized.detail,
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
  const quality = options.quality ?? WEBP_QUALITY;
  const derivatives = coverDerivativePaths(relativeSource);
  const cardAbs = path.join(destRoot, derivatives.card);
  const detailAbs = path.join(destRoot, derivatives.detail);

  fs.mkdirSync(path.dirname(cardAbs), { recursive: true });
  fs.mkdirSync(path.dirname(detailAbs), { recursive: true });

  const image = sharp(sourcePath).rotate();
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

  return {
    card: derivatives.card.replace(/\\/g, "/"),
    detail: derivatives.detail.replace(/\\/g, "/"),
    cardBytes: fs.statSync(cardAbs).size,
    detailBytes: fs.statSync(detailAbs).size,
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

  const optimizedBySource = new Map();
  const stats = {
    processed: 0,
    missing: 0,
    cardBytes: 0,
    detailBytes: 0,
  };

  for (const relativePath of coverPaths) {
    const normalized = coverSourceKey(relativePath);
    const sourcePath = path.join(root, normalized);
    if (!fs.existsSync(sourcePath)) {
      stats.missing += 1;
      continue;
    }

    const result = await writeOptimizedCoverVariants(
      sourcePath,
      normalized,
      destRoot,
      sharp,
      options,
    );
    optimizedBySource.set(normalized, result);
    stats.processed += 1;
    stats.cardBytes += result.cardBytes;
    stats.detailBytes += result.detailBytes;
  }

  return { optimizedBySource, stats };
}

module.exports = {
  CARD_MAX_WIDTH,
  DETAIL_MAX_WIDTH,
  WEBP_QUALITY,
  coverDerivativePaths,
  coverSourceKey,
  applyOptimizedCoverPaths,
  writeOptimizedCoverVariants,
  optimizeCoverPaths,
};
