/* Book list helpers and CSV / title parsing */

books.forEach((book) => {
  if (book.hidden === undefined) {
    book.hidden = false;
  }
  prepareBookSearchIndex(book);
});

function prepareBookSearchIndex(book) {
  book._searchHaystack = [
    book.title,
    book.author,
    book.coverArtist,
    book.publicationDate,
    book.decade,
    book.listAuthor,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getBookDescription(book) {
  if (book.description) {
    return book.description;
  }
  const map = window.BOOK_DESCRIPTIONS || {};
  return map[book.id] ?? map[String(book.id)] ?? null;
}

function isDeleted(book) {
  return book.deleted === true;
}

function getActiveBooks() {
  return books.filter((book) => !isDeleted(book));
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

function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^the\s+/, "");
}

function parseYear(value) {
  if (!value) return null;
  const match = String(value).match(/\d{4}/);
  return match ? match[0] : null;
}

function decadeFromYear(year) {
  const value = parseInt(year, 10);
  if (!value) {
    return null;
  }
  if (value < 1940) {
    return String(value);
  }
  return `${Math.floor(value / 10) * 10}s`;
}

function parseCollection(csvText) {
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
      if (!item.title || !item.year) return false;
      if (item.title.toUpperCase() === "ARKHAM HOUSE") return false;
      if (/^\d+ on order/i.test(item.title)) return false;
      return true;
    });
}

function titlesMatch(bookTitle, collectionTitle) {
  const book = normalizeTitle(bookTitle);
  const owned = normalizeTitle(collectionTitle);
  if (!book || !owned) return false;
  if (book === owned) return true;
  if (book.includes(owned) || owned.includes(book)) return true;
  return false;
}

function collectionItemsMatchingBook(book) {
  const bookYear = parseYear(book.publicationDate);
  const candidates = [book.title, book.listTitle].filter(Boolean);
  return collection.filter((item) => {
    if (!candidates.some((candidate) => titlesMatch(candidate, item.title))) {
      return false;
    }
    if (item.year && bookYear) {
      return item.year === bookYear;
    }
    return true;
  });
}

function findCollectionMatch(book) {
  const matches = collectionItemsMatchingBook(book);
  if (!matches.length) {
    return null;
  }

  const bookYear = parseYear(book.publicationDate);
  if (bookYear) {
    const exact = matches.find((item) => item.year === bookYear);
    if (exact) {
      return exact;
    }
  }

  if (matches.length === 1) {
    return matches[0];
  }

  return null;
}

function getCollectionItem(book) {
  return activeCollectionIds().has(book.id) ? { status: "shelf" } : null;
}

function isInCollection(book) {
  return getCollectionItem(book) != null;
}

function bookCoversCollectionItem(book, item) {
  const bookYear = parseYear(book.publicationDate);
  const candidates = [book.title, book.listTitle].filter(Boolean);
  if (!candidates.some((candidate) => titlesMatch(candidate, item.title))) {
    return false;
  }
  if (item.year && bookYear && item.year === bookYear) {
    return true;
  }
  const titleRows = collection.filter((row) =>
    candidates.some((candidate) => titlesMatch(candidate, row.title)),
  );
  return titleRows.length === 1;
}

function countCollectionRowsCovered(books, includeHidden) {
  const eligible = books.filter(
    (book) => !isDeleted(book) && (includeHidden || !book.hidden),
  );
  return eligible.filter((book) => activeCollectionIds().has(book.id))
    .length;
}
