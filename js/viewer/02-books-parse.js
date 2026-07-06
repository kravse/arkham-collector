/* Book list helpers and CSV / title parsing */

books.forEach((book) => {
  if (book.hidden === undefined) {
    book.hidden = false;
  }
  prepareBookSearchIndex(book);
});

function prepareBookSearchIndex(book) {
  viewerFilters.prepareBookSearchIndex(book);
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
  return `${Math.floor(value / 10) * 10}s`;
}

function isMagazineIssue(book) {
  return viewerFilters.isMagazineIssue(book);
}

function passesHiddenVisibility(book) {
  return viewerFilters.passesHiddenVisibility(book, { hiddenOnly });
}

function hasVisibleMagazineIssues() {
  return getActiveBooks().some(
    (book) => isMagazineIssue(book) && !book.hidden,
  );
}

function isMycroftOnlyFilter() {
  return mycroftFilterMode === "only";
}

function isMycroftHiddenFilter() {
  return mycroftFilterMode === "hidden";
}

function passesMycroftImprintFilter(book) {
  return viewerFilters.passesMycroftImprintFilter(book, mycroftFilterMode);
}

function cycleMycroftFilter() {
  mycroftFilterMode = viewerFilters.cycleMycroftFilter(mycroftFilterMode);
}

function hasAnyOrderedBooks() {
  return viewerFilters.hasAnyOrderedBooks(
    getActiveBooks(),
    activeCollectionIds(),
    orderedIds,
    {
      hiddenOnly,
      showMagazines,
    },
  );
}

function isCollectionFilterActive() {
  return collectionFilterMode != null;
}

function isCollectionAllFilter() {
  return collectionFilterMode === "collection";
}

function isOrderedFilterActive() {
  return collectionFilterMode === "ordered";
}

function passesCollectionFilter(book) {
  return viewerFilters.passesCollectionFilter(
    book,
    collectionFilterMode,
    activeCollectionIds(),
    orderedIds,
  );
}

function cycleWantFilter() {
  wantFilterMode = viewerWantView.cycleWantFilter(
    wantFilterMode,
    hasAnyWants(),
  );
}

function hasAnyWants() {
  return viewerFilters.hasAnyWants(getActiveBooks(), wantIds, {
    hiddenOnly,
    showMagazines,
  });
}

function cycleCollectionFilter() {
  collectionFilterMode = viewerFilters.cycleCollectionFilter(
    collectionFilterMode,
    hasAnyOrderedBooks(),
  );
}

function passesBookVisibility(book) {
  return viewerFilters.passesBookVisibility(book, {
    hiddenOnly,
    showMagazines,
  });
}

function isCollected(book) {
  return viewerFilters.isCollected(book, activeCollectionIds());
}

function isOrdered(book) {
  return viewerFilters.isOrdered(book, activeCollectionIds(), orderedIds);
}

function getCollectionItem(book) {
  if (isCollected(book)) {
    return { status: "shelf" };
  }
  if (isOrdered(book)) {
    return { status: "order" };
  }
  return null;
}

function isInCollection(book) {
  return viewerFilters.isInCollection(
    book,
    activeCollectionIds(),
    orderedIds,
  );
}

function exportableCollectionIds() {
  const ids = new Set(activeCollectionIds());
  for (const id of orderedIds) {
    ids.add(id);
  }
  return ids;
}
