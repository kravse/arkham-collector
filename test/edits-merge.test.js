const { test } = require("node:test");
const assert = require("node:assert/strict");

const { applyEditsToBook } = require("../scripts/lib/edits");

test("applyEditsToBook keeps built cover derivatives when coverImageDetailFile is set", () => {
  const book = {
    id: 238,
    title: "The Shunned House",
    coverImageFile: "covers/the-shunned-house-238.card.webp",
    coverImageDetailFile: "covers/the-shunned-house-238.detail.webp",
  };
  const merged = applyEditsToBook(book, {
    238: {
      coverImageFile: "covers/the-shunned-house-238.jpg",
      goodreadsUrl: "https://www.goodreads.com/book/show/8507286",
    },
  });

  assert.equal(merged.coverImageFile, "covers/the-shunned-house-238.card.webp");
  assert.equal(merged.coverImageDetailFile, "covers/the-shunned-house-238.detail.webp");
  assert.equal(
    merged.goodreadsUrl,
    "https://www.goodreads.com/book/show/8507286",
  );
});

test("applyEditsToBook applies edit cover path in dev when no detail derivative exists", () => {
  const book = {
    id: 238,
    title: "The Shunned House",
    coverImageFile: "covers/the-shunned-house-150.jpg",
  };
  const merged = applyEditsToBook(book, {
    238: {
      coverImageFile: "covers/the-shunned-house-238.jpg",
    },
  });

  assert.equal(merged.coverImageFile, "covers/the-shunned-house-238.jpg");
  assert.equal(merged.coverImageDetailFile, undefined);
});
