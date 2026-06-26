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
  if (viewerWantView.usesWantPrioritySort(wantFilterMode)) {
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
  const wantSort = viewerWantView.shouldDisableCatalogSort(wantFilterMode);
  if (sortSelect) {
    sortSelect.disabled = wantSort;
    sortSelect.classList.toggle("is-sort-slot-hidden", wantSort);
    sortSelect.setAttribute("aria-hidden", String(wantSort));
  }
  if (sortWantBadge) {
    sortWantBadge.classList.toggle("is-sort-slot-hidden", !wantSort);
    sortWantBadge.setAttribute("aria-hidden", String(!wantSort));
    const listHint =
      gridViewMode === "list" && !hasActiveSearch()
        ? " Drag rank tabs to reorder."
        : "";
    sortWantBadge.setAttribute(
      "aria-label",
      `Sorted by your want list priority.${listHint}`,
    );
  }
  if (sortControlWrap) {
    sortControlWrap.classList.toggle("sort-control-want-order", wantSort);
  }
}

function renderWantFilterButton() {
  const active = isWantFilterActive();
  const classes = [
    "stat",
    "want-stat",
    "stat-toggle",
    active ? "active" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const ariaLabel = active
    ? "Viewing want list — tap to show all books"
    : "Filter to want list";
  return `<button type="button" class="${classes}" id="want-filter-toggle" aria-pressed="${active}" aria-label="${ariaLabel}">WANT</button>`;
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
