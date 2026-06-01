const fs = require("fs");
const path = require("path");

const { DATA_DIR } = require("../config");
const { parseYear } = require("./text");

const BOOK_ORDER_JSON = path.join(DATA_DIR, "book-order.json");
const BOOK_ORDER_JS = path.join(DATA_DIR, "book-order.js");

const SEASON_SORT_ORDER = {
  winter: 1,
  spring: 2,
  summer: 3,
  autumn: 4,
  fall: 4,
};

function sortKey(publicationDate) {
  const year = parseYear(publicationDate);
  if (!year) {
    return null;
  }

  const seasonMatch = String(publicationDate || "")
    .trim()
    .match(/^(Winter|Spring|Summer|Autumn|Fall)\b/i);
  if (seasonMatch) {
    const season = seasonMatch[1].toLowerCase();
    const slot = SEASON_SORT_ORDER[season] ?? 5;
    return Number(year) * 10 + slot;
  }

  return Number(year) * 10 + 9;
}

function bookSortKey(book) {
  return sortKey(book?.publicationDate);
}

function compareDefault(a, b) {
  const keyA = bookSortKey(a);
  const keyB = bookSortKey(b);
  if (keyA == null && keyB == null) {
    return a.id - b.id;
  }
  if (keyA == null) {
    return 1;
  }
  if (keyB == null) {
    return -1;
  }
  if (keyA !== keyB) {
    return keyA - keyB;
  }
  return a.id - b.id;
}

function activeBooks(books) {
  return (books || []).filter((book) => book?.deleted !== true);
}

function defaultOrder(books) {
  return [...activeBooks(books)].sort(compareDefault).map((book) => book.id);
}

function groupIdsBySortKey(books, ids) {
  const byId = new Map(activeBooks(books).map((book) => [book.id, book]));
  const groups = new Map();

  for (const id of ids) {
    const book = byId.get(id);
    if (!book) {
      continue;
    }
    const key = bookSortKey(book);
    const bucketKey = key == null ? "null" : String(key);
    if (!groups.has(bucketKey)) {
      groups.set(bucketKey, { key, ids: [] });
    }
    groups.get(bucketKey).ids.push(id);
  }

  return [...groups.values()].sort((a, b) => {
    if (a.key == null && b.key == null) {
      return 0;
    }
    if (a.key == null) {
      return 1;
    }
    if (b.key == null) {
      return -1;
    }
    return a.key - b.key;
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
  for (const group of groupIdsBySortKey(active, candidate)) {
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
    const prev = byId.get(order[index - 1]);
    const next = byId.get(order[index]);
    const prevKey = bookSortKey(prev);
    const nextKey = bookSortKey(next);
    if (prevKey == null || nextKey == null) {
      continue;
    }
    if (prevKey > nextKey) {
      return "Order cannot place a later publication date before an earlier one";
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

function saveBookOrder(order) {
  const output = { order };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(BOOK_ORDER_JSON, `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(
    BOOK_ORDER_JS,
    `window.BOOK_ORDER = ${JSON.stringify(order, null, 2)};\n`,
  );
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

  const byId = new Map(activeBooks(books).map((book) => [book.id, book]));
  const keyA = bookSortKey(byId.get(order[fromIndex]));
  const keyB = bookSortKey(byId.get(order[toIndex]));
  if (keyA == null || keyB == null) {
    return keyA === keyB;
  }
  return keyA === keyB;
}

module.exports = {
  BOOK_ORDER_JSON,
  BOOK_ORDER_JS,
  sortKey,
  bookSortKey,
  defaultOrder,
  normalizeOrder,
  validateOrder,
  loadBookOrder,
  saveBookOrder,
  canSwapIds,
};
