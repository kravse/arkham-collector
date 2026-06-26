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

function jiggleWantOrderLock() {
  if (wantOrderLockBtn) {
    wantOrderLockBtn.classList.remove("is-jiggling");
    void wantOrderLockBtn.offsetWidth;
    wantOrderLockBtn.classList.add("is-jiggling");
  }
  if (sortWantBadge) {
    sortWantBadge.classList.remove("is-locked-drag-denied");
    void sortWantBadge.offsetWidth;
    sortWantBadge.classList.add("is-locked-drag-denied");
  }
  clearTimeout(wantOrderLockJiggleTimer);
  wantOrderLockJiggleTimer = setTimeout(() => {
    if (wantOrderLockBtn) {
      wantOrderLockBtn.classList.remove("is-jiggling");
    }
    if (sortWantBadge) {
      sortWantBadge.classList.remove("is-locked-drag-denied");
    }
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
    const listHint =
      gridViewMode === "list" && !hasActiveSearch() && !wantOrderLocked
        ? " Drag rank tabs to reorder."
        : gridViewMode === "cards" && !hasActiveSearch() && !wantOrderLocked
          ? " Drag rank chips to reorder."
          : wantOrderLocked
            ? " Unlock to reorder."
            : "";
    sortWantBadge.setAttribute(
      "aria-label",
      `${wantOrderLocked ? "Want sorting locked" : "Want sorting unlocked"}.${listHint}`,
    );
  }
  if (wantOrderLockBtn) {
    wantOrderLockBtn.hidden = !wantSort;
    wantOrderLockBtn.setAttribute("aria-pressed", String(wantOrderLocked));
    const lockLabel = wantOrderLocked
      ? "Unlock want list order"
      : "Lock want list order";
    wantOrderLockBtn.setAttribute("aria-label", lockLabel);
    wantOrderLockBtn.title = lockLabel;
  }
  document.body.classList.toggle(
    "want-order-locked",
    wantSort && wantOrderLocked,
  );
  if (sortControlWrap) {
    sortControlWrap.classList.toggle("sort-control-want-order", wantSort);
  }
}

if (wantOrderLockBtn) {
  wantOrderLockBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    wantOrderLocked = !wantOrderLocked;
    saveUserState();
    updateSortControlState();
    render();
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
