const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  findRowAtPoint,
  findNearestRowAtPoint,
  findNearestGridItemAtPoint,
  findClosestGridItemAtPoint,
} = require("../scripts/lib/viewer-pointer-reorder");

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

test("findNearestRowAtPoint falls back to the closest row in a vertical gap", () => {
  const rowA = { id: "a" };
  const rowB = { id: "b" };
  const root = {
    contains(el) {
      return el === rowA || el === rowB;
    },
    querySelectorAll() {
      return [rowA, rowB];
    },
  };
  const rects = new Map([
    [rowA, { left: 0, right: 100, top: 0, bottom: 40, height: 40 }],
    [rowB, { left: 0, right: 100, top: 48, bottom: 88, height: 40 }],
  ]);

  const found = findNearestRowAtPoint({
    root,
    clientX: 50,
    clientY: 44,
    rowSelector: ".row",
    excludeRow: null,
    gapSlop: 12,
    elementsFromPoint: () => [root],
    getRowRect: (row) => rects.get(row),
  });

  assert.equal(found, rowA);
});

test("findNearestGridItemAtPoint falls back to the nearest card in a grid gap", () => {
  const itemA = { id: "a" };
  const itemB = { id: "b" };
  const root = {
    contains(el) {
      return el === itemA || el === itemB;
    },
    querySelectorAll() {
      return [itemA, itemB];
    },
  };
  const rects = new Map([
    [itemA, { left: 0, right: 100, top: 0, bottom: 120, width: 100, height: 120 }],
    [itemB, { left: 116, right: 216, top: 0, bottom: 120, width: 100, height: 120 }],
  ]);

  const found = findNearestGridItemAtPoint({
    root,
    clientX: 108,
    clientY: 60,
    itemSelector: ".item",
    excludeItem: null,
    gapSlop: 12,
    elementsFromPoint: () => [root],
    getItemRect: (item) => rects.get(item),
  });

  assert.equal(found, itemA);
});

test("findClosestGridItemAtPoint picks the nearest card by center distance", () => {
  const itemA = { id: "a" };
  const itemB = { id: "b" };
  const root = {
    contains(el) {
      return el === itemA || el === itemB;
    },
    querySelectorAll() {
      return [itemA, itemB];
    },
  };
  const rects = new Map([
    [itemA, { left: 0, right: 100, top: 0, bottom: 120, width: 100, height: 120 }],
    [itemB, { left: 116, right: 216, top: 0, bottom: 120, width: 100, height: 120 }],
  ]);

  const found = findClosestGridItemAtPoint({
    root,
    clientX: 95,
    clientY: 60,
    itemSelector: ".card",
    excludeItem: null,
    getItemRect: (item) => rects.get(item),
  });

  assert.equal(found, itemA);
});
