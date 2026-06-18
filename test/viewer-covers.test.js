const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  appendCoverCacheKey,
  coverSlugFromBook,
  getCoverSources,
} = require("../scripts/lib/viewer-covers");
const { slugify: slugifyCoverOnDisk } = require("../scripts/lib/text");

const book = {
  id: 42,
  coverImageFile: "covers/the-dunwich-horror-42.card.webp",
  coverImageDetailFile: "covers/the-dunwich-horror-42.detail.webp",
};

test("coverSlugFromBook matches on-disk cover naming", () => {
  const book = {
    id: 276,
    listTitle: "The Dunwich Horror and Others",
    wikipediaUrl: "https://en.wikipedia.org/wiki/The_Dunwich_Horror_and_Others",
  };
  assert.equal(coverSlugFromBook(book), "the-dunwich-horror-and-others");
  assert.equal(
    coverSlugFromBook(book),
    slugifyCoverOnDisk(
      "The Dunwich Horror and Others",
    ),
  );
});

test("getCoverSources uses hyphenated slug fallbacks", () => {
  const book = {
    id: 276,
    listTitle: "The Dunwich Horror and Others",
    wikipediaUrl: "https://en.wikipedia.org/wiki/The_Dunwich_Horror_and_Others",
  };
  assert.ok(
    getCoverSources(book, "card").includes(
      "covers/the-dunwich-horror-and-others-276.jpg",
    ),
  );
});

test("getCoverSources falls back from coverEditPath to optimized card webp", () => {
  assert.deepEqual(
    getCoverSources(
      {
        id: 419,
        coverEditPath: "covers/the-outsider-and-others-419.png",
        coverImageFile: "covers/the-outsider-and-others-419.card.webp",
        coverImageDetailFile: "covers/the-outsider-and-others-419.detail.webp",
      },
      "card",
    ),
    [
      "covers/the-outsider-and-others-419.png",
      "covers/the-outsider-and-others-419.card.webp",
    ],
  );
});

test("getCoverSources prefers card derivative for grid covers", () => {
  assert.deepEqual(getCoverSources(book, "card"), [
    "covers/the-dunwich-horror-42.card.webp",
  ]);
});

test("getCoverSources prefers detail derivative for detail overlay", () => {
  assert.deepEqual(getCoverSources(book, "detail"), [
    "covers/the-dunwich-horror-42.detail.webp",
    "covers/the-dunwich-horror-42.card.webp",
  ]);
});

test("appendCoverCacheKey adds a cache-busting query param", () => {
  assert.equal(
    appendCoverCacheKey("covers/foo.card.webp", "abc123"),
    "covers/foo.card.webp?v=abc123",
  );
  assert.equal(appendCoverCacheKey("covers/foo.card.webp", ""), "covers/foo.card.webp");
});
