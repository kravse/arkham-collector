const fs = require("fs");
const path = require("path");

const { DATA_DIR } = require("../config");
const { parseYear } = require("./text");
const { writeJsonAndJs } = require("./static-data");

const BOOK_ORDER_JSON = path.join(DATA_DIR, "book-order.json");
const BOOK_ORDER_JS = path.join(DATA_DIR, "book-order.js");

function bookCalendarYear(book) {
  return parseYear(book?.publicationDate);
}

function compareDefault(a, b) {
  const yearA = bookCalendarYear(a);
  const yearB = bookCalendarYear(b);
  if (yearA == null && yearB == null) {
    return a.id - b.id;
  }
  if (yearA == null) {
    return 1;
  }
  if (yearB == null) {
    return -1;
  }
  if (yearA !== yearB) {
    return Number(yearA) - Number(yearB);
  }
  return a.id - b.id;
}

function activeBooks(books) {
  return (books || []).filter((book) => book?.deleted !== true);
}

function defaultOrder(books) {
  return [...activeBooks(books)].sort(compareDefault).map((book) => book.id);
}

function groupIdsByYear(books, ids) {
  const byId = new Map(activeBooks(books).map((book) => [book.id, book]));
  const groups = new Map();

  for (const id of ids) {
    const book = byId.get(id);
    if (!book) {
      continue;
    }
    const year = bookCalendarYear(book);
    const bucketKey = year == null ? "null" : String(year);
    if (!groups.has(bucketKey)) {
      groups.set(bucketKey, { year, ids: [] });
    }
    groups.get(bucketKey).ids.push(id);
  }

  return [...groups.values()].sort((a, b) => {
    if (a.year == null && b.year == null) {
      return 0;
    }
    if (a.year == null) {
      return 1;
    }
    if (b.year == null) {
      return -1;
    }
    return Number(a.year) - Number(b.year);
  });
}

function normalizeOrder(books, savedOrder) {
  const active = activeBooks(books);
  const defaultIds = defaultOrder(active);
  if (!Array.isArray(savedOrder) || savedOrder.length === 0) {
    return defaultIds;
  }

  const activeIdSet = new Set(active.map((book) => book.id));
  const savedValid = savedOrder.filter((id) => activeIdSet.has(id));
  const savedIndex = new Map(savedValid.map((id, index) => [id, index]));
  const missing = defaultIds.filter((id) => !savedIndex.has(id));
  const candidate = [...savedValid, ...missing];

  const result = [];
  for (const group of groupIdsByYear(active, candidate)) {
    const bucketIds = [...group.ids];
    bucketIds.sort((a, b) => {
      const ia = savedIndex.has(a) ? savedIndex.get(a) : Number.MAX_SAFE_INTEGER;
      const ib = savedIndex.has(b) ? savedIndex.get(b) : Number.MAX_SAFE_INTEGER;
      if (ia !== ib) {
        return ia - ib;
      }
      return a - b;
    });
    result.push(...bucketIds);
  }

  return result;
}

function validateOrder(books, order) {
  if (!Array.isArray(order)) {
    return "Expected order array";
  }

  const active = activeBooks(books);
  const activeIdSet = new Set(active.map((book) => book.id));
  const seen = new Set();

  for (const rawId of order) {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id < 1) {
      return "Invalid book id in order";
    }
    if (!activeIdSet.has(id)) {
      return `Unknown or deleted book id in order: ${id}`;
    }
    if (seen.has(id)) {
      return `Duplicate book id in order: ${id}`;
    }
    seen.add(id);
  }

  if (seen.size !== activeIdSet.size) {
    return "Order must include every active book exactly once";
  }

  const byId = new Map(active.map((book) => [book.id, book]));
  for (let index = 1; index < order.length; index += 1) {
    const prevYear = bookCalendarYear(byId.get(order[index - 1]));
    const nextYear = bookCalendarYear(byId.get(order[index]));
    if (prevYear && nextYear && Number(prevYear) > Number(nextYear)) {
      return "Order cannot place a later year before an earlier one";
    }
  }

  return null;
}

function loadBookOrder() {
  if (!fs.existsSync(BOOK_ORDER_JSON)) {
    return { order: [] };
  }
  const payload = JSON.parse(fs.readFileSync(BOOK_ORDER_JSON, "utf8"));
  return {
    order: Array.isArray(payload.order) ? payload.order : [],
  };
}

function saveBookOrder(order, paths = {}) {
  const output = { order };
  const bookOrderJson = paths.bookOrderJson || BOOK_ORDER_JSON;
  const bookOrderJs = paths.bookOrderJs || BOOK_ORDER_JS;
  writeJsonAndJs({
    jsonPath: bookOrderJson,
    jsPath: bookOrderJs,
    jsonValue: output,
    jsGlobal: "BOOK_ORDER",
    jsValue: order,
  });
  return output;
}

function canSwapIds(books, order, fromIndex, toIndex) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= order.length ||
    toIndex >= order.length ||
    fromIndex === toIndex
  ) {
    return false;
  }

  const next = [...order];
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
  return validateOrder(books, next) === null;
}

module.exports = {
  BOOK_ORDER_JSON,
  BOOK_ORDER_JS,
  bookCalendarYear,
  defaultOrder,
  normalizeOrder,
  validateOrder,
  loadBookOrder,
  saveBookOrder,
  canSwapIds,
};
