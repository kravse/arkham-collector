/* Sort, search, filters, and visible book list */

let sortedActiveCache = { key: null, books: null };

function invalidateSortedCache() {
  sortedActiveCache.key = null;
  sortedActiveCache.books = null;
}

function compareOrderTiebreak(a, b) {
  return viewerSort.compareOrderTiebreak(a, b, bookOrderIndex);
}

function compareCanonical(a, b) {
  return viewerSort.compareCanonical(a, b, bookOrderIndex);
}

function getSortedActiveBooksCacheKey() {
  return `${sortSelect.value}:${wantFilterMode ?? "off"}`;
}

function getSortedActiveBooks() {
  const cacheKey = getSortedActiveBooksCacheKey();
  if (sortedActiveCache.key === cacheKey && sortedActiveCache.books) {
    return sortedActiveCache.books;
  }
  let sorted;
  if (wantFilterMode === "ranked") {
    const wantBooks = getActiveBooks().filter((book) => wantIds.has(book.id));
    sorted = viewerWantOrder.sortBooksByWantOrder(
      wantBooks,
      wantOrderIds,
      bookOrderIndex,
    );
  } else {
    sorted = sortBooks(getActiveBooks(), sortSelect.value);
  }
  sortedActiveCache.key = cacheKey;
  sortedActiveCache.books = sorted;
  return sorted;
}

function onSortChange() {
  if (sortSelect.disabled) {
    return;
  }
  invalidateSortedCache();
  saveUserState();
  render();
}

function sortBooks(list, mode) {
  return viewerSort.sortBooks(list, mode, bookOrderIndex);
}

function matchesSearch(book, query) {
  return viewerFilters.matchesSearch(book, query);
}

function updateSortControlState() {
  const ranked = wantFilterMode === "ranked";
  if (sortSelect) {
    sortSelect.disabled = ranked;
    sortSelect.setAttribute("aria-disabled", String(ranked));
  }
  if (sortControlWrap) {
    sortControlWrap.classList.toggle("sort-control-disabled", ranked);
  }
}

const WANT_RANK_ICON = `<svg class="want-ranked-icon" viewBox="0 0 16 12" fill="none" aria-hidden="true"><path d="M1 2h14M1 6h14M1 10h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

function renderWantFilterButton() {
  const active = isWantFilterActive();
  const ranked = isWantRankedFilterActive();
  const classes = [
    "stat",
    "want-stat",
    "stat-toggle",
    active ? "active" : "",
    ranked ? "want-ranked-filter" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const label = ranked
    ? `<span class="want-ranked-button-content"><span class="want-ranked-label">WANT</span>${WANT_RANK_ICON}</span>`
    : "WANT";
  const ariaLabel = ranked
    ? "Want list sorted by priority — tap to show all books"
    : active
      ? "Viewing want list — tap to sort by priority"
      : "Filter to want list";
  return `<button type="button" class="${classes}" id="want-filter-toggle" aria-pressed="${active}" aria-label="${ariaLabel}">${label}</button>`;
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
    renderWantFilterButton(),
    hiddenCount && viewerMode.shouldShowHiddenStatFilter(serveEnabled, hiddenCount)
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

function getViewBooksWithoutSearch() {
  return viewerFilters.filterVisibleBooks(getSortedActiveBooks(), {
    hiddenOnly,
    showHidden: showHiddenInput.checked,
    showMagazines,
    mycroftFilterMode,
    collectionFilterMode,
    wantFilterMode,
    collectedIds: activeCollectionIds(),
    orderedIds,
    wantIds,
    searchFilter: { tagTerms: [], textTerms: [] },
  });
}

function getVisibleBooks() {
  return viewerFilters.filterVisibleBooks(getSortedActiveBooks(), {
    hiddenOnly,
    showHidden: showHiddenInput.checked,
    showMagazines,
    mycroftFilterMode,
    collectionFilterMode,
    wantFilterMode,
    collectedIds: activeCollectionIds(),
    orderedIds,
    wantIds,
    searchFilter: getSearchFilter(),
  });
}
