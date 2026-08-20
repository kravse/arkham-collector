#!/usr/bin/env node

const express = require("express");
const fs = require("fs");
const path = require("path");
const {
  loadEdits,
  applyEditsToBook,
  applyEditsToBooks,
  getEditForBook,
  setBookEdit,
} = require("./scripts/lib/edits");
const {
  normalizeOrder,
  validateOrder,
  loadBookOrder,
  saveBookOrder,
} = require("./scripts/lib/book-order");
const { htmlToPlainText, sanitizeSingleLineText, sanitizeUrlInput, slugify } = require("./scripts/lib/text");
const {
  saveBookCoverUpload,
  createCoverUploadMiddleware,
  extensionFromMime,
  removeLocalCovers,
} = require("./scripts/lib/cover-upload");
const { parseListCoverFocusPatch } = require("./scripts/lib/cover-list-crop");
const {
  loadTags,
  setBookTags,
  getAllTags,
  normalizeTags,
} = require("./scripts/lib/tags");
const { FILTER_PATH_SEGMENTS } = require("./scripts/lib/viewer-filter-url");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const COVERS_DIR = path.join(ROOT, "covers");
const BOOKS_JSON_PATH = path.join(DATA_DIR, "books.json");
const EDITS_JSON_PATH = path.join(DATA_DIR, "edits.json");
const TAGS_JSON_PATH = path.join(DATA_DIR, "tags.json");

let booksPayloadCache = { mtimeMs: null, payload: null };
let editsPayloadCache = { mtimeMs: null, payload: null };
let tagsPayloadCache = { mtimeMs: null, payload: null };
let mergedBooksCache = { key: null, books: null };
const {
  readBooksPayload,
  writeDevBooksPayload,
  getScrapedBookFromPayload,
} = require("./scripts/lib/books");
const PORT = Number(process.env.PORT) || 8742;

function wikiTitleFromHref(href) {
  if (!href) {
    return null;
  }
  const match = href.match(/\/wiki\/([^#?]+)/);
  if (!match) {
    return null;
  }
  return decodeURIComponent(match[1].replace(/\+/g, " "));
}

function readPayload() {
  const stat = fs.statSync(BOOKS_JSON_PATH);
  if (
    booksPayloadCache.payload &&
    booksPayloadCache.mtimeMs === stat.mtimeMs
  ) {
    return booksPayloadCache.payload;
  }
  const payload = readBooksPayload();
  booksPayloadCache = { mtimeMs: stat.mtimeMs, payload };
  return payload;
}

function writePayload(payload) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  writeDevBooksPayload(payload);
  const stat = fs.statSync(BOOKS_JSON_PATH);
  booksPayloadCache = { mtimeMs: stat.mtimeMs, payload };
  mergedBooksCache.key = null;
  mergedBooksCache.books = null;
}

function readEditsCached() {
  if (!fs.existsSync(EDITS_JSON_PATH)) {
    return { edits: {} };
  }
  const stat = fs.statSync(EDITS_JSON_PATH);
  if (
    editsPayloadCache.payload &&
    editsPayloadCache.mtimeMs === stat.mtimeMs
  ) {
    return editsPayloadCache.payload;
  }
  const payload = loadEdits();
  editsPayloadCache = { mtimeMs: stat.mtimeMs, payload };
  mergedBooksCache.key = null;
  mergedBooksCache.books = null;
  return payload;
}

function readTagsCached() {
  if (!fs.existsSync(TAGS_JSON_PATH)) {
    return { byBookId: {} };
  }
  const stat = fs.statSync(TAGS_JSON_PATH);
  if (tagsPayloadCache.payload && tagsPayloadCache.mtimeMs === stat.mtimeMs) {
    return tagsPayloadCache.payload;
  }
  const payload = loadTags();
  tagsPayloadCache = { mtimeMs: stat.mtimeMs, payload };
  return payload;
}

function getMergedBooksCacheKey() {
  const booksStat = fs.statSync(BOOKS_JSON_PATH);
  const editsStat = fs.existsSync(EDITS_JSON_PATH)
    ? fs.statSync(EDITS_JSON_PATH)
    : { mtimeMs: 0 };
  return `${booksStat.mtimeMs}:${editsStat.mtimeMs}`;
}

function getScrapedBook(payload, bookId) {
  return getScrapedBookFromPayload(payload, bookId);
}

function getMergedBook(payload, bookId) {
  const scraped = getScrapedBook(payload, bookId);
  if (!scraped) {
    return null;
  }
  return applyEditsToBook(scraped, readEditsCached().edits);
}

function bookEditResponse(payload, bookId, merged) {
  const edit = getEditForBook(readEditsCached().edits, bookId);
  return {
    ...merged,
    edit: edit ? { ...edit } : {},
  };
}

function removeLocalCoversForBook(book) {
  removeLocalCovers(book, ROOT);
}

const upload = createCoverUploadMiddleware();

const app = express();

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, editDeltas: true });
});

app.post("/api/books/:id/cover", upload.single("cover"), (req, res) => {
  try {
    const bookId = Number(req.params.id);
    const result = saveBookCoverUpload(bookId, {
      buffer: req.file?.buffer,
      mimetype: req.file?.mimetype,
    });
    const payload = readPayload();
    const merged = getMergedBook(payload, result.bookId);
    res.json(bookEditResponse(payload, result.bookId, merged));
  } catch (error) {
    const status =
      error.message === "Book not found"
        ? 404
        : error.message === "Invalid book id" || error.message === "No image uploaded"
          ? 400
          : 500;
    res.status(status).json({ error: error.message });
  }
});

app.get("/api/tags", (_req, res) => {
  try {
    const { byBookId } = readTagsCached();
    res.json({ tags: getAllTags(byBookId) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/books/:id/tags", (req, res) => {
  try {
    const bookId = Number(req.params.id);
    if (!Number.isInteger(bookId) || bookId < 1) {
      res.status(400).json({ error: "Invalid book id" });
      return;
    }

    if (!Array.isArray(req.body.tags)) {
      res.status(400).json({ error: "Expected tags array" });
      return;
    }

    const payload = readPayload();
    if (!getScrapedBook(payload, bookId)) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    const tags = normalizeTags(req.body.tags);
    setBookTags(bookId, tags);
    res.json({ id: bookId, tags });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/books/:id/hidden", (req, res) => {
  try {
    const bookId = Number(req.params.id);
    if (!Number.isInteger(bookId) || bookId < 1) {
      res.status(400).json({ error: "Invalid book id" });
      return;
    }

    if (typeof req.body.hidden !== "boolean") {
      res.status(400).json({ error: "Expected boolean hidden value" });
      return;
    }

    const payload = readPayload();
    const scraped = getScrapedBook(payload, bookId);
    if (!scraped) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    setBookEdit(
      bookId,
      {
        hidden: req.body.hidden ? true : null,
      },
      scraped,
    );
    const merged = getMergedBook(payload, bookId);

    res.json(bookEditResponse(payload, bookId, merged));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function optionalText(value, sanitize = sanitizeSingleLineText) {
  const trimmed = sanitize(value);
  return trimmed || null;
}

function parseGoodreadsUrl(value) {
  const url = optionalText(value, sanitizeUrlInput);
  if (!url) {
    return null;
  }
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (!host.endsWith("goodreads.com")) {
      return { error: "Goodreads URL must be on goodreads.com" };
    }
    return { url };
  } catch {
    return { error: "Invalid Goodreads URL" };
  }
}

function parseYear(value) {
  if (!value) {
    return null;
  }
  const match = String(value).match(/\d{4}/);
  return match ? match[0] : null;
}

function decadeFromYear(year) {
  const value = parseInt(year, 10);
  if (!value) {
    return null;
  }
  return `${Math.floor(value / 10) * 10}s`;
}

app.patch("/api/books/:id", upload.single("cover"), (req, res) => {
  try {
    const bookId = Number(req.params.id);
    if (!Number.isInteger(bookId) || bookId < 1) {
      res.status(400).json({ error: "Invalid book id" });
      return;
    }

    const payload = readPayload();
    const scraped = getScrapedBook(payload, bookId);
    if (!scraped) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    const book = getMergedBook(payload, bookId);
    const title = optionalText(req.body.title ?? book.title ?? "");
    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const publicationDate = optionalText(req.body.publicationDate);
    const goodreadsParsed = parseGoodreadsUrl(req.body.goodreadsUrl);
    if (goodreadsParsed?.error) {
      res.status(400).json({ error: goodreadsParsed.error });
      return;
    }

    const patch = {
      title,
      author: optionalText(req.body.author),
      coverArtist: optionalText(req.body.coverArtist),
      publicationDate,
      decade: decadeFromYear(parseYear(publicationDate)),
      wikipediaUrl: optionalText(req.body.wikipediaUrl, sanitizeUrlInput),
      goodreadsUrl: goodreadsParsed?.url ?? null,
    };

    if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
      patch.description = optionalText(req.body.description, htmlToPlainText);
    }

    const focusPatch = parseListCoverFocusPatch(req.body);
    if (focusPatch?.error) {
      res.status(400).json({ error: focusPatch.error });
      return;
    }
    if (focusPatch) {
      Object.assign(patch, focusPatch);
    }

    if (req.file) {
      removeLocalCoversForBook(book);

      const slugBase = slugify(
        wikiTitleFromHref(patch.wikipediaUrl || book.wikipediaUrl) ||
          book.listTitle ||
          book.title
      );
      const extension = extensionFromMime(req.file.mimetype);
      const relativePath = `covers/${slugBase}-${bookId}${extension}`;
      const fullPath = path.join(ROOT, relativePath);

      fs.mkdirSync(COVERS_DIR, { recursive: true });
      fs.writeFileSync(fullPath, req.file.buffer);
      patch.coverImageFile = relativePath;
      patch.listCoverFocusX = null;
      patch.listCoverFocusY = null;
    }

    setBookEdit(bookId, patch, scraped);
    const merged = getMergedBook(payload, bookId);

    res.json(bookEditResponse(payload, bookId, merged));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/books/:id", (req, res) => {
  try {
    const bookId = Number(req.params.id);
    if (!Number.isInteger(bookId) || bookId < 1) {
      res.status(400).json({ error: "Invalid book id" });
      return;
    }

    const payload = readPayload();
    if (!payload.books.find((entry) => entry.id === bookId)) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    const scraped = getScrapedBook(payload, bookId);
    setBookEdit(bookId, { deleted: true }, scraped);

    res.json({ id: bookId, deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function getMergedBooks(payload) {
  const cacheKey = getMergedBooksCacheKey();
  if (mergedBooksCache.key === cacheKey && mergedBooksCache.books) {
    return mergedBooksCache.books;
  }
  const books = applyEditsToBooks(payload.books, readEditsCached().edits);
  mergedBooksCache = { key: cacheKey, books };
  return books;
}

app.get("/api/book-order", (_req, res) => {
  try {
    const payload = readPayload();
    const merged = getMergedBooks(payload);
    const saved = loadBookOrder().order;
    const order = normalizeOrder(merged, saved);
    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/book-order", (req, res) => {
  try {
    if (!Array.isArray(req.body.order)) {
      res.status(400).json({ error: "Expected order array" });
      return;
    }

    const payload = readPayload();
    const merged = getMergedBooks(payload);
    const order = req.body.order.map((id) => Number(id));
    const error = validateOrder(merged, order);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    saveBookOrder(order);
    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((req, res, next) => {
  if (req.path === "/data/books.json") {
    res.status(404).end();
    return;
  }
  next();
});

app.use(
  express.static(ROOT, {
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}data${path.sep}edits.js`)) {
        res.setHeader("Cache-Control", "no-store");
      }
      if (filePath.includes(`${path.sep}data${path.sep}tags.js`)) {
        res.setHeader("Cache-Control", "no-store");
      }
      if (filePath.includes(`${path.sep}data${path.sep}book-order.js`)) {
        res.setHeader("Cache-Control", "no-store");
      }
    },
  }),
);

app.get("/", (_req, res) => {
  res.sendFile(path.join(ROOT, "viewer.html"));
});

for (const segment of FILTER_PATH_SEGMENTS) {
  app.get(`/${segment}`, (_req, res) => {
    res.sendFile(path.join(ROOT, "viewer.html"));
  });
}

app.use((error, _req, res, _next) => {
  res.status(400).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`Arkham viewer running at http://localhost:${PORT}`);
  console.log("Book editing, cover uploads, tags, and hide/unhide are enabled.");
  console.log("Edits persist only fields that differ from data/books.json.");
});
