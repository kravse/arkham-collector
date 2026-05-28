#!/usr/bin/env node

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

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
  res.json({ ok: true });
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
    const book = payload.books.find((entry) => entry.id === bookId);
    if (!book) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    removeLocalCovers(book);

    const slugBase = slugify(
      wikiTitleFromHref(book.wikipediaUrl) || book.listTitle || book.title
    );
    const extension = extensionFromMime(req.file.mimetype);
    const relativePath = `covers/${slugBase}-${bookId}${extension}`;
    const fullPath = path.join(ROOT, relativePath);

    fs.mkdirSync(COVERS_DIR, { recursive: true });
    fs.writeFileSync(fullPath, req.file.buffer);

    book.coverImageFile = relativePath;
    writePayload(payload);

    res.json({ coverImageFile: relativePath });
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
    const book = payload.books.find((entry) => entry.id === bookId);
    if (!book) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    book.hidden = req.body.hidden;
    writePayload(payload);

    res.json({ hidden: book.hidden });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function optionalText(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

app.patch("/api/books/:id", upload.single("cover"), (req, res) => {
  try {
    const bookId = Number(req.params.id);
    if (!Number.isInteger(bookId) || bookId < 1) {
      res.status(400).json({ error: "Invalid book id" });
      return;
    }

    const payload = readPayload();
    const book = payload.books.find((entry) => entry.id === bookId);
    if (!book) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    const title = String(req.body.title ?? book.title ?? "").trim();
    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    book.title = title;
    book.author = optionalText(req.body.author);
    book.coverArtist = optionalText(req.body.coverArtist);
    book.publicationDate = optionalText(req.body.publicationDate);
    book.wikipediaUrl = optionalText(req.body.wikipediaUrl);

    if (req.file) {
      removeLocalCovers(book);

      const slugBase = slugify(
        wikiTitleFromHref(book.wikipediaUrl) || book.listTitle || book.title
      );
      const extension = extensionFromMime(req.file.mimetype);
      const relativePath = `covers/${slugBase}-${bookId}${extension}`;
      const fullPath = path.join(ROOT, relativePath);

      fs.mkdirSync(COVERS_DIR, { recursive: true });
      fs.writeFileSync(fullPath, req.file.buffer);
      book.coverImageFile = relativePath;
    }

    writePayload(payload);

    res.json({
      title: book.title,
      author: book.author,
      coverArtist: book.coverArtist,
      publicationDate: book.publicationDate,
      wikipediaUrl: book.wikipediaUrl,
      coverImageFile: book.coverImageFile,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use(express.static(ROOT));

app.get("/", (_req, res) => {
  res.sendFile(path.join(ROOT, "viewer.html"));
});

app.use((error, _req, res, _next) => {
  res.status(400).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`Arkham viewer running at http://localhost:${PORT}`);
  console.log("Book editing, cover uploads, and hide/unhide are enabled.");
});
