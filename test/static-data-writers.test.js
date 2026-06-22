const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { saveEdits } = require("../scripts/lib/edits");
const { saveTags } = require("../scripts/lib/tags");
const { saveBookOrder } = require("../scripts/lib/book-order");
const { syncCollectionFromCsv, parseCollectionCsv } = require("../scripts/lib/collection");
const { writeJsGlobal } = require("../scripts/lib/static-data");

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
    'window.BOOK_EDITS = {\n  "3": {\n    "title": "Override"\n  }\n};\n',
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
    'window.BOOK_TAGS = {\n  "7": [\n    "RARE"\n  ]\n};\n',
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
    "window.BOOK_ORDER = [\n  1,\n  2,\n  3\n];\n",
  );
});

test("collection sync writes MY_COLLECTION js global", () => {
  const dir = tempDataDir();
  const csvPath = path.join(dir, "my_collection.csv");
  const jsPath = path.join(dir, "collection.js");
  fs.writeFileSync(
    csvPath,
    'Title,Author,Year\n"Test Book","Author",1940\n',
  );
  const items = parseCollectionCsv(fs.readFileSync(csvPath, "utf8"));
  writeJsGlobal(jsPath, "MY_COLLECTION", items);
  assert.equal(
    fs.readFileSync(jsPath, "utf8"),
    'window.MY_COLLECTION = [\n  {\n    "title": "Test Book",\n    "author": "Author",\n    "year": "1940",\n    "status": ""\n  }\n];\n',
  );
});
