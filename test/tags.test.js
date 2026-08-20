const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  normalizeTags,
  getTagsForBook,
  getAllTags,
  applyTagsToBooks,
  saveTags,
} = require("../scripts/lib/tags");

test("normalizeTags dedupes case-insensitively and sorts", () => {
  assert.deepEqual(normalizeTags(["Signed", "signed", "First"]), [
    "FIRST",
    "SIGNED",
  ]);
});

test("getTagsForBook normalizes stored tags", () => {
  const byBookId = { 42: [" Signed ", "signed"] };
  assert.deepEqual(getTagsForBook(byBookId, 42), ["SIGNED"]);
  assert.deepEqual(getTagsForBook(byBookId, 99), []);
});

test("getAllTags returns unique sorted tags across books", () => {
  const byBookId = {
    1: ["Signed", "Arkham"],
    2: ["signed", "Reprint"],
  };
  assert.deepEqual(getAllTags(byBookId), ["ARKHAM", "REPRINT", "SIGNED"]);
});

test("applyTagsToBooks attaches tags arrays to books", () => {
  const books = [{ id: 1, title: "A" }, { id: 2, title: "B" }];
  const byBookId = { 1: ["Signed"] };
  const merged = applyTagsToBooks(books, byBookId);
  assert.deepEqual(merged[0].tags, ["SIGNED"]);
  assert.deepEqual(merged[1].tags, []);
});

test("saveTags writes json and js payloads", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arkham-tags-save-"));
  const tagsJson = path.join(tmpDir, "tags.json");
  const tagsJs = path.join(tmpDir, "tags.js");

  saveTags({ byBookId: { 7: ["Rare"] } }, { tagsJson, tagsJs });
  assert.deepEqual(JSON.parse(fs.readFileSync(tagsJson, "utf8")), {
    byBookId: { 7: ["RARE"] },
  });
  assert.match(fs.readFileSync(tagsJs, "utf8"), /"7":\s*\[\s*"RARE"/);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
