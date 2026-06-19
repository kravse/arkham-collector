const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  appendCoverCacheKey,
  getCoverPath,
} = require("../scripts/lib/viewer-covers");

const book = {
  id: 42,
  coverImageFile: "covers/the-dunwich-horror-42.card.webp",
  coverImageDetailFile: "covers/the-dunwich-horror-42.detail.webp",
  coverImageListFile: "covers/the-dunwich-horror-42.list.webp",
};

test("getCoverPath returns coverImageFile for card and detail", () => {
  assert.equal(getCoverPath(book, "card"), "covers/the-dunwich-horror-42.card.webp");
  assert.equal(getCoverPath(book, "detail"), "covers/the-dunwich-horror-42.card.webp");
});

test("getCoverPath returns detail derivative for lightbox", () => {
  assert.equal(
    getCoverPath(book, "lightbox"),
    "covers/the-dunwich-horror-42.detail.webp",
  );
});

test("getCoverPath returns list derivative for list mode", () => {
  assert.equal(
    getCoverPath(book, "list"),
    "covers/the-dunwich-horror-42.list.webp",
  );
});

test("getCoverPath list falls back to detail then card", () => {
  assert.equal(
    getCoverPath(
      {
        id: 419,
        coverImageFile: "covers/the-outsider-and-others-419.card.webp",
        coverImageDetailFile: "covers/the-outsider-and-others-419.detail.webp",
      },
      "list",
    ),
    "covers/the-outsider-and-others-419.detail.webp",
  );
  assert.equal(
    getCoverPath(
      {
        id: 419,
        coverImageFile: "covers/the-outsider-and-others-419.webp",
      },
      "list",
    ),
    "covers/the-outsider-and-others-419.webp",
  );
});

test("getCoverPath lightbox falls back to coverImageFile when no detail file", () => {
  assert.equal(
    getCoverPath(
      {
        id: 419,
        coverImageFile: "covers/the-outsider-and-others-419.webp",
      },
      "lightbox",
    ),
    "covers/the-outsider-and-others-419.webp",
  );
});

test("getCoverPath ignores remote coverImageUrl", () => {
  const remote =
    "https://upload.wikimedia.org/wikipedia/en/2/27/The_Outsider_and_Others_book_cover.jpg";
  assert.equal(getCoverPath({ id: 419, coverImageUrl: remote }, "card"), null);
  assert.equal(getCoverPath({ id: 419, coverImageUrl: remote }, "lightbox"), null);
});

test("getCoverPath returns null when book has no local cover", () => {
  assert.equal(getCoverPath({ id: 1 }, "card"), null);
  assert.equal(getCoverPath(null, "card"), null);
});

test("appendCoverCacheKey adds a cache-busting query param", () => {
  assert.equal(
    appendCoverCacheKey("covers/foo.card.webp", "abc123"),
    "covers/foo.card.webp?v=abc123",
  );
  assert.equal(appendCoverCacheKey("covers/foo.card.webp", ""), "covers/foo.card.webp");
});
