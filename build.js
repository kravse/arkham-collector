#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { loadEdits, applyEditsToBooks } = require("./scripts/lib/edits");
const { writeViewerBookScripts } = require("./scripts/lib/books");
const {
  resolveCoverPathsInBooks,
  collectCoverMasterPaths,
} = require("./scripts/lib/covers-files");
const {
  optimizeCoverPaths,
  applyOptimizedCoverPaths,
} = require("./scripts/lib/cover-optimize");
const { buildListFocalByMaster } = require("./scripts/lib/cover-list-crop");
const { bundleViewerJs } = require("./scripts/bundle-viewer-js");
const { VIEWER_CSS_FILES } = require("./scripts/css-manifest");

const ROOT = __dirname;
const BUILD_DIR = path.join(ROOT, "build");
const BOOKS_JSON = path.join(ROOT, "data", "books.json");
const BOOKS_JS = path.join(ROOT, "data", "books.js");
const DESCRIPTIONS_JS = path.join(ROOT, "data", "descriptions.js");
const EDITS_JSON = path.join(ROOT, "data", "edits.json");
const EDITS_JS = path.join(ROOT, "data", "edits.js");
const TAGS_JS = path.join(ROOT, "data", "tags.js");
const VIEWER_HTML = path.join(ROOT, "viewer.html");
const SITE_WEBMANIFEST = path.join(ROOT, "site.webmanifest");
const FAVICON_FILES = [
  "favicon.ico",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "apple-touch-icon.png",
  "android-chrome-192x192.png",
  "android-chrome-512x512.png",
];

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function collectCoverPaths(books) {
  return collectCoverMasterPaths(books);
}

function copyDirectory(relativeDir, options = {}) {
  const { excludeFiles = new Set() } = options;
  const srcDir = path.join(ROOT, relativeDir);
  if (!fs.existsSync(srcDir)) {
    return 0;
  }

  let copied = 0;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const relativePath = path.join(relativeDir, entry.name);
    const src = path.join(ROOT, relativePath);
    const dest = path.join(BUILD_DIR, relativePath);
    if (entry.isDirectory()) {
      copied += copyDirectory(relativePath, options);
    } else if (!excludeFiles.has(entry.name)) {
      copyFile(src, dest);
      copied += 1;
    }
  }
  return copied;
}

function concatViewerCss() {
  const parts = VIEWER_CSS_FILES.map((file) => {
    const filePath = path.join(ROOT, "css", file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing stylesheet: css/${file}`);
    }
    return fs.readFileSync(filePath, "utf8").trimEnd();
  });
  const destDir = path.join(BUILD_DIR, "css");
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, "viewer.css");
  fs.writeFileSync(destPath, `${parts.join("\n\n")}\n`);
  return destPath;
}

function applyBuildHtmlTransforms(html, options = {}) {
  const stylesheetBlock = VIEWER_CSS_FILES.map(
    (file) => `    <link rel="stylesheet" href="css/${file}" />`,
  ).join("\n");
  const bundledStylesheet = '    <link rel="stylesheet" href="css/viewer.css" />';
  let next = html.replace(stylesheetBlock, bundledStylesheet);

  const injectParts = ["<script>window.READ_ONLY = true;</script>"];
  next = next.replace(
    '<script src="data/books.js"></script>',
    `${injectParts.join("\n  ")}\n    <script src="data/books.js"></script>`,
  );

  const shareImage = `${DEPLOY_ORIGIN}/images/share.png`;
  next = next.replaceAll('content="images/share.png"', `content="${shareImage}"`);
  if (!next.includes('property="og:url"')) {
    next = next.replace(
      '<meta property="og:type" content="website" />',
      `<meta property="og:url" content="${DEPLOY_ORIGIN}/" />\n    <meta property="og:type" content="website" />`,
    );
  }

  if (!next.includes('name="robots"')) {
    next = next.replace(
      "</head>",
      '  <meta name="robots" content="noindex, nofollow" />\n  </head>',
    );
  }

  return next;
}

const ROBOTS_NO_CRAWL = `User-agent: *
Disallow: /
`;

/** Canonical deploy origin for absolute Open Graph / Twitter image URLs. */
const DEPLOY_ORIGIN = "https://arkhamcollector.org";

function buildStaticSite() {
  return buildStaticSiteAsync();
}

async function buildStaticSiteAsync() {
  bundleViewerJs();

  if (!fs.existsSync(BOOKS_JSON)) {
    throw new Error("Missing data/books.json. Run the crawler first.");
  }
  if (!fs.existsSync(BOOKS_JS)) {
    throw new Error("Missing data/books.js. Run the crawler first.");
  }
  if (!fs.existsSync(DESCRIPTIONS_JS)) {
    throw new Error(
      "Missing data/descriptions.js. Run a crawl/sync that writes books output.",
    );
  }
  if (!fs.existsSync(VIEWER_HTML)) {
    throw new Error("Missing viewer.html.");
  }

  const payload = JSON.parse(fs.readFileSync(BOOKS_JSON, "utf8"));
  const edits = loadEdits().edits;
  const mergedBooks = resolveCoverPathsInBooks(
    applyEditsToBooks(payload.books, edits),
  );
  const publicBooks = mergedBooks.filter(
    (book) => !book.hidden && !book.deleted,
  );

  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(BUILD_DIR, { recursive: true });

  const html = applyBuildHtmlTransforms(fs.readFileSync(VIEWER_HTML, "utf8"));
  fs.writeFileSync(path.join(BUILD_DIR, "robots.txt"), ROBOTS_NO_CRAWL);
  fs.writeFileSync(path.join(BUILD_DIR, "index.html"), html);
  fs.writeFileSync(path.join(BUILD_DIR, "404.html"), html);
  fs.writeFileSync(
    path.join(BUILD_DIR, "_redirects"),
    "/*    /index.html   200\n",
  );

  const buildDataDir = path.join(BUILD_DIR, "data");
  fs.mkdirSync(buildDataDir, { recursive: true });

  const coverPaths = collectCoverPaths(publicBooks);
  let optimizedCovers = 0;
  let missingCovers = 0;
  let coverCardBytes = 0;
  let coverDetailBytes = 0;
  let coverListBytes = 0;
  let booksForDeploy = mergedBooks;

  if (coverPaths.size) {
    const focalBySource = buildListFocalByMaster(publicBooks, edits);
    const { optimizedBySource, stats } = await optimizeCoverPaths(
      [...coverPaths],
      {
        root: ROOT,
        destRoot: BUILD_DIR,
        focalBySource,
      },
    );
    booksForDeploy = applyOptimizedCoverPaths(mergedBooks, optimizedBySource);
    optimizedCovers = stats.processed;
    missingCovers = stats.missing;
    coverCardBytes = stats.cardBytes;
    coverDetailBytes = stats.detailBytes;
    coverListBytes = stats.listBytes;
  }

  writeViewerBookScripts(booksForDeploy, buildDataDir);

  if (fs.existsSync(EDITS_JS)) {
    copyFile(EDITS_JS, path.join(BUILD_DIR, "data", "edits.js"));
  } else {
    fs.writeFileSync(
      path.join(BUILD_DIR, "data", "edits.js"),
      "window.BOOK_EDITS = {};\n",
    );
  }

  if (fs.existsSync(TAGS_JS)) {
    copyFile(TAGS_JS, path.join(BUILD_DIR, "data", "tags.js"));
  } else {
    fs.writeFileSync(
      path.join(BUILD_DIR, "data", "tags.js"),
      "window.BOOK_TAGS = {};\n",
    );
  }

  const BOOK_ORDER_JS = path.join(ROOT, "data", "book-order.js");
  if (fs.existsSync(BOOK_ORDER_JS)) {
    copyFile(BOOK_ORDER_JS, path.join(BUILD_DIR, "data", "book-order.js"));
  } else {
    fs.writeFileSync(
      path.join(BUILD_DIR, "data", "book-order.js"),
      "window.BOOK_ORDER = [];\n",
    );
  }

  let copiedAssets = 0;
  concatViewerCss();
  copiedAssets += 1;
  copiedAssets += copyDirectory("js");
  copiedAssets += copyDirectory("images");
  if (fs.existsSync(SITE_WEBMANIFEST)) {
    copyFile(SITE_WEBMANIFEST, path.join(BUILD_DIR, "site.webmanifest"));
    copiedAssets += 1;
  } else {
    console.warn("Missing site.webmanifest");
  }
  for (const name of FAVICON_FILES) {
    const src = path.join(ROOT, "images", name);
    if (!fs.existsSync(src)) {
      console.warn(`Missing favicon: images/${name}`);
      continue;
    }
    copyFile(src, path.join(BUILD_DIR, name));
    copiedAssets += 1;
  }

  console.log(`Built static site in ${BUILD_DIR}`);
  console.log(
    `Books: ${publicBooks.length} visible (${mergedBooks.length - publicBooks.length} hidden excluded from covers)`
  );
  console.log(`Static assets copied: ${copiedAssets}`);
  console.log(
    `Covers optimized: ${optimizedCovers} (${(coverCardBytes / 1024).toFixed(1)} KB card + ${(coverDetailBytes / 1024).toFixed(1)} KB detail + ${(coverListBytes / 1024).toFixed(1)} KB list WebP)`,
  );
  if (missingCovers) {
    console.log(`Covers missing on disk: ${missingCovers}`);
  }
  console.log(
    "Collection: gear toggle (default own; sample CSV bundled)",
  );
  const openPath = path.join(BUILD_DIR, "index.html");
  console.log(`Open ${openPath} or deploy the ${BUILD_DIR}/ folder to your static host.`);
}

try {
  if (require.main === module) {
    buildStaticSiteAsync().catch((error) => {
      console.error(error.message || error);
      process.exit(1);
    });
  }
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

module.exports = {
  applyBuildHtmlTransforms,
  buildStaticSite,
  buildStaticSiteAsync,
  VIEWER_CSS_FILES,
  DEPLOY_ORIGIN,
};
