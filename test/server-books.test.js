const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  readBooksPayload,
  writeDevBooksPayload,
  getScrapedBookFromPayload,
} = require("../scripts/lib/books");

test("readBooksPayload and writeDevBooksPayload round-trip", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arkham-books-"));
  const booksJson = path.join(dir, "books.json");
  const booksJs = path.join(dir, "books.js");
  const payload = {
    books: [{ id: 1, title: "Test Book" }],
    sourceUrls: {},
  };

  writeDevBooksPayload(payload, { booksJson, booksJs });
  assert.deepEqual(readBooksPayload(booksJson), payload);
  assert.match(fs.readFileSync(booksJs, "utf8"), /window\.BOOKS = \[/);
});

test("getScrapedBookFromPayload finds book by id", () => {
  const payload = { books: [{ id: 42, title: "X" }] };
  assert.deepEqual(getScrapedBookFromPayload(payload, 42), {
    id: 42,
    title: "X",
  });
  assert.equal(getScrapedBookFromPayload(payload, 99), null);
});

test("readBooksPayload throws when json is missing", () => {
  assert.throws(
    () => readBooksPayload(path.join(os.tmpdir(), "missing-books.json")),
    /Missing data\/books\.json/,
  );
});
