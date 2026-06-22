const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  parseTaggedCatalogCsv,
  matchBookIdExactTitle,
} = require("../scripts/lib/tag-import");

test("parseTaggedCatalogCsv reads title, author, year, and comma-separated tags", () => {
  const rows = parseTaggedCatalogCsv(
    "title,author,year,tags\nWitch House,Evangeline Walton,1945,\"horror, novel\"\n",
  );
  assert.deepEqual(rows, [
    {
      title: "Witch House",
      author: "Evangeline Walton",
      year: "1945",
      tags: ["horror", "novel"],
    },
  ]);
});

test("matchBookIdExactTitle matches magazine issues by exact title", () => {
  const books = [
    {
      id: 1,
      title: "The Arkham Sampler (Vol. I, No. 1)",
      publicationDate: "Winter, 1948",
    },
    {
      id: 2,
      title: "The Arkham Sampler (Vol. I, No. 2)",
      publicationDate: "Spring, 1948",
    },
  ];

  const id = matchBookIdExactTitle(books, {
    title: "The Arkham Sampler (Vol. I, No. 1)",
    year: "1948",
  });
  assert.equal(id, 1);
});
