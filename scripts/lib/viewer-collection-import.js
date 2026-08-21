const {
  COLLECTED,
  ORDERED,
  WANT,
  NONE,
  getBookStatus,
} = require("./viewer-book-status");

const COLLECTION_CSV_HEADER = "title,author,year,status,want_rank";

function parseYear(value) {
  if (!value) {
    return null;
  }
  const match = String(value).match(/\d{4}/);
  return match ? match[0] : null;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function normalizeForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''""]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titlesMatch(a, b) {
  const left = normalizeForMatch(a);
  const right = normalizeForMatch(b);
  if (!left || !right) {
    return false;
  }
  return left === right || left.includes(right) || right.includes(left);
}

function parseWantRank(raw) {
  if (raw == null || String(raw).trim() === "") {
    return null;
  }
  const value = Number(String(raw).trim());
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    return null;
  }
  return value;
}

/** Maps CSV status text to a book status; blank means collected for legacy 3-column files. */
function normalizeImportStatus(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "ordered" || value === "order") {
    return ORDERED;
  }
  if (value === "want" || value === "wanted") {
    return WANT;
  }
  return COLLECTED;
}

function isCollectionCsvHeaderRow(row) {
  return String(row?.title || "").trim().toLowerCase() === "title";
}

function parseCollectionCsv(csvText) {
  return csvText
    .trim()
    .split(/\r?\n/)
    .map(parseCsvLine)
    .filter((cols) => cols.length >= 3)
    .map((cols) => ({
      title: cols[0].trim(),
      author: cols[1]?.trim() || "",
      year: parseYear(cols[2]),
      status: cols[3]?.trim() || "",
      wantRank: parseWantRank(cols[4]),
    }))
    .filter((item) => {
      if (!item.title || !item.year) {
        return false;
      }
      if (isCollectionCsvHeaderRow(item)) {
        return false;
      }
      if (item.title.toUpperCase() === "ARKHAM HOUSE") {
        return false;
      }
      if (/^\d+ on order/i.test(item.title)) {
        return false;
      }
      return true;
    });
}

function bookTitleCandidates(book) {
  return [book.title, book.listTitle].filter(Boolean);
}

function rowMatchesBook(row, book) {
  const titles = bookTitleCandidates(book);
  if (!titles.some((candidate) => titlesMatch(candidate, row.title))) {
    return false;
  }
  if (row.year) {
    const bookYear = parseYear(book.publicationDate);
    if (bookYear && bookYear !== row.year) {
      return false;
    }
  }
  return true;
}

function matchBookIdForRow(books, row) {
  const matches = books.filter((book) => rowMatchesBook(row, book));
  if (matches.length === 1) {
    return matches[0].id;
  }
  if (row.year && matches.length > 1) {
    const exact = matches.filter(
      (book) => parseYear(book.publicationDate) === row.year,
    );
    if (exact.length === 1) {
      return exact[0].id;
    }
  }
  return null;
}

function matchCollectionImportEntries(books, rows) {
  const entries = [];
  const unmatchedRows = [];
  const seen = new Set();

  for (const row of rows) {
    const id = matchBookIdForRow(books, row);
    if (id == null) {
      unmatchedRows.push(row);
    } else if (!seen.has(id)) {
      seen.add(id);
      entries.push({
        id,
        status: normalizeImportStatus(row.status),
        wantRank: row.wantRank ?? null,
      });
    }
  }

  return { entries, unmatchedRows };
}

/** @deprecated Use matchCollectionImportEntries */
function matchCollectionImportRows(books, rows) {
  const { entries, unmatchedRows } = matchCollectionImportEntries(books, rows);
  return {
    matchedIds: entries.map((entry) => entry.id),
    unmatchedRows,
  };
}

/**
 * Build wantOrderIds from import entries. Uses want_rank when present; otherwise
 * preserves row order among want rows (legacy exports without a rank column).
 */
function buildWantOrderIdsFromImportEntries(entries) {
  const wantEntries = entries
    .map((entry, rowIndex) => ({ ...entry, rowIndex }))
    .filter((entry) => entry.status === WANT);

  wantEntries.sort((a, b) => {
    if (a.wantRank != null && b.wantRank != null) {
      if (a.wantRank !== b.wantRank) {
        return a.wantRank - b.wantRank;
      }
      return a.rowIndex - b.rowIndex;
    }
    if (a.wantRank != null) {
      return -1;
    }
    if (b.wantRank != null) {
      return 1;
    }
    return a.rowIndex - b.rowIndex;
  });

  return wantEntries.map((entry) => entry.id);
}

/**
 * Build export rows for every book with a collection status (collected, ordered,
 * or want). Caller supplies sort order; rows are title, author, year, status,
 * want_rank (blank unless status is want).
 */
function buildCollectionExportRows(books, statusMap, compareFn, wantOrderIds = []) {
  const wantRankById = new Map();
  for (let index = 0; index < wantOrderIds.length; index += 1) {
    wantRankById.set(Number(wantOrderIds[index]), index + 1);
  }

  const rows = [];
  for (const book of books) {
    const status = getBookStatus(statusMap, book.id);
    if (status === NONE) {
      continue;
    }
    const wantRank =
      status === WANT && wantRankById.has(book.id)
        ? String(wantRankById.get(book.id))
        : "";
    rows.push({
      book,
      cols: [
        book.title || book.listTitle || "Untitled",
        book.author || "",
        parseYear(book.publicationDate) || "",
        status,
        wantRank,
      ],
    });
  }
  if (typeof compareFn === "function") {
    rows.sort((a, b) => compareFn(a.book, b.book));
  }
  return rows.map((entry) => entry.cols);
}

module.exports = {
  COLLECTION_CSV_HEADER,
  parseCollectionCsv,
  parseWantRank,
  normalizeImportStatus,
  matchCollectionImportEntries,
  matchCollectionImportRows,
  matchBookIdForRow,
  buildWantOrderIdsFromImportEntries,
  buildCollectionExportRows,
};
