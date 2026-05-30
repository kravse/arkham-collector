#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { loadEdits, applyEditsToBooks } = require("./scripts/lib/edits");
const { writeViewerBookScripts } = require("./scripts/lib/books");
const {
  findLocalCoverForBook,
  resolveCoverPathsInBooks,
} = require("./scripts/lib/covers-files");
const { bundleViewerJs } = require("./scripts/bundle-viewer-js");

const ROOT = __dirname;
const BUILD_DIR = path.join(ROOT, "build");
const BOOKS_JSON = path.join(ROOT, "data", "books.json");
const BOOKS_JS = path.join(ROOT, "data", "books.js");
const DESCRIPTIONS_JS = path.join(ROOT, "data", "descriptions.js");
const EDITS_JSON = path.join(ROOT, "data", "edits.json");
const EDITS_JS = path.join(ROOT, "data", "edits.js");
const VIEWER_HTML = path.join(ROOT, "viewer.html");
const COLLECTION_JS = path.join(ROOT, "my_collection", "collection.js");
const COLLECTION_CSV = path.join(ROOT, "my_collection", "my_collection.csv");
const STATIC_ASSETS = [
  "images/arkham-house.jpg",
  "images/Mycroft_moran.png",
];

const VIEWER_CSS_FILES = [
  "variables.css",
  "base.css",
  "header.css",
  "attribution.css",
  "settings.css",
  "cards.css",
  "edit-dialog.css",
  "book-detail.css",
  "mobile.css",
];

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function collectCoverPaths(books) {
  const files = new Set();
  for (const book of books) {
    const resolved = findLocalCoverForBook(book, books);
    if (resolved) {
      files.add(resolved.replace(/\\/g, "/"));
    }
  }
  return files;
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

function applyBuildHtmlTransforms(html) {
  const stylesheetBlock = VIEWER_CSS_FILES.map(
    (file) => `    <link rel="stylesheet" href="css/${file}" />`,
  ).join("\n");
  const bundledStylesheet = '    <link rel="stylesheet" href="css/viewer.css" />';
  let next = html.replace(stylesheetBlock, bundledStylesheet);

  const collectionScript =
    '<script src="my_collection/collection.js"></script>';
  const inject = `<script>window.READ_ONLY = true;</script>\n  ${collectionScript}`;
  next = next.replace(collectionScript, inject);

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

function buildStaticSite() {
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

  const buildDataDir = path.join(BUILD_DIR, "data");
  fs.mkdirSync(buildDataDir, { recursive: true });
  writeViewerBookScripts(mergedBooks, buildDataDir);

  if (fs.existsSync(EDITS_JS)) {
    copyFile(EDITS_JS, path.join(BUILD_DIR, "data", "edits.js"));
  } else {
    fs.writeFileSync(
      path.join(BUILD_DIR, "data", "edits.js"),
      "window.BOOK_EDITS = {};\n",
    );
  }

  if (fs.existsSync(COLLECTION_JS)) {
    copyFile(COLLECTION_JS, path.join(BUILD_DIR, "my_collection", "collection.js"));
  }
  if (fs.existsSync(COLLECTION_CSV)) {
    copyFile(COLLECTION_CSV, path.join(BUILD_DIR, "my_collection", "my_collection.csv"));
  }

  let copiedAssets = 0;
  concatViewerCss();
  copiedAssets += 1;
  copiedAssets += copyDirectory("js");
  for (const relativePath of STATIC_ASSETS) {
    const src = path.join(ROOT, relativePath);
    const dest = path.join(BUILD_DIR, relativePath);
    if (fs.existsSync(src)) {
      copyFile(src, dest);
      copiedAssets += 1;
    } else {
      console.warn(`Missing static asset: ${relativePath}`);
    }
  }

  const coverPaths = collectCoverPaths(publicBooks);
  let copiedCovers = 0;
  let missingCovers = 0;

  for (const relativePath of coverPaths) {
    const src = path.join(ROOT, relativePath);
    const dest = path.join(BUILD_DIR, relativePath);
    if (fs.existsSync(src)) {
      copyFile(src, dest);
      copiedCovers += 1;
    } else {
      missingCovers += 1;
      console.warn(`Missing cover file: ${relativePath}`);
    }
  }

  console.log(`Built static site in ${BUILD_DIR}`);
  console.log(
    `Books: ${publicBooks.length} visible (${mergedBooks.length - publicBooks.length} hidden excluded from covers)`
  );
  console.log(`Static assets copied: ${copiedAssets}`);
  console.log(`Covers copied: ${copiedCovers}`);
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
  buildStaticSite();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
