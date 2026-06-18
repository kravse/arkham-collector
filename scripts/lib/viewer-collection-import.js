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
    }))
    .filter((item) => {
      if (!item.title || !item.year) {
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

function matchCollectionImportRows(books, rows) {
  const matchedIds = [];
  const unmatchedRows = [];

  for (const row of rows) {
    const id = matchBookIdForRow(books, row);
    if (id == null) {
      unmatchedRows.push(row);
    } else {
      matchedIds.push(id);
    }
  }

  return {
    matchedIds: [...new Set(matchedIds)],
    unmatchedRows,
  };
}

module.exports = {
  parseCollectionCsv,
  matchCollectionImportRows,
  matchBookIdForRow,
};
