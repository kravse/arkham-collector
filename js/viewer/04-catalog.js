/* Sort, search, filters, and visible book list */

let sortedActiveCache = { mode: null, books: null };

function invalidateSortedCache() {
  sortedActiveCache.mode = null;
  sortedActiveCache.books = null;
}

function getSortedActiveBooks() {
  const mode = sortSelect.value;
  if (sortedActiveCache.mode === mode && sortedActiveCache.books) {
    return sortedActiveCache.books;
  }
  const sorted = sortBooks(getActiveBooks(), mode);
  sortedActiveCache.mode = mode;
  sortedActiveCache.books = sorted;
  return sorted;
}

function onSortChange() {
  invalidateSortedCache();
  saveSortPreference();
  render();
}

function sortBooks(list, mode) {
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
  if (mode === "date-desc" || mode === "date-asc") {
    return copy.sort((a, b) => {
      const yearA = parseSortYear(a.publicationDate);
      const yearB = parseSortYear(b.publicationDate);
      if (yearA == null && yearB == null) return 0;
      if (yearA == null) return 1;
      if (yearB == null) return -1;
      return mode === "date-desc" ? yearB - yearA : yearA - yearB;
    });
  }
  return copy.sort((a, b) => {
    const yearA = parseSortYear(a.publicationDate);
    const yearB = parseSortYear(b.publicationDate);
    if (yearA == null && yearB == null) return 0;
    if (yearA == null) return 1;
    if (yearB == null) return -1;
    return yearA - yearB;
  });
}

function matchesSearch(book, query) {
  if (!query) return true;
  return (book._searchHaystack || "").includes(query.toLowerCase());
}

function getStatTotal(activeBooks) {
  const showHidden = showHiddenInput.checked;
  if (hiddenOnly) {
    return activeBooks.filter((book) => book.hidden).length;
  }
  return activeBooks.filter((book) => showHidden || !book.hidden).length;
}

function renderStats(visible, all) {
  const activeBooks = all.filter((book) => !isDeleted(book));
  const hiddenCount = activeBooks.filter((book) => book.hidden).length;
  const total = getStatTotal(activeBooks);
  const showingCount = visible.length;
  const hasMycroft = activeBooks.some(
    (book) => book.imprint === "mycroft_moran",
  );
  const filters = [
    `<button type="button" class="stat owned-stat stat-toggle${collectionOnly ? " active" : ""}" id="collection-filter-toggle" aria-pressed="${collectionOnly}">COLLECTION</button>`,
    hasMycroft
      ? `<button type="button" class="stat mycroft-stat stat-toggle${mycroftOnly ? " active" : ""}" id="mycroft-filter-toggle" aria-pressed="${mycroftOnly}">MYCROFT &amp; MORAN</button>`
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
  const showHidden = showHiddenInput.checked;
  return getSortedActiveBooks()
    .filter((book) =>
      hiddenOnly ? book.hidden : showHidden || !book.hidden,
    )
    .filter((book) => !mycroftOnly || book.imprint === "mycroft_moran")
    .filter((book) => !collectionOnly || isInCollection(book))
    .filter((book) => !wantOnly || isWanted(book))
    .filter((book) => matchesSearch(book, query));
}
