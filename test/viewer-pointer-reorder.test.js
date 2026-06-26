const { test } = require("node:test");
const assert = require("node:assert/strict");

const { findRowAtPoint } = require("../scripts/lib/viewer-pointer-reorder");

function mockRow(id, root) {
  const row = {
    dataset: { bookId: String(id) },
    closest(selector) {
      return selector === ".card" ? row : null;
    },
  };
  row.contains = (el) => el === row;
  if (root) {
    root.contains = (el) => el === row || el === root;
  }
  return row;
}

test("findRowAtPoint returns first matching row under the pointer", () => {
  const root = { contains() {} };
  const rowA = mockRow(1, root);
  const rowB = mockRow(2, root);
  root.contains = (el) => el === rowA || el === rowB || el === root;

  const child = { closest(selector) {
    return selector === ".card" ? rowB : null;
  } };

  const found = findRowAtPoint({
    root,
    clientX: 10,
    clientY: 20,
    rowSelector: ".card",
    excludeRow: rowA,
    elementsFromPoint: () => [child],
  });

  assert.equal(found, rowB);
});

test("findRowAtPoint skips excluded row and returns null when none match", () => {
  const root = { contains() {} };
  const row = mockRow(1, root);
  root.contains = (el) => el === row || el === root;

  assert.equal(
    findRowAtPoint({
      root,
      clientX: 0,
      clientY: 0,
      rowSelector: ".card",
      excludeRow: row,
      elementsFromPoint: () => [row],
    }),
    null,
  );

  assert.equal(
    findRowAtPoint({
      root: null,
      clientX: 0,
      clientY: 0,
      rowSelector: ".card",
      excludeRow: null,
      elementsFromPoint: () => [],
    }),
    null,
  );
});
