const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  normalizeTag,
  normalizeTags,
  getTagsForBook,
  getAllTags,
  applyTagsToBooks,
  saveTags,
} = require("../scripts/lib/tags");

test("normalizeTag trims, collapses spaces, and rejects empty or long values", () => {
  assert.equal(normalizeTag("  signed  copy  "), "signed copy");
  assert.equal(normalizeTag(""), null);
  assert.equal(normalizeTag("   "), null);
  assert.equal(normalizeTag("x".repeat(49)), null);
});

test("normalizeTags dedupes case-insensitively and sorts", () => {
  assert.deepEqual(normalizeTags(["Signed", "signed", "First"]), [
    "First",
    "Signed",
  ]);
});

test("getTagsForBook normalizes stored tags", () => {
  const byBookId = { 42: [" Signed ", "signed"] };
  assert.deepEqual(getTagsForBook(byBookId, 42), ["Signed"]);
  assert.deepEqual(getTagsForBook(byBookId, 99), []);
});

test("getAllTags returns unique sorted tags across books", () => {
  const byBookId = {
    1: ["Signed", "Arkham"],
    2: ["signed", "Reprint"],
  };
  assert.deepEqual(getAllTags(byBookId), ["Arkham", "Reprint", "Signed"]);
});

test("applyTagsToBooks attaches tags arrays to books", () => {
  const books = [{ id: 1, title: "A" }, { id: 2, title: "B" }];
  const byBookId = { 1: ["Signed"] };
  const merged = applyTagsToBooks(books, byBookId);
  assert.deepEqual(merged[0].tags, ["Signed"]);
  assert.deepEqual(merged[1].tags, []);
});

test("saveTags writes json and js payloads", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arkham-tags-save-"));
  const tagsJson = path.join(tmpDir, "tags.json");
  const tagsJs = path.join(tmpDir, "tags.js");

  saveTags({ byBookId: { 7: ["Rare"] } }, { tagsJson, tagsJs });
  assert.deepEqual(JSON.parse(fs.readFileSync(tagsJson, "utf8")), {
    byBookId: { 7: ["Rare"] },
  });
  assert.match(fs.readFileSync(tagsJs, "utf8"), /"7": \[\s*"Rare"/);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
