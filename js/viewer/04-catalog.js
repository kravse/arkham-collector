/* Sort, search, filters, and visible book list */

let sortedActiveCache = { books: null };

function invalidateSortedCache() {
  sortedActiveCache.books = null;
}

function compareOrderTiebreak(a, b) {
  const indexA = bookOrderIndex.has(a.id) ? bookOrderIndex.get(a.id) : a.id;
  const indexB = bookOrderIndex.has(b.id) ? bookOrderIndex.get(b.id) : b.id;
  if (indexA !== indexB) {
    return indexA - indexB;
  }
  return a.id - b.id;
}

function compareCanonical(a, b) {
  const yearA = parseYear(a.publicationDate);
  const yearB = parseYear(b.publicationDate);
  if (yearA == null && yearB == null) {
    return compareOrderTiebreak(a, b);
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
  return compareOrderTiebreak(a, b);
}

function getSortedActiveBooks() {
  if (sortedActiveCache.books) {
    return sortedActiveCache.books;
  }
  const sorted = sortBooks(getActiveBooks());
  sortedActiveCache.books = sorted;
  return sorted;
}

function onSortChange() {
  invalidateSortedCache();
  saveSortPreference();
  render();
}

function sortBooks(list) {
  return [...list].sort(compareCanonical);
}

function matchesSearch(book, query) {
  if (!query) return true;
  return (book._searchHaystack || "").includes(query.toLowerCase());
}

function getStatTotal(activeBooks) {
  if (hiddenOnly) {
    return activeBooks.filter((book) => book.hidden).length;
  }
  return activeBooks
    .filter((book) => passesBookVisibility(book))
    .filter((book) => passesMycroftImprintFilter(book))
    .length;
}

function renderStats(visible, all) {
  const activeBooks = all.filter((book) => !isDeleted(book));
  const hiddenCount = activeBooks.filter((book) => book.hidden).length;
  const total = getStatTotal(activeBooks);
  const showingCount = visible.length;
  const hasMycroft = activeBooks.some(
    (book) => book.imprint === "mycroft_moran",
  );
  const mycroftToggleClass = [
    "stat",
    "mycroft-stat",
    "stat-toggle",
    isMycroftOnlyFilter() ? "active" : "",
    isMycroftHiddenFilter() ? "excluded" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const collectionToggleClass = [
    "stat",
    "owned-stat",
    "stat-toggle",
    isCollectionAllFilter() ? "active" : "",
    isOrderedFilterActive() ? "ordered-filter" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const collectionToggleLabel = isOrderedFilterActive() ? "ORDERED" : "COLLECTION";
  const filters = [
    `<button type="button" class="${collectionToggleClass}" id="collection-filter-toggle" aria-pressed="${isCollectionFilterActive()}">${collectionToggleLabel}</button>`,
    hasMycroft
      ? `<button type="button" class="${mycroftToggleClass}" id="mycroft-filter-toggle" aria-pressed="${isMycroftOnlyFilter()}"><span class="mycroft-stat-label">MYCROFT &amp; MORAN</span></button>`
      : "",
    `<button type="button" class="stat want-stat stat-toggle${wantOnly ? " active" : ""}" id="want-filter-toggle" aria-pressed="${wantOnly}">WANT</button>`,
    hiddenCount && serveEnabled
      ? `<button type="button" class="stat hidden-stat stat-toggle${hiddenOnly ? " active" : ""}" id="hidden-filter-toggle" aria-pressed="${hiddenOnly}">HIDDEN</button>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  stats.innerHTML = `
    <span class="stat-showing">Showing ${showingCount} of ${total}</span>
    <div class="stats-filters${hasMycroft ? "" : " stats-filters--two"}">${filters}</div>
  `;
}

function getVisibleBooks() {
  const query = searchInput.value.trim();
  return getSortedActiveBooks()
    .filter((book) => passesBookVisibility(book))
    .filter((book) => passesMycroftImprintFilter(book))
    .filter((book) => passesCollectionFilter(book))
    .filter((book) => !wantOnly || isWanted(book))
    .filter((book) => matchesSearch(book, query));
}
