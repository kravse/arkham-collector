const fs = require("fs");

const { parseCsvLine, parseYear, normalizeForMatch } = require("./text");
const { loadMergedActiveBooks } = require("./catalog-export");
const { matchBookIdForRow } = require("./viewer-collection-import");
const { normalizeTags, saveTags } = require("./tags");

function parseTaggedCatalogCsv(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (!lines.length) {
    return [];
  }

  return lines
    .slice(1)
    .map(parseCsvLine)
    .filter((cols) => cols.length >= 4)
    .map((cols) => ({
      title: cols[0].trim(),
      author: cols[1]?.trim() || "",
      year: parseYear(cols[2]),
      tags: String(cols[3] || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    }))
    .filter((row) => row.title);
}

function matchBookIdExactTitle(books, row) {
  const key = normalizeForMatch(row.title);
  const matches = books.filter((book) => {
    const titles = [book.title, book.listTitle].filter(Boolean);
    if (!titles.some((title) => normalizeForMatch(title) === key)) {
      return false;
    }
    if (row.year) {
      const bookYear = parseYear(book.publicationDate);
      if (bookYear && bookYear !== row.year) {
        return false;
      }
    }
    return true;
  });

  if (matches.length === 1) {
    return matches[0].id;
  }
  return null;
}

function matchBookIdForTaggedRow(books, row) {
  return matchBookIdExactTitle(books, row) ?? matchBookIdForRow(books, row);
}

function importTagsFromCsv(csvPath, options = {}) {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Missing tagged catalog CSV: ${csvPath}`);
  }

  const rows = parseTaggedCatalogCsv(fs.readFileSync(csvPath, "utf8"));
  const books = loadMergedActiveBooks().filter(
    (book) => book.imprint === (options.imprint || "arkham_house"),
  );
  const byBookId = {};
  const unmatchedRows = [];

  for (const row of rows) {
    const bookId = matchBookIdForTaggedRow(books, row);
    if (bookId == null) {
      unmatchedRows.push(row);
      continue;
    }
    byBookId[String(bookId)] = normalizeTags(row.tags);
  }

  if (unmatchedRows.length && !options.allowUnmatched) {
    const sample = unmatchedRows
      .slice(0, 5)
      .map((row) => `${row.title} (${row.year || "?"})`)
      .join("; ");
    throw new Error(
      `Could not match ${unmatchedRows.length} CSV row(s): ${sample}`,
    );
  }

  saveTags({ byBookId });

  return {
    rowCount: rows.length,
    taggedBooks: Object.keys(byBookId).length,
    unmatchedRows,
  };
}

module.exports = {
  parseTaggedCatalogCsv,
  matchBookIdExactTitle,
  matchBookIdForTaggedRow,
  importTagsFromCsv,
};
