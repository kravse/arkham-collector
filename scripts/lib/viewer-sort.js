function parseYear(value) {
  if (!value) {
    return null;
  }
  const match = String(value).match(/\d{4}/);
  return match ? match[0] : null;
}

const SORT_MODES = new Set([
  "date-desc",
  "date-asc",
  "title-asc",
  "title-desc",
]);

const SORT_FIELDS = new Set(["date", "title"]);

const SORT_FIELD_DEFAULTS = {
  date: "date-asc",
  title: "title-asc",
};

function normalizeSort(raw, fallback = "date-asc") {
  if (raw && SORT_MODES.has(raw)) {
    return raw;
  }
  return fallback;
}

function getSortField(mode) {
  const normalized = normalizeSort(mode);
  if (normalized.startsWith("title-")) {
    return "title";
  }
  return "date";
}

function isSortDescending(mode) {
  return normalizeSort(mode).endsWith("-desc");
}

function toggleSortDirection(mode) {
  const normalized = normalizeSort(mode);
  if (normalized.endsWith("-asc")) {
    return normalized.replace(/-asc$/, "-desc");
  }
  if (normalized.endsWith("-desc")) {
    return normalized.replace(/-desc$/, "-asc");
  }
  return normalized;
}

function sortModeForField(field, currentMode) {
  if (!field || !SORT_FIELDS.has(field)) {
    return SORT_FIELD_DEFAULTS.date;
  }
  const normalized = normalizeSort(currentMode);
  if (getSortField(normalized) === field) {
    return normalized;
  }
  return SORT_FIELD_DEFAULTS[field] || SORT_FIELD_DEFAULTS.date;
}

function sortDirectionLabel(field, descending) {
  if (field === "title") {
    return descending ? "Z to A" : "A to Z";
  }
  return descending ? "Newest first" : "Oldest first";
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
  SORT_MODES,
  SORT_FIELDS,
  SORT_FIELD_DEFAULTS,
  normalizeSort,
  getSortField,
  isSortDescending,
  toggleSortDirection,
  sortModeForField,
  sortDirectionLabel,
  parseYear,
  buildBookOrderIndex,
  compareOrderTiebreak,
  compareCanonical,
  sortBooks,
};
