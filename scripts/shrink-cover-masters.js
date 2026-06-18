#!/usr/bin/env node

const path = require("path");
const { COVERS_DIR } = require("./config");
const {
  MASTER_MAX_EDGE,
  MASTER_QUALITY,
  shrinkCoverMasters,
} = require("./lib/cover-shrink");

function parseArgs(argv) {
  const options = {
    dryRun: false,
    maxEdge: MASTER_MAX_EDGE,
    quality: MASTER_QUALITY,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--max-edge") {
      options.maxEdge = Number(argv[++i]);
    } else if (arg === "--quality") {
      options.quality = Number(argv[++i]);
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }

  return options;
}

function printHelp() {
  console.log(`Shrink cover master images in covers/ (in place).

Skips build derivatives (*.card.webp, *.detail.webp). Only files whose longest
edge exceeds the max are resized; smaller images are left unchanged.

Usage:
  npm run shrink-cover-masters [-- --dry-run] [-- --max-edge 1600] [-- --quality 85]

Options:
  --dry-run       Report files that would be resized without writing
  --max-edge N    Longest edge in pixels (default ${MASTER_MAX_EDGE})
  --quality N     JPEG/WebP quality 1-100 (default ${MASTER_QUALITY})
`);
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (!Number.isFinite(options.maxEdge) || options.maxEdge < 1) {
    throw new Error("--max-edge must be a positive number");
  }
  if (!Number.isFinite(options.quality) || options.quality < 1 || options.quality > 100) {
    throw new Error("--quality must be between 1 and 100");
  }

  const { stats, results } = await shrinkCoverMasters({
    coversDir: COVERS_DIR,
    dryRun: options.dryRun,
    maxEdge: options.maxEdge,
    quality: options.quality,
  });

  for (const result of results) {
    if (result.action === "would-shrink") {
      console.log(
        `Would shrink ${path.basename(result.path)} (${result.width}x${result.height}, ${formatBytes(result.beforeBytes)})`,
      );
    } else if (result.action === "shrunk") {
      console.log(
        `Shrunk ${path.basename(result.path)} (${result.width}x${result.height}, ${formatBytes(result.beforeBytes)} -> ${formatBytes(result.afterBytes)})`,
      );
    } else if (result.action === "error") {
      console.error(`Error ${path.basename(result.path)}: ${result.error}`);
    }
  }

  const prefix = options.dryRun ? "Dry run:" : "Done:";
  console.log(
    `${prefix} scanned ${stats.scanned} master cover(s); ` +
      `${options.dryRun ? `would shrink ${stats.wouldShrink}` : `shrunk ${stats.shrunk}`}, ` +
      `skipped ${stats.skipped}` +
      (stats.errors ? `, errors ${stats.errors}` : "") +
      (stats.shrunk || stats.wouldShrink
        ? `; ${formatBytes(stats.beforeBytes)}` +
          (stats.shrunk ? ` -> ${formatBytes(stats.afterBytes)}` : "")
        : ""),
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = { main, parseArgs };
