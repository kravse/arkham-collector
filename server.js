#!/usr/bin/env node

const express = require("express");
const multer = require("multer");
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
const {
  htmlToPlainText,
  sanitizeSingleLineText,
  sanitizeUrlInput,
} = require("./scripts/lib/text");
const { syncCollectionFromCsv } = require("./scripts/lib/collection");
const { COLLECTION_CSV } = require("./scripts/config");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const COVERS_DIR = path.join(ROOT, "covers");
const BOOKS_JSON = path.join(DATA_DIR, "books.json");
const BOOKS_JS = path.join(DATA_DIR, "books.js");
const PORT = Number(process.env.PORT) || 8742;

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

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

function expectedCoverPaths(book) {
  const wikiTitle = wikiTitleFromHref(book.wikipediaUrl);
  const slugBase = slugify(wikiTitle || book.listTitle || book.title);
  const id = book.id;
  if (!slugBase || !id) {
    return [];
  }
  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].map((ext) =>
    path.join("covers", `${slugBase}-${id}${ext}`)
  );
}

function readPayload() {
  if (!fs.existsSync(BOOKS_JSON)) {
    throw new Error("Missing data/books.json. Run the crawler first.");
  }
  return JSON.parse(fs.readFileSync(BOOKS_JSON, "utf8"));
}

function writePayload(payload) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(BOOKS_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(BOOKS_JS, `window.BOOKS = ${JSON.stringify(payload.books, null, 2)};\n`);
}

function getScrapedBook(payload, bookId) {
  return payload.books.find((entry) => entry.id === bookId) || null;
}

function getMergedBook(payload, bookId) {
  const scraped = getScrapedBook(payload, bookId);
  if (!scraped) {
    return null;
  }
  return applyEditsToBook(scraped, loadEdits().edits);
}

function bookEditResponse(payload, bookId, merged) {
  const edit = getEditForBook(loadEdits().edits, bookId);
  return {
    ...merged,
    edit: edit ? { ...edit } : {},
  };
}

function removeLocalCovers(book) {
  const relativePaths = new Set();
  if (book.coverImageFile && book.coverImageFile.startsWith("covers/")) {
    relativePaths.add(book.coverImageFile);
  }
  expectedCoverPaths(book).forEach((relativePath) => {
    relativePaths.add(relativePath.replace(/\\/g, "/"));
  });

  relativePaths.forEach((relativePath) => {
    const fullPath = path.join(ROOT, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  });
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
      return;
    }
    callback(new Error("Only image uploads are allowed"));
  },
});

const app = express();

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, editDeltas: true });
});

app.post("/api/books/:id/cover", upload.single("cover"), (req, res) => {
  try {
    const bookId = Number(req.params.id);
    if (!Number.isInteger(bookId) || bookId < 1) {
      res.status(400).json({ error: "Invalid book id" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No image uploaded" });
      return;
    }

    const payload = readPayload();
    const scraped = getScrapedBook(payload, bookId);
    if (!scraped) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    const book = getMergedBook(payload, bookId);
    removeLocalCovers(book);

    const slugBase = slugify(
      wikiTitleFromHref(book.wikipediaUrl) || book.listTitle || book.title
    );
    const extension = extensionFromMime(req.file.mimetype);
    const relativePath = `covers/${slugBase}-${bookId}${extension}`;
    const fullPath = path.join(ROOT, relativePath);

    fs.mkdirSync(COVERS_DIR, { recursive: true });
    fs.writeFileSync(fullPath, req.file.buffer);

    setBookEdit(bookId, { coverImageFile: relativePath }, scraped);
    const merged = getMergedBook(payload, bookId);

    res.json(bookEditResponse(payload, bookId, merged));
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
  if (value < 1940) {
    return String(value);
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

    if (req.file) {
      removeLocalCovers(book);

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
  return applyEditsToBooks(payload.books, loadEdits().edits);
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

app.use(
  express.static(ROOT, {
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}data${path.sep}edits.js`)) {
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

app.use((error, _req, res, _next) => {
  res.status(400).json({ error: error.message });
});

if (fs.existsSync(COLLECTION_CSV)) {
  try {
    syncCollectionFromCsv();
  } catch (error) {
    console.warn(`Collection sync skipped: ${error.message}`);
  }
}

app.listen(PORT, () => {
  console.log(`Arkham viewer running at http://localhost:${PORT}`);
  console.log("Book editing, cover uploads, and hide/unhide are enabled.");
  console.log("Edits persist only fields that differ from data/books.json.");
});
