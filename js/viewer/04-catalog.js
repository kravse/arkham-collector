/* Sort, search, filters, and visible book list */

function onSortChange() {
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
  const haystack = [
    book.title,
    book.author,
    book.coverArtist,
    book.publicationDate,
    book.decade,
    book.listAuthor,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function getStatTotal(all) {
  const showHidden = showHiddenInput.checked;
  if (collectionOnly) {
    return all.filter(
      (book) =>
        !isDeleted(book) &&
        (showHidden || !book.hidden) &&
        isInCollection(book),
    ).length;
  }
  return all.filter((book) => showHidden || !book.hidden).length;
}

function renderStats(visible, all) {
  const activeBooks = all.filter((book) => !isDeleted(book));
  const hiddenCount = activeBooks.filter((book) => book.hidden).length;
  const showHidden = showHiddenInput.checked;
  const query = searchInput.value.trim();
  const total = getStatTotal(activeBooks);
  const coveredRows = countCollectionRowsCovered(activeBooks, showHidden);
  const showingCount =
    collectionOnly && !query ? coveredRows : visible.length;
  const hasMycroft = activeBooks.some(
    (book) => book.imprint === "mycroft_moran",
  );
  const wantCount = getWantCount();
  const wantLabel = wantCount ? `WANT (${wantCount})` : "WANT";
  const collectionCount = getCollectionCount();
  const collectionLabel = collectionCount
    ? `COLLECTION (${collectionCount})`
    : "COLLECTION";
  const filters = [
    `<button type="button" class="stat owned-stat stat-toggle${collectionOnly ? " active" : ""}" id="collection-filter-toggle" aria-pressed="${collectionOnly}">${collectionLabel}</button>`,
    hasMycroft
      ? `<button type="button" class="stat mycroft-stat stat-toggle${mycroftOnly ? " active" : ""}" id="mycroft-filter-toggle" aria-pressed="${mycroftOnly}">MYCROFT &amp; MORAN</button>`
      : "",
    `<button type="button" class="stat want-stat stat-toggle${wantOnly ? " active" : ""}" id="want-filter-toggle" aria-pressed="${wantOnly}">${wantLabel}</button>`,
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
  return sortBooks(getActiveBooks(), sortSelect.value)
    .filter((book) =>
      hiddenOnly ? book.hidden : showHidden || !book.hidden,
    )
    .filter((book) => !mycroftOnly || book.imprint === "mycroft_moran")
    .filter((book) => !collectionOnly || isInCollection(book))
    .filter((book) => !wantOnly || isWanted(book))
    .filter((book) => matchesSearch(book, query));
}
