const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeWantOrderIds,
  sortBooksByWantOrder,
  reorderWantOrderIds,
  wouldMoveWantToIndex,
  orderRowIdsByWantOrder,
} = require("../scripts/lib/viewer-want-order");
const { buildBookOrderIndex } = require("../scripts/lib/viewer-sort");

function book(id, title) {
  return { id, title: title || `Book ${id}`, publicationDate: "1967" };
}

test("normalizeWantOrderIds preserves order, dedupes, and backfills membership", () => {
  assert.deepEqual(normalizeWantOrderIds([12, 5, 12], [5, 12, 42]), [12, 5, 42]);
  assert.deepEqual(normalizeWantOrderIds(null, [1, 2]), [1, 2]);
});

test("sortBooksByWantOrder follows wantOrderIds", () => {
  const books = [book(3), book(1), book(2)];
  const sorted = sortBooksByWantOrder(
    books,
    [2, 3, 1],
    buildBookOrderIndex([1, 2, 3]),
  );
  assert.deepEqual(sorted.map((entry) => entry.id), [2, 3, 1]);
});

test("reorderWantOrderIds moves drag id into target slot", () => {
  assert.deepEqual(
    reorderWantOrderIds([1, 2, 3, 4], 4, 1),
    [4, 1, 2, 3],
  );
  assert.deepEqual(
    reorderWantOrderIds([1, 2, 3, 4], 1, 4),
    [2, 3, 4, 1],
  );
  assert.deepEqual(
    reorderWantOrderIds([1, 2, 3, 4], 1, 2),
    [2, 1, 3, 4],
  );
  assert.deepEqual(
    reorderWantOrderIds([1, 2, 3, 4], 4, 2),
    [1, 4, 2, 3],
  );
});

test("wouldMoveWantToIndex validates indices", () => {
  const order = [1, 2, 3];
  assert.equal(wouldMoveWantToIndex(order, 1, 2), true);
  assert.equal(wouldMoveWantToIndex(order, 9, 2), false);
  assert.equal(wouldMoveWantToIndex(order, 1, 0), false);
});

test("orderRowIdsByWantOrder sorts visible row ids by want order", () => {
  assert.deepEqual(orderRowIdsByWantOrder([3, 1, 2], [2, 3, 1]), [2, 3, 1]);
  assert.deepEqual(orderRowIdsByWantOrder([1, 99], [2, 3, 1]), [1]);
});
