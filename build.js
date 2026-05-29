#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { loadEdits, applyEditsToBooks } = require("./scripts/lib/edits");

const ROOT = __dirname;
const localCollection = process.argv.includes("--local-collection");
const BUILD_DIR = path.join(ROOT, localCollection ? "build" : "build-for-me");
const BOOKS_JSON = path.join(ROOT, "data", "books.json");
const BOOKS_JS = path.join(ROOT, "data", "books.js");
const EDITS_JSON = path.join(ROOT, "data", "edits.json");
const EDITS_JS = path.join(ROOT, "data", "edits.js");
const VIEWER_HTML = path.join(ROOT, "viewer.html");
const COLLECTION_JS = path.join(ROOT, "my_collection", "collection.js");
const COLLECTION_CSV = path.join(ROOT, "my_collection", "my_collection.csv");
const STATIC_ASSETS = [
  "images/arkham-house.jpg",
  "images/Mycroft_moran.png",
];

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function collectCoverPaths(books) {
  const files = new Set();
  for (const book of books) {
    if (book.coverImageFile) {
      files.add(book.coverImageFile.replace(/\\/g, "/"));
    }
  }
  return files;
}

function copyDirectory(relativeDir) {
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
      copied += copyDirectory(relativePath);
    } else {
      copyFile(src, dest);
      copied += 1;
    }
  }
  return copied;
}

const ROBOTS_NO_CRAWL = `User-agent: *
Disallow: /
`;

function buildStaticSite() {
  if (!fs.existsSync(BOOKS_JSON)) {
    throw new Error("Missing data/books.json. Run the crawler first.");
  }
  if (!fs.existsSync(BOOKS_JS)) {
    throw new Error("Missing data/books.js. Run the crawler first.");
  }
  if (!fs.existsSync(VIEWER_HTML)) {
    throw new Error("Missing viewer.html.");
  }

  const payload = JSON.parse(fs.readFileSync(BOOKS_JSON, "utf8"));
  const edits = loadEdits().edits;
  const mergedBooks = applyEditsToBooks(payload.books, edits);
  const publicBooks = mergedBooks.filter(
    (book) => !book.hidden && !book.deleted,
  );

  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(BUILD_DIR, { recursive: true });

  let html = fs.readFileSync(VIEWER_HTML, "utf8");
  const collectionScript =
    '<script src="my_collection/collection.js"></script>';
  const defaultSource = localCollection ? "own" : "sample";
  const inject = `<script>window.READ_ONLY = true; window.DEFAULT_COLLECTION_SOURCE = '${defaultSource}';</script>\n  ${collectionScript}`;
  html = html.replace(collectionScript, inject);
  if (localCollection) {
    if (!html.includes('name="robots"')) {
      html = html.replace(
        "</head>",
        '  <meta name="robots" content="noindex, nofollow" />\n  </head>',
      );
    }
    fs.writeFileSync(path.join(BUILD_DIR, "robots.txt"), ROBOTS_NO_CRAWL);
  }
  fs.writeFileSync(path.join(BUILD_DIR, "index.html"), html);

  fs.mkdirSync(path.join(BUILD_DIR, "data"), { recursive: true });
  fs.writeFileSync(
    path.join(BUILD_DIR, "data", "books.json"),
    `${JSON.stringify({ ...payload, books: payload.books }, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(BUILD_DIR, "data", "books.js"),
    `window.BOOKS = ${JSON.stringify(payload.books, null, 2)};\n`
  );

  if (fs.existsSync(EDITS_JSON)) {
    copyFile(EDITS_JSON, path.join(BUILD_DIR, "data", "edits.json"));
  } else {
    fs.writeFileSync(
      path.join(BUILD_DIR, "data", "edits.json"),
      `${JSON.stringify({ edits: {} }, null, 2)}\n`
    );
  }
  if (fs.existsSync(EDITS_JS)) {
    copyFile(EDITS_JS, path.join(BUILD_DIR, "data", "edits.js"));
  } else {
    fs.writeFileSync(
      path.join(BUILD_DIR, "data", "edits.js"),
      "window.BOOK_EDITS = {};\n"
    );
  }

  if (fs.existsSync(COLLECTION_JS)) {
    copyFile(COLLECTION_JS, path.join(BUILD_DIR, "my_collection", "collection.js"));
  }
  if (fs.existsSync(COLLECTION_CSV)) {
    copyFile(COLLECTION_CSV, path.join(BUILD_DIR, "my_collection", "my_collection.csv"));
  }

  let copiedAssets = 0;
  copiedAssets += copyDirectory("css");
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
    localCollection
      ? "Collection: gear toggle (default own; sample CSV bundled)"
      : "Collection: gear toggle (default sample CSV; own via localStorage)",
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
