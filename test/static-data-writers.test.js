const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { saveEdits } = require("../scripts/lib/edits");
const { saveTags } = require("../scripts/lib/tags");
const { saveBookOrder } = require("../scripts/lib/book-order");

function tempDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "arkham-writers-"));
}

test("saveEdits writes json wrapper and BOOK_EDITS js global", () => {
  const dir = tempDataDir();
  const editsJson = path.join(dir, "edits.json");
  const editsJs = path.join(dir, "edits.js");
  saveEdits(
    { edits: { 3: { title: "Override" } } },
    { editsJson, editsJs },
  );
  assert.deepEqual(JSON.parse(fs.readFileSync(editsJson, "utf8")), {
    edits: { 3: { title: "Override" } },
  });
  assert.equal(
    fs.readFileSync(editsJs, "utf8"),
    'window.BOOK_EDITS = {"3":{"title":"Override"}};\n',
  );
});

test("saveTags writes byBookId json and BOOK_TAGS js global", () => {
  const dir = tempDataDir();
  const tagsJson = path.join(dir, "tags.json");
  const tagsJs = path.join(dir, "tags.js");
  saveTags({ byBookId: { 7: ["RARE"] } }, { tagsJson, tagsJs });
  assert.deepEqual(JSON.parse(fs.readFileSync(tagsJson, "utf8")), {
    byBookId: { 7: ["RARE"] },
  });
  assert.equal(
    fs.readFileSync(tagsJs, "utf8"),
    'window.BOOK_TAGS = {"7":["RARE"]};\n',
  );
});

test("saveBookOrder writes order json and BOOK_ORDER js global", () => {
  const dir = tempDataDir();
  const jsonPath = path.join(dir, "book-order.json");
  const jsPath = path.join(dir, "book-order.js");
  saveBookOrder([1, 2, 3], { bookOrderJson: jsonPath, bookOrderJs: jsPath });
  assert.deepEqual(JSON.parse(fs.readFileSync(jsonPath, "utf8")), {
    order: [1, 2, 3],
  });
  assert.equal(
    fs.readFileSync(jsPath, "utf8"),
    "window.BOOK_ORDER = [1,2,3];\n",
  );
});
