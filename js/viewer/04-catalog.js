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
    searchFilter: viewerFilters.emptySearchFilter(),
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
