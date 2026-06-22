const { test } = require("node:test");
const assert = require("node:assert/strict");

const { applyBookTags } = require("../scripts/lib/book-layers");

test("applyBookTags attaches tags by book id", () => {
  const books = [{ id: 1, title: "A" }, { id: 2, title: "B" }];
  const merged = applyBookTags(books, { 1: ["HORROR"] });
  assert.deepEqual(merged[0].tags, ["HORROR"]);
  assert.deepEqual(merged[1].tags, []);
});

test("applyBookTags returns empty tags when map is missing", () => {
  const books = [{ id: 1, tags: ["OLD"] }];
  const merged = applyBookTags(books, null);
  assert.deepEqual(merged[0].tags, ["OLD"]);
});

test("applyBookTags accepts string book id keys", () => {
  const books = [{ id: 5, title: "X" }];
  const merged = applyBookTags(books, { 5: ["SIGNED"] });
  assert.deepEqual(merged[0].tags, ["SIGNED"]);
});
