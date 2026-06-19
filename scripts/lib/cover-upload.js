const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { ROOT, COVERS_DIR, DATA_DIR } = require("../config");
const { applyEditsToBook, loadEdits, setBookEdit } = require("./edits");
const { expectedCoverPaths } = require("./covers-files");
const { slugify } = require("./text");
const { wikiTitleFromHref } = require("./wiki-urls");

const BOOKS_JSON = path.join(DATA_DIR, "books.json");
const MAX_COVER_BYTES = 10 * 1024 * 1024;

function resolveBooksJsonPath(options = {}) {
  return options.booksJsonPath || BOOKS_JSON;
}

function readBooksPayload(options = {}) {
  const booksJson = resolveBooksJsonPath(options);
  if (!fs.existsSync(booksJson)) {
    throw new Error("Missing data/books.json. Run the crawler first.");
  }
  return JSON.parse(fs.readFileSync(booksJson, "utf8"));
}

function getScrapedBook(payload, bookId) {
  return payload.books.find((entry) => entry.id === bookId) || null;
}

function extensionFromMime(mime) {
  const map = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  return map[mime] || ".jpg";
}

function removeLocalCovers(book, root = ROOT) {
  const relativePaths = new Set();
  if (book.coverImageFile && book.coverImageFile.startsWith("covers/")) {
    relativePaths.add(book.coverImageFile);
  }
  expectedCoverPaths(book).forEach((relativePath) => {
    relativePaths.add(relativePath.replace(/\\/g, "/"));
  });

  relativePaths.forEach((relativePath) => {
    const fullPath = path.join(root, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  });
}

function coverSlugForBook(book) {
  return slugify(
    wikiTitleFromHref(book.wikipediaUrl) || book.listTitle || book.title,
  );
}

function saveBookCoverUpload(bookId, file, options = {}) {
  const root = options.root || ROOT;
  const coversDir = options.coversDir || COVERS_DIR;
  if (!file?.buffer?.length) {
    throw new Error("No image uploaded");
  }
  if (!Number.isInteger(bookId) || bookId < 1) {
    throw new Error("Invalid book id");
  }

  const payload = readBooksPayload(options);
  const scraped = getScrapedBook(payload, bookId);
  if (!scraped) {
    throw new Error("Book not found");
  }

  const merged = applyEditsToBook(scraped, loadEdits().edits);
  removeLocalCovers(merged, root);

  const slugBase = coverSlugForBook(merged);
  const extension = extensionFromMime(file.mimetype);
  const relativePath = `covers/${slugBase}-${bookId}${extension}`;
  const fullPath = path.join(root, relativePath);

  fs.mkdirSync(coversDir, { recursive: true });
  fs.writeFileSync(fullPath, file.buffer);
  setBookEdit(
    bookId,
    {
      coverImageFile: relativePath,
      listCoverFocusX: null,
      listCoverFocusY: null,
    },
    scraped,
  );

  return {
    bookId,
    coverImageFile: relativePath,
  };
}

function createCoverUploadMiddleware(options = {}) {
  const maxBytes = options.maxBytes ?? MAX_COVER_BYTES;
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes },
    fileFilter(_req, uploadFile, callback) {
      if (uploadFile.mimetype.startsWith("image/")) {
        callback(null, true);
        return;
      }
      callback(new Error("Only image uploads are allowed"));
    },
  });
}

module.exports = {
  MAX_COVER_BYTES,
  readBooksPayload,
  getScrapedBook,
  extensionFromMime,
  removeLocalCovers,
  coverSlugForBook,
  saveBookCoverUpload,
  createCoverUploadMiddleware,
};
