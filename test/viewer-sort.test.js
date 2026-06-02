const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  buildBookOrderIndex,
  sortBooks,
} = require("../scripts/lib/viewer-sort");

function book(id, year, title) {
  return {
    id,
    publicationDate: year == null ? null : String(year),
    title: title || `Book ${id}`,
  };
}

test("date-asc sorts by year then custom order within a year", () => {
  const books = [
    book(30, 1968, "Later year"),
    book(10, 1967, "Third"),
    book(11, 1967, "First"),
    book(12, 1967, "Second"),
  ];
  const bookOrderIndex = buildBookOrderIndex([11, 12, 10, 30]);

  const sorted = sortBooks(books, "date-asc", bookOrderIndex);

  assert.deepEqual(
    sorted.map((entry) => entry.id),
    [11, 12, 10, 30],
  );
});

test("date-desc reverses years but keeps custom order within a year", () => {
  const books = [
    book(30, 1968, "Later year"),
    book(10, 1967, "Third"),
    book(11, 1967, "First"),
    book(12, 1967, "Second"),
  ];
  const bookOrderIndex = buildBookOrderIndex([11, 12, 10, 30]);

  const sorted = sortBooks(books, "date-desc", bookOrderIndex);

  assert.deepEqual(
    sorted.map((entry) => entry.id),
    [30, 11, 12, 10],
  );
});

test("date-asc uses id tiebreak when custom order omits a same-year book", () => {
  const books = [book(5, 1967), book(2, 1967), book(8, 1967)];
  const bookOrderIndex = buildBookOrderIndex([5, 8]);

  const sorted = sortBooks(books, "date-asc", bookOrderIndex);

  assert.deepEqual(
    sorted.map((entry) => entry.id),
    [5, 8, 2],
  );
});

test("title sorts ignore custom order", () => {
  const books = [
    book(1, 1967, "Charlie"),
    book(2, 1967, "Alpha"),
    book(3, 1967, "Bravo"),
  ];
  const bookOrderIndex = buildBookOrderIndex([1, 2, 3]);

  assert.deepEqual(
    sortBooks(books, "title-asc", bookOrderIndex).map((entry) => entry.id),
    [2, 3, 1],
  );
  assert.deepEqual(
    sortBooks(books, "title-desc", bookOrderIndex).map((entry) => entry.id),
    [1, 3, 2],
  );
});

test("fixture order matches date-asc within every multi-book year", () => {
  const { books } = require("./fixtures/sort-books.json");
  const { order } = require("./fixtures/sort-order.json");
  const bookOrderIndex = buildBookOrderIndex(order);
  const active = books.filter((entry) => !entry.deleted);

  const byYear = new Map();
  for (const entry of active) {
    const year = entry.publicationDate?.match(/\d{4}/)?.[0] || "null";
    if (!byYear.has(year)) {
      byYear.set(year, []);
    }
    byYear.get(year).push(entry.id);
  }

  for (const [year, ids] of byYear.entries()) {
    if (ids.length < 2) {
      continue;
    }
    const subset = active.filter((entry) => ids.includes(entry.id));
    const sortedIds = sortBooks(subset, "date-asc", bookOrderIndex).map(
      (entry) => entry.id,
    );
    const customIds = order.filter((id) => ids.includes(id));

    assert.deepEqual(
      sortedIds,
      customIds,
      `date-asc should follow custom order for year ${year}`,
    );
  }
});
