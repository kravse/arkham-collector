const fs = require("fs");
const path = require("path");
const { isCoverDerivativePath } = require("./covers-files");

const MASTER_MAX_EDGE = 1600;
const MASTER_QUALITY = 85;
const COVER_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

function isCoverMasterFilename(name) {
  const ext = path.extname(name).toLowerCase();
  if (!COVER_IMAGE_EXTENSIONS.has(ext)) {
    return false;
  }
  return !isCoverDerivativePath(`covers/${name}`);
}

function listCoverMasterFiles(coversDir) {
  if (!fs.existsSync(coversDir)) {
    return [];
  }

  return fs
    .readdirSync(coversDir)
    .filter((name) => isCoverMasterFilename(name))
    .sort()
    .map((name) => path.join(coversDir, name));
}

function needsCoverShrink(metadata, maxEdge = MASTER_MAX_EDGE) {
  const width = metadata?.width || 0;
  const height = metadata?.height || 0;
  if (!width || !height) {
    return false;
  }
  return Math.max(width, height) > maxEdge;
}

function applyMasterOutputFormat(pipeline, format, quality = MASTER_QUALITY) {
  switch (format) {
    case "jpeg":
      return pipeline.jpeg({ quality, mozjpeg: true });
    case "png":
      return pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
    case "webp":
      return pipeline.webp({ quality });
    case "gif":
      return pipeline.gif();
    default:
      return pipeline.jpeg({ quality, mozjpeg: true });
  }
}

async function shrinkCoverMasterInPlace(absolutePath, options = {}) {
  const maxEdge = options.maxEdge ?? MASTER_MAX_EDGE;
  const quality = options.quality ?? MASTER_QUALITY;
  const dryRun = options.dryRun === true;
  let sharp = options.sharp;
  if (!sharp) {
    sharp = require("sharp");
  }

  const beforeBytes = fs.statSync(absolutePath).size;
  const image = sharp(absolutePath).rotate();
  const meta = await image.metadata();

  if (!needsCoverShrink(meta, maxEdge)) {
    return {
      action: "skipped",
      reason: "within max edge",
      path: absolutePath,
      beforeBytes,
      width: meta.width,
      height: meta.height,
    };
  }

  if (dryRun) {
    return {
      action: "would-shrink",
      path: absolutePath,
      beforeBytes,
      width: meta.width,
      height: meta.height,
      maxEdge,
    };
  }

  const tempPath = `${absolutePath}.shrink-tmp`;
  await applyMasterOutputFormat(
    image.resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    }),
    meta.format,
    quality,
  ).toFile(tempPath);

  const afterBytes = fs.statSync(tempPath).size;
  fs.renameSync(tempPath, absolutePath);
  const afterMeta = await sharp(absolutePath).metadata();

  return {
    action: "shrunk",
    path: absolutePath,
    beforeBytes,
    afterBytes,
    width: afterMeta.width,
    height: afterMeta.height,
  };
}

async function shrinkCoverMasters(options = {}) {
  const coversDir = options.coversDir;
  if (!coversDir) {
    throw new Error("shrinkCoverMasters requires coversDir");
  }

  const files = listCoverMasterFiles(coversDir);
  const stats = {
    scanned: files.length,
    shrunk: 0,
    skipped: 0,
    wouldShrink: 0,
    beforeBytes: 0,
    afterBytes: 0,
    errors: 0,
  };
  const results = [];

  for (const filePath of files) {
    try {
      const result = await shrinkCoverMasterInPlace(filePath, options);
      results.push(result);
      if (result.action === "shrunk") {
        stats.shrunk += 1;
        stats.beforeBytes += result.beforeBytes;
        stats.afterBytes += result.afterBytes;
      } else if (result.action === "would-shrink") {
        stats.wouldShrink += 1;
        stats.beforeBytes += result.beforeBytes;
      } else {
        stats.skipped += 1;
      }
    } catch (error) {
      stats.errors += 1;
      results.push({
        action: "error",
        path: filePath,
        error: error.message,
      });
    }
  }

  return { stats, results };
}

module.exports = {
  MASTER_MAX_EDGE,
  MASTER_QUALITY,
  isCoverMasterFilename,
  listCoverMasterFiles,
  needsCoverShrink,
  applyMasterOutputFormat,
  shrinkCoverMasterInPlace,
  shrinkCoverMasters,
};
