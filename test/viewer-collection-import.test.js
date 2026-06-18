const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseCollectionCsv,
  matchCollectionImportRows,
  matchBookIdForRow,
} = require("../scripts/lib/viewer-collection-import");

const books = [
  {
    id: 1,
    title: "Witch House",
    listTitle: "Witch House",
    publicationDate: "1945",
  },
  {
    id: 2,
    title: "Dark Mind, Dark Heart",
    listTitle: "Dark Mind, Dark Heart",
    publicationDate: "1962",
  },
  {
    id: 3,
    title: "Tales of the Cthulhu Mythos",
    publicationDate: "1969",
  },
  {
    id: 4,
    title: "Tales of the Cthulhu Mythos",
    publicationDate: "1990",
  },
  {
    id: 5,
    title: "Missing From Catalog",
    publicationDate: "2000",
  },
];

test("parseCollectionCsv reads quoted titles and years", () => {
  const rows = parseCollectionCsv(
    'Witch House,Evangeline Walton,1945\n"Dark Mind, Dark Heart",August Derleth,1962\n',
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].title, "Witch House");
  assert.equal(rows[0].year, "1945");
  assert.equal(rows[1].title, "Dark Mind, Dark Heart");
  assert.equal(rows[1].year, "1962");
});

test("matchBookIdForRow disambiguates same title by year", () => {
  assert.equal(
    matchBookIdForRow(books, {
      title: "Tales of the Cthulhu Mythos",
      author: "",
      year: "1990",
    }),
    4,
  );
  assert.equal(
    matchBookIdForRow(books, {
      title: "Tales of the Cthulhu Mythos",
      author: "",
      year: "1969",
    }),
    3,
  );
});

test("matchCollectionImportRows returns unmatched rows", () => {
  const result = matchCollectionImportRows(books, [
    { title: "Witch House", author: "", year: "1945" },
    { title: "Not In Arkham House", author: "", year: "1950" },
  ]);
  assert.deepEqual(result.matchedIds, [1]);
  assert.equal(result.unmatchedRows.length, 1);
  assert.equal(result.unmatchedRows[0].title, "Not In Arkham House");
});

test("matchCollectionImportRows dedupes repeated rows", () => {
  const result = matchCollectionImportRows(books, [
    { title: "Witch House", author: "", year: "1945" },
    { title: "Witch House", author: "", year: "1945" },
  ]);
  assert.deepEqual(result.matchedIds, [1]);
});
