function parseYear(value) {
  if (!value) {
    return null;
  }
  const match = String(value).match(/\d{4}/);
  return match ? match[0] : null;
}

function buildBookOrderIndex(orderIds) {
  return new Map(orderIds.map((id, index) => [Number(id), index]));
}

function compareOrderTiebreak(a, b, bookOrderIndex) {
  const indexA = bookOrderIndex.has(a.id) ? bookOrderIndex.get(a.id) : a.id;
  const indexB = bookOrderIndex.has(b.id) ? bookOrderIndex.get(b.id) : b.id;
  if (indexA !== indexB) {
    return indexA - indexB;
  }
  return a.id - b.id;
}

function compareCanonical(a, b, bookOrderIndex) {
  const yearA = parseYear(a.publicationDate);
  const yearB = parseYear(b.publicationDate);
  if (yearA == null && yearB == null) {
    return compareOrderTiebreak(a, b, bookOrderIndex);
  }
  if (yearA == null) {
    return 1;
  }
  if (yearB == null) {
    return -1;
  }
  if (yearA !== yearB) {
    return yearA - yearB;
  }
  return compareOrderTiebreak(a, b, bookOrderIndex);
}

function sortBooks(list, mode, bookOrderIndex) {
  const copy = [...list];
  if (mode === "title-asc" || mode === "title") {
    return copy.sort((a, b) =>
      (a.title || "").localeCompare(b.title || ""),
    );
  }
  if (mode === "title-desc") {
    return copy.sort((a, b) =>
      (b.title || "").localeCompare(a.title || ""),
    );
  }
  if (mode === "date-desc") {
    return copy.sort((a, b) => {
      const yearA = parseYear(a.publicationDate);
      const yearB = parseYear(b.publicationDate);
      if (yearA == null && yearB == null) {
        return compareOrderTiebreak(a, b, bookOrderIndex);
      }
      if (yearA == null) {
        return 1;
      }
      if (yearB == null) {
        return -1;
      }
      if (yearA !== yearB) {
        return yearB - yearA;
      }
      return compareOrderTiebreak(a, b, bookOrderIndex);
    });
  }
  return copy.sort((a, b) => compareCanonical(a, b, bookOrderIndex));
}

module.exports = {
  parseYear,
  buildBookOrderIndex,
  compareOrderTiebreak,
  compareCanonical,
  sortBooks,
};
