/* Sort, search, filters, and visible book list */

let prefilteredCache = { key: null, books: null };
let sortedActiveCache = { key: null, books: null };
let lastStatsRenderSignature = null;

function getCatalogFilterCacheKey() {
  return [
    hiddenOnly,
    showMagazines,
    mycroftFilterMode,
    collectionFilterMode,
    wantFilterMode,
    collectionIds.size,
    orderedIds.size,
    wantIds.size,
  ].join(":");
}

function invalidateSortedCache() {
  prefilteredCache.key = null;
  prefilteredCache.books = null;
  sortedActiveCache.key = null;
  sortedActiveCache.books = null;
  if (typeof invalidateSearchViewCache === "function") {
    invalidateSearchViewCache();
  }
}

function compareOrderTiebreak(a, b) {
  return viewerSort.compareOrderTiebreak(a, b, bookOrderIndex);
}

function compareCanonical(a, b) {
  return viewerSort.compareCanonical(a, b, bookOrderIndex);
}

function getPrefilteredBooks() {
  const cacheKey = getCatalogFilterCacheKey();
  if (prefilteredCache.key === cacheKey && prefilteredCache.books) {
    return prefilteredCache.books;
  }
  const books = viewerFilters.filterBooksByCatalogFilters(getActiveBooks(), {
    hiddenOnly,
    showMagazines,
    mycroftFilterMode,
    collectionFilterMode,
    wantFilterMode,
    collectedIds: activeCollectionIds(),
    orderedIds,
    wantIds,
  });
  prefilteredCache.key = cacheKey;
  prefilteredCache.books = books;
  return books;
}

function getSortedActiveBooksCacheKey() {
  return `${getCatalogFilterCacheKey()}:${getCatalogSortMode()}`;
}

function getSortedActiveBooks() {
  const cacheKey = getSortedActiveBooksCacheKey();
  if (sortedActiveCache.key === cacheKey && sortedActiveCache.books) {
    return sortedActiveCache.books;
  }
  const source = getPrefilteredBooks();
  let sorted;
  if (viewerWantView.usesWantPrioritySort(wantFilterMode)) {
    sorted = viewerWantOrder.sortBooksByWantOrder(
      source,
      wantOrderIds,
      bookOrderIndex,
    );
  } else {
    sorted = sortBooks(source, getCatalogSortMode());
  }
  sortedActiveCache.key = cacheKey;
  sortedActiveCache.books = sorted;
  return sorted;
}

function getCatalogSortMode() {
  return catalogSortMode;
}

function syncSortReverseButton(mode) {
  if (!sortReverseBtn) {
    return;
  }
  const descending = viewerSort.isSortDescending(mode);
  const field = viewerSort.getSortField(mode);
  sortReverseBtn.classList.toggle("is-descending", descending);
  sortReverseBtn.classList.toggle("is-ascending", !descending);
  sortReverseBtn.classList.toggle(
    "is-newest-first",
    field === "date" && descending,
  );
  const directionLabel = viewerSort.sortDirectionLabel(field, descending);
  sortReverseBtn.title = `${directionLabel} · click to reverse`;
  sortReverseBtn.setAttribute(
    "aria-label",
    `Sort order: ${directionLabel}. Reverse.`,
  );
}

function syncSortControlFromMode(mode) {
  const normalized = viewerSort.normalizeSort(mode);
  catalogSortMode = normalized;
  if (sortSelect) {
    sortSelect.value = viewerSort.getSortField(normalized);
  }
  syncSortReverseButton(normalized);
}

function setCatalogSortMode(mode) {
  const next = viewerSort.normalizeSort(mode);
  if (next === catalogSortMode) {
    syncSortReverseButton(next);
    return;
  }
  catalogSortMode = next;
  syncSortControlFromMode(next);
  invalidateSortedCache();
  saveUserState();
  render();
}

function onSortFieldChange() {
  if (sortSelect.disabled) {
    return;
  }
  setCatalogSortMode(
    viewerSort.sortModeForField(sortSelect.value, catalogSortMode),
  );
}

function toggleSortOrder() {
  if (sortSelect.disabled) {
    return;
  }
  setCatalogSortMode(viewerSort.toggleSortDirection(catalogSortMode));
  sortReverseBtn?.blur();
}

function onSortChange() {
  onSortFieldChange();
}

function sortBooks(list, mode) {
  return viewerSort.sortBooks(list, mode, bookOrderIndex);
}

function matchesSearch(book, query) {
  return viewerFilters.matchesSearch(book, query);
}

let wantOrderLockJiggleTimer = null;

function toggleWantOrderLock() {
  wantOrderLocked = !wantOrderLocked;
  saveUserState();
  updateSortControlState();
  render();
}

function jiggleWantOrderLock() {
  const lockIcon = sortWantBadge?.querySelector(".sort-want-badge-lock");
  if (lockIcon) {
    lockIcon.classList.remove("is-jiggling");
    void lockIcon.offsetWidth;
    lockIcon.classList.add("is-jiggling");
  }
  if (sortWantBadge) {
    sortWantBadge.classList.remove("is-locked-drag-denied");
    void sortWantBadge.offsetWidth;
    sortWantBadge.classList.add("is-locked-drag-denied");
  }
  clearTimeout(wantOrderLockJiggleTimer);
  wantOrderLockJiggleTimer = setTimeout(() => {
    lockIcon?.classList.remove("is-jiggling");
    sortWantBadge?.classList.remove("is-locked-drag-denied");
  }, 750);
}

function updateSortControlState() {
  const wantSort = viewerWantView.shouldDisableCatalogSort(wantFilterMode);
  if (sortSelect) {
    sortSelect.disabled = wantSort;
    sortSelect.classList.toggle("is-sort-slot-hidden", wantSort);
    sortSelect.setAttribute("aria-hidden", String(wantSort));
  }
  if (sortReverseBtn) {
    sortReverseBtn.hidden = wantSort;
    sortReverseBtn.disabled = wantSort;
    sortReverseBtn.setAttribute("aria-hidden", String(wantSort));
  }
  if (!wantSort) {
    syncSortControlFromMode(catalogSortMode);
  }
  if (sortWantBadge) {
    sortWantBadge.hidden = !wantSort;
    sortWantBadge.classList.toggle("is-sort-slot-hidden", !wantSort);
    sortWantBadge.setAttribute("aria-hidden", String(!wantSort));
    const badgeText = sortWantBadge.querySelector(".sort-want-badge-text");
    if (badgeText) {
      badgeText.textContent = wantOrderLocked
        ? "sorting locked"
        : "sorting unlocked";
    }
    sortWantBadge.classList.toggle("is-want-sort-locked", wantOrderLocked);
    sortWantBadge.classList.toggle("is-want-sort-unlocked", !wantOrderLocked);
    sortWantBadge.setAttribute("aria-pressed", String(wantOrderLocked));
    const listHint =
      gridViewMode === "list" && !hasActiveSearch() && !wantOrderLocked
        ? " Drag rank tabs to reorder."
        : gridViewMode === "cards" && !hasActiveSearch() && !wantOrderLocked
          ? " Drag rank chips to reorder."
          : wantOrderLocked
            ? " Tap to unlock and reorder."
            : " Tap to lock order.";
    const lockLabel = wantOrderLocked
      ? "Want sorting locked"
      : "Want sorting unlocked";
    sortWantBadge.setAttribute(
      "aria-label",
      `${lockLabel}.${listHint}`,
    );
    sortWantBadge.title = wantOrderLocked
      ? "Tap to unlock want list order"
      : "Tap to lock want list order";
  }
  document.body.classList.toggle(
    "want-order-locked",
    wantSort && wantOrderLocked,
  );
  if (sortControlWrap) {
    sortControlWrap.classList.toggle("sort-control-want-order", wantSort);
  }
}

if (sortWantBadge) {
  sortWantBadge.addEventListener("click", (event) => {
    event.preventDefault();
    toggleWantOrderLock();
  });
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

function buildStatsRenderSignature(visible, activeBooks) {
  const hiddenCount = activeBooks.filter((book) => book.hidden).length;
  const total = getStatTotal(activeBooks);
  const hasMycroft = activeBooks.some(
    (book) => book.imprint === "mycroft_moran",
  );
  return [
    visible.length,
    total,
    hiddenCount,
    hasMycroft ? 1 : 0,
    isMycroftOnlyFilter() ? 1 : 0,
    isMycroftHiddenFilter() ? 1 : 0,
    isCollectionAllFilter() ? 1 : 0,
    isOrderedFilterActive() ? 1 : 0,
    isWantFilterActive() ? 1 : 0,
    hiddenOnly ? 1 : 0,
    viewerMode.shouldShowHiddenStatFilter(serveEnabled, hiddenCount) ? 1 : 0,
  ].join(":");
}

function renderStats(visible, all) {
  const activeBooks = all.filter((book) => !isDeleted(book));
  const signature = buildStatsRenderSignature(visible, activeBooks);
  if (signature === lastStatsRenderSignature) {
    return;
  }
  lastStatsRenderSignature = signature;

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
    <div class="stats-filters${hasMycroft ? "" : " stats-filters--two"}">${filters}</div>
    <p class="stat-showing">Showing ${showingCount} of ${total}</p>
  `;
}

function getViewBooksWithoutSearch() {
  return getSortedActiveBooks();
}

function getVisibleBooks() {
  return viewerFilters.filterBooksBySearch(
    getSortedActiveBooks(),
    getSearchFilter(),
  );
}
