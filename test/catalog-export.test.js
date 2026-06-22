const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  escapeCsvField,
  buildArkhamCatalogRows,
  rowsToCsv,
} = require("../scripts/lib/catalog-export");

test("escapeCsvField quotes fields with commas or quotes", () => {
  assert.equal(escapeCsvField("Plain"), "Plain");
  assert.equal(escapeCsvField('Say "hello"'), '"Say ""hello"""');
  assert.equal(escapeCsvField("A, B"), '"A, B"');
});

test("buildArkhamCatalogRows filters imprint and sorts by year", () => {
  const books = [
    {
      id: 3,
      imprint: "arkham_house",
      title: "Later",
      author: "Author C",
      publicationDate: "1950",
    },
    {
      id: 1,
      imprint: "mycroft_moran",
      title: "Skip Me",
      author: "Author A",
      publicationDate: "1945",
    },
    {
      id: 2,
      imprint: "arkham_house",
      title: "Earlier",
      author: "Author B",
      publicationDate: "1940",
    },
  ];

  const rows = buildArkhamCatalogRows(books, { order: [2, 3] });
  assert.deepEqual(rows, [
    ["Earlier", "Author B", "1940"],
    ["Later", "Author C", "1950"],
  ]);
});

test("rowsToCsv matches collection export shape", () => {
  const csv = rowsToCsv([
    ["Witch House", "Evangeline Walton", "1945"],
    ['Dark Mind, Dark Heart', "August Derleth", "1962"],
  ]);
  assert.equal(
    csv,
    "Witch House,Evangeline Walton,1945\n\"Dark Mind, Dark Heart\",August Derleth,1962\n",
  );
});
