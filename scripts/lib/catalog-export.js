const fs = require("fs");
const path = require("path");

const { ROOT, DATA_DIR } = require("../config");
const { loadEdits, applyEditsToBooks, filterActiveBooks } = require("./edits");
const { loadBookOrder, normalizeOrder } = require("./book-order");
const { compareCanonical, buildBookOrderIndex } = require("./viewer-sort");
const { parseYear } = require("./text");

const BOOKS_JSON = path.join(DATA_DIR, "books.json");
const DEFAULT_OUTPUT = path.join(ROOT, "arkham_catalog.csv");

function escapeCsvField(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildArkhamCatalogRows(books, options = {}) {
  const { imprint = "arkham_house" } = options;
  const order = normalizeOrder(books, options.order || []);
  const bookOrderIndex = buildBookOrderIndex(order);

  return [...books]
    .filter((book) => book.imprint === imprint)
    .sort((a, b) => compareCanonical(a, b, bookOrderIndex))
    .map((book) => [
      book.title || book.listTitle || "Untitled",
      book.author || "",
      parseYear(book.publicationDate) || "",
    ]);
}

function rowsToCsv(rows) {
  return `${rows.map((cols) => cols.map(escapeCsvField).join(",")).join("\n")}\n`;
}

function loadMergedActiveBooks() {
  if (!fs.existsSync(BOOKS_JSON)) {
    throw new Error("Missing data/books.json. Run the crawler first.");
  }

  const payload = JSON.parse(fs.readFileSync(BOOKS_JSON, "utf8"));
  const edits = loadEdits().edits;
  const merged = applyEditsToBooks(payload.books || [], edits);
  return filterActiveBooks(merged);
}

function exportArkhamCatalogCsv(options = {}) {
  const books = loadMergedActiveBooks();
  const rows = buildArkhamCatalogRows(books, {
    order: loadBookOrder().order,
  });
  const csv = rowsToCsv(rows);
  const output = options.output;

  if (output === "-") {
    process.stdout.write(csv);
    return { rowCount: rows.length, output: "-" };
  }

  const outPath = output || DEFAULT_OUTPUT;
  fs.writeFileSync(outPath, csv);
  return { rowCount: rows.length, output: outPath };
}

module.exports = {
  DEFAULT_OUTPUT,
  escapeCsvField,
  buildArkhamCatalogRows,
  rowsToCsv,
  loadMergedActiveBooks,
  exportArkhamCatalogCsv,
};
