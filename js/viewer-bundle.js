(function () {
  "use strict";

/* Configuration, DOM references, and mutable state */

const books = applyBookEdits(window.BOOKS || [], window.BOOK_EDITS || {});
const grid = document.getElementById("grid");
const stats = document.getElementById("stats");
const searchInput = document.getElementById("search");
const searchClearBtn = document.getElementById("search-clear");
const sortSelect = document.getElementById("sort");
const sortControlWrap = document.getElementById("sort-control-wrap");
const bookOrderBtn = document.getElementById("book-order-btn");
const bookOrderDialog = document.getElementById("book-order-dialog");
const bookOrderCloseBtn = document.getElementById("book-order-close");
const bookOrderCancelBtn = document.getElementById("book-order-cancel");
const bookOrderSaveBtn = document.getElementById("book-order-save");
const bookOrderList = document.getElementById("book-order-list");
const editDialog = document.getElementById("edit-dialog");
const editBookForm = document.getElementById("edit-book-form");
const editCancelBtn = document.getElementById("edit-cancel");
const editDeleteBtn = document.getElementById("edit-delete");
const editSaveBtn = document.getElementById("edit-save");
const editTitleInput = document.getElementById("edit-title");
const editAuthorInput = document.getElementById("edit-author");
const editCoverArtistInput = document.getElementById("edit-cover-artist");
const editPublicationDateInput = document.getElementById(
  "edit-publication-date",
);
const editWikipediaUrlInput =
  document.getElementById("edit-wikipedia-url");
const editGoodreadsUrlInput =
  document.getElementById("edit-goodreads-url");
const editDescriptionInput = document.getElementById("edit-description");
const editCoverFileInput = document.getElementById("edit-cover-file");
const bookDetailDialog = document.getElementById("book-detail-dialog");
const bookDetailCloseBtn = document.getElementById("book-detail-close");
const bookDetailPrevBtn = document.getElementById("book-detail-prev");
const bookDetailNextBtn = document.getElementById("book-detail-next");
const bookDetailCover = document.getElementById("book-detail-cover");
const bookDetailBody = document.getElementById("book-detail-body");
const bookDetailActions = document.getElementById("book-detail-actions");
const bookDetailScroll = document.getElementById("book-detail-scroll");
const bookDetailToolbarStart = document.getElementById(
  "book-detail-toolbar-start",
);
const bookDetailImprint = document.getElementById("book-detail-imprint");
const settingsBtn = document.getElementById("settings-btn");
const settingsDialog = document.getElementById("settings-dialog");
const settingsCloseBtn = document.getElementById("settings-close");
const collectionSourceSampleInput = document.getElementById(
  "collection-source-sample",
);
const collectionSourceOwnInput =
  document.getElementById("collection-source-own");
const exportCollectionBtn = document.getElementById("export-collection-btn");
const resetSampleCollectionBtn = document.getElementById(
  "reset-sample-collection-btn",
);
const resetSampleConfirmPanel = document.getElementById(
  "reset-sample-confirm",
);
const resetSampleCancelBtn = document.getElementById(
  "reset-sample-cancel-btn",
);
const resetSampleConfirmBtn = document.getElementById(
  "reset-sample-confirm-btn",
);
const settingsCollectionHintSample = document.getElementById(
  "settings-collection-hint-sample",
);
const settingsCollectionHintOwn = document.getElementById(
  "settings-collection-hint-own",
);
const highlightWantsInput = document.getElementById("highlight-wants");
const highlightCollectionInput = document.getElementById("highlight-collection");
const showMagazinesInput = document.getElementById("show-magazines");
const showMagazinesOption = document.getElementById("show-magazines-option");
const attributionBtn = document.getElementById("attribution-btn");
const attributionDialog = document.getElementById("attribution-dialog");
const attributionCloseBtn = document.getElementById("attribution-close");
const showHiddenWrap = document.getElementById("show-hidden-wrap");
const showHiddenInput = document.getElementById("show-hidden");
const pageSubtitle = document.getElementById("page-subtitle");
const pageTitle = document.getElementById("page-title");
const headerLogo = document.getElementById("header-logo");
const headerFiltersToggle = document.getElementById("header-filters-toggle");
const readOnly = window.READ_ONLY === true;
const LOGO_ARKHAM = "images/arkham-house.jpg";
const LOGO_MYCROFT = "images/Mycroft_moran.png";
const SORT_STORAGE_KEY = "arkham-sort";
const WANT_STORAGE_KEY = "arkham-want-list";
const COLLECTION_STORAGE_KEY = "arkham-collection";
const SAMPLE_COLLECTION_STORAGE_KEY = "arkham-sample-collection";
const COLLECTION_SOURCE_KEY = "arkham-collection-source";
const HEADER_FILTERS_STORAGE_KEY = "arkham-header-filters-expanded";
const HIGHLIGHT_WANTS_KEY = "arkham-highlight-wants";
const HIGHLIGHT_COLLECTION_KEY = "arkham-highlight-collection";
const SHOW_MAGAZINES_KEY = "arkham-show-magazines";
const SORT_MODES = new Set([
  "date-desc",
  "date-asc",
  "title-asc",
  "title-desc",
]);
let collection = [];
let serveEnabled = false;
let serveEditDeltas = false;
let editingBookId = null;
let collectionOnly = false;
let hiddenOnly = false;
let mycroftFilterMode = null;
let wantOnly = false;
let wantIds = new Set();
let ownCollectionIds = new Set();
let sampleCollectionIds = new Set();
let collectionSource = "sample";
let headerFiltersExpanded = true;
let highlightWants = true;
let highlightCollection = true;
let showMagazines = false;
let detailBookId = null;
let bookOrderIds = Array.isArray(window.BOOK_ORDER)
  ? window.BOOK_ORDER.map((id) => Number(id))
  : [];
let bookOrderIndex = new Map();
let workingBookOrder = [];
let bookOrderDirty = false;

function rebuildBookOrderIndex() {
  bookOrderIndex = new Map(bookOrderIds.map((id, index) => [id, index]));
}

function setBookOrderIds(next) {
  bookOrderIds = next.map((id) => Number(id));
  rebuildBookOrderIndex();
  invalidateSortedCache();
}

rebuildBookOrderIndex();

function updateSortControlVisibility() {
  if (sortControlWrap) {
    sortControlWrap.hidden = readOnly || serveEnabled;
  }
  if (bookOrderBtn) {
    bookOrderBtn.hidden = !serveEnabled;
  }
}

function useOwnCollection() {
  return collectionSource === "own";
}

function activeCollectionIds() {
  return useOwnCollection() ? ownCollectionIds : sampleCollectionIds;
}

function defaultCollectionSource() {
  const fromBuild = window.DEFAULT_COLLECTION_SOURCE;
  if (fromBuild === "own" || fromBuild === "sample") {
    return fromBuild;
  }
  return readOnly ? "own" : "sample";
}

function restoreCollectionSourcePreference() {
  try {
    const saved = localStorage.getItem(COLLECTION_SOURCE_KEY);
    if (saved === "sample" || saved === "own") {
      collectionSource = saved;
      return;
    }
  } catch (_) {
    // localStorage unavailable
  }
  collectionSource = defaultCollectionSource();
}

function saveCollectionSourcePreference() {
  try {
    localStorage.setItem(COLLECTION_SOURCE_KEY, collectionSource);
  } catch (_) {
    // localStorage unavailable
  }
}

function syncSettingsCollectionHint() {
  const inConfirm =
    resetSampleConfirmPanel && !resetSampleConfirmPanel.hidden;
  const showSampleHint =
    !inConfirm &&
    collectionSource === "sample" &&
    resetSampleCollectionBtn &&
    !resetSampleCollectionBtn.hidden;

  if (settingsCollectionHintSample) {
    settingsCollectionHintSample.hidden = !showSampleHint;
  }
  if (settingsCollectionHintOwn) {
    settingsCollectionHintOwn.hidden = showSampleHint;
  }
}

function restoreHighlightPreferences() {
  try {
    const savedWants = localStorage.getItem(HIGHLIGHT_WANTS_KEY);
    if (savedWants === "0") {
      highlightWants = false;
    } else if (savedWants === "1") {
      highlightWants = true;
    }

    const savedCollection = localStorage.getItem(HIGHLIGHT_COLLECTION_KEY);
    if (savedCollection === "0") {
      highlightCollection = false;
    } else if (savedCollection === "1") {
      highlightCollection = true;
    }
  } catch (_) {
    // localStorage unavailable
  }
}

function saveHighlightWantsPreference() {
  try {
    localStorage.setItem(HIGHLIGHT_WANTS_KEY, highlightWants ? "1" : "0");
  } catch (_) {
    // localStorage unavailable
  }
}

function saveHighlightCollectionPreference() {
  try {
    localStorage.setItem(
      HIGHLIGHT_COLLECTION_KEY,
      highlightCollection ? "1" : "0",
    );
  } catch (_) {
    // localStorage unavailable
  }
}

function restoreShowMagazinesPreference() {
  try {
    const saved = localStorage.getItem(SHOW_MAGAZINES_KEY);
    if (saved === "0") {
      showMagazines = false;
    } else if (saved === "1") {
      showMagazines = true;
    }
  } catch (_) {
    // localStorage unavailable
  }
}

function saveShowMagazinesPreference() {
  try {
    localStorage.setItem(SHOW_MAGAZINES_KEY, showMagazines ? "1" : "0");
  } catch (_) {
    // localStorage unavailable
  }
}

function syncSettingsHighlightCheckboxes() {
  if (highlightWantsInput) {
    highlightWantsInput.checked = highlightWants;
  }
  if (highlightCollectionInput) {
    highlightCollectionInput.checked = highlightCollection;
  }
  if (showMagazinesInput) {
    showMagazinesInput.checked = showMagazines;
  }
  if (showMagazinesOption) {
    showMagazinesOption.hidden = !hasVisibleMagazineIssues();
  }
}

function shouldHighlightWantsOnCards() {
  return highlightWants || wantOnly;
}

function shouldHighlightCollectionOnCards() {
  return highlightCollection || collectionOnly;
}

function syncSettingsCollectionRadios() {
  if (collectionSourceSampleInput) {
    collectionSourceSampleInput.checked = collectionSource === "sample";
  }
  if (collectionSourceOwnInput) {
    collectionSourceOwnInput.checked = collectionSource === "own";
  }
  if (resetSampleCollectionBtn) {
    resetSampleCollectionBtn.hidden = collectionSource !== "sample";
  }
  hideResetSampleConfirm();
  syncSettingsCollectionHint();
  syncSettingsHighlightCheckboxes();
}

function showResetSampleConfirm() {
  if (!resetSampleConfirmPanel || !resetSampleCollectionBtn) {
    return;
  }
  resetSampleCollectionBtn.hidden = true;
  resetSampleConfirmPanel.hidden = false;
  syncSettingsCollectionHint();
}

function hideResetSampleConfirm() {
  if (resetSampleConfirmPanel) {
    resetSampleConfirmPanel.hidden = true;
  }
  if (resetSampleCollectionBtn && collectionSource === "sample") {
    resetSampleCollectionBtn.hidden = false;
  }
  syncSettingsCollectionHint();
}


/* Book list helpers and CSV / title parsing */

books.forEach((book) => {
  if (book.hidden === undefined) {
    book.hidden = false;
  }
  prepareBookSearchIndex(book);
});

function prepareBookSearchIndex(book) {
  book._searchHaystack = [
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

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^the\s+/, "");
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
  if (value < 1940) {
    return String(value);
  }
  return `${Math.floor(value / 10) * 10}s`;
}

const SAMPLER_ISSUE_TITLE_RE = /^The Arkham Sampler \(Vol\. [IV]+, No\. \d+\)$/;
const COLLECTOR_ISSUE_TITLE_RE = /^The Arkham Collector \(No\. \d+\)$/;

function isMagazineIssue(book) {
  const listTitle = String(book?.listTitle || "").trim();
  const title = String(book?.title || "").trim();

  if (listTitle === "The Arkham Sampler") {
    return SAMPLER_ISSUE_TITLE_RE.test(title);
  }
  if (listTitle === "The Arkham Collector") {
    return COLLECTOR_ISSUE_TITLE_RE.test(title);
  }
  return false;
}

function passesHiddenVisibility(book) {
  const showHidden = showHiddenInput.checked;
  return hiddenOnly ? book.hidden : showHidden || !book.hidden;
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
  if (mycroftFilterMode === "only") {
    return book.imprint === "mycroft_moran";
  }
  if (mycroftFilterMode === "hidden") {
    return book.imprint !== "mycroft_moran";
  }
  return true;
}

function cycleMycroftFilter() {
  if (mycroftFilterMode === null) {
    mycroftFilterMode = "only";
  } else if (mycroftFilterMode === "only") {
    mycroftFilterMode = "hidden";
  } else {
    mycroftFilterMode = null;
  }
}

function passesBookVisibility(book) {
  if (!passesHiddenVisibility(book)) {
    return false;
  }
  if (isMagazineIssue(book) && !showMagazines) {
    return false;
  }
  return true;
}

function parseCollection(csvText) {
  return csvText
    .trim()
    .split(/\r?\n/)
    .map(parseCsvLine)
    .filter((cols) => cols.length >= 3)
    .map((cols) => ({
      title: cols[0].trim(),
      author: cols[1]?.trim() || "",
      year: parseYear(cols[2]),
      status: cols[3]?.trim() || "",
    }))
    .filter((item) => {
      if (!item.title || !item.year) return false;
      if (item.title.toUpperCase() === "ARKHAM HOUSE") return false;
      if (/^\d+ on order/i.test(item.title)) return false;
      return true;
    });
}

function titlesMatch(bookTitle, collectionTitle) {
  const book = normalizeTitle(bookTitle);
  const owned = normalizeTitle(collectionTitle);
  if (!book || !owned) return false;
  if (book === owned) return true;
  if (book.includes(owned) || owned.includes(book)) return true;
  return false;
}

function collectionItemsMatchingBook(book) {
  const bookYear = parseYear(book.publicationDate);
  const candidates = [book.title, book.listTitle].filter(Boolean);
  return collection.filter((item) => {
    if (!candidates.some((candidate) => titlesMatch(candidate, item.title))) {
      return false;
    }
    if (item.year && bookYear) {
      return item.year === bookYear;
    }
    return true;
  });
}

function findCollectionMatch(book) {
  const matches = collectionItemsMatchingBook(book);
  if (!matches.length) {
    return null;
  }

  const bookYear = parseYear(book.publicationDate);
  if (bookYear) {
    const exact = matches.find((item) => item.year === bookYear);
    if (exact) {
      return exact;
    }
  }

  if (matches.length === 1) {
    return matches[0];
  }

  return null;
}

function getCollectionItem(book) {
  return activeCollectionIds().has(book.id) ? { status: "shelf" } : null;
}

function isInCollection(book) {
  return getCollectionItem(book) != null;
}

function bookCoversCollectionItem(book, item) {
  const bookYear = parseYear(book.publicationDate);
  const candidates = [book.title, book.listTitle].filter(Boolean);
  if (!candidates.some((candidate) => titlesMatch(candidate, item.title))) {
    return false;
  }
  if (item.year && bookYear && item.year === bookYear) {
    return true;
  }
  const titleRows = collection.filter((row) =>
    candidates.some((candidate) => titlesMatch(candidate, row.title)),
  );
  return titleRows.length === 1;
}

function countCollectionRowsCovered(books, includeHidden) {
  const eligible = books.filter(
    (book) => !isDeleted(book) && (includeHidden || !book.hidden),
  );
  return eligible.filter((book) => activeCollectionIds().has(book.id))
    .length;
}


/* Sample and own collection, want list, localStorage */

const DEFAULT_COLLECTION_CSV = "my_collection/my_collection.csv";

async function loadCollectionCsvItems(options = {}) {
  const forceCsv = options.forceCsv === true;
  const csvPath = window.SAMPLE_COLLECTION_CSV || DEFAULT_COLLECTION_CSV;

  if (!forceCsv && readOnly && window.MY_COLLECTION?.length) {
    return window.MY_COLLECTION;
  }

  try {
    const response = await fetch(csvPath);
    if (response.ok) {
      return parseCollection(await response.text());
    }
  } catch (_) {
    // fetch fails on file://; fall back to collection.js
  }

  return window.MY_COLLECTION || [];
}

async function buildSampleIdsFromCsv(options = {}) {
  const items = await loadCollectionCsvItems(options);
  const savedRows = collection;
  collection = items;
  const ids = new Set();
  for (const book of getActiveBooks()) {
    if (findCollectionMatch(book)) {
      ids.add(book.id);
    }
  }
  collection = savedRows;
  return ids;
}

async function ensureSampleCollectionIds() {
  try {
    const saved = localStorage.getItem(SAMPLE_COLLECTION_STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        sampleCollectionIds = new Set(
          parsed
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id)),
        );
        return;
      }
    }
  } catch (_) {
    // localStorage unavailable or invalid JSON
  }

  sampleCollectionIds = await buildSampleIdsFromCsv();
  saveSampleCollectionIds();
}

function restoreSortPreference() {
  try {
    const saved = localStorage.getItem(SORT_STORAGE_KEY);
    const legacy = { default: "date-asc", title: "title-asc" };
    const mode =
      saved && SORT_MODES.has(saved)
        ? saved
        : saved && legacy[saved]
          ? legacy[saved]
          : null;
    if (mode) {
      sortSelect.value = mode;
    }
  } catch (_) {
    // localStorage unavailable
  }
}

function saveSortPreference() {
  try {
    localStorage.setItem(SORT_STORAGE_KEY, sortSelect.value);
  } catch (_) {
    // localStorage unavailable
  }
}

function loadHeaderFiltersPreference() {
  try {
    const saved = localStorage.getItem(HEADER_FILTERS_STORAGE_KEY);
    if (saved === "0") {
      headerFiltersExpanded = false;
    }
  } catch (_) {
    // localStorage unavailable
  }
}

function saveHeaderFiltersPreference() {
  try {
    localStorage.setItem(
      HEADER_FILTERS_STORAGE_KEY,
      headerFiltersExpanded ? "1" : "0",
    );
  } catch (_) {
    // localStorage unavailable
  }
}

function updateHeaderFiltersState() {
  document.body.classList.toggle(
    "header-filters-collapsed",
    !headerFiltersExpanded,
  );
  if (!headerFiltersToggle) {
    return;
  }
  headerFiltersToggle.setAttribute(
    "aria-expanded",
    String(headerFiltersExpanded),
  );
  headerFiltersToggle.setAttribute(
    "aria-label",
    headerFiltersExpanded
      ? "Hide filters and sort"
      : "Show filters and sort",
  );
}

function loadWantList() {
  try {
    const saved = localStorage.getItem(WANT_STORAGE_KEY);
    if (!saved) {
      wantIds = new Set();
      return;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      wantIds = new Set();
      return;
    }
    wantIds = new Set(
      parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id)),
    );
  } catch (_) {
    wantIds = new Set();
  }
}

function saveWantList() {
  try {
    localStorage.setItem(
      WANT_STORAGE_KEY,
      JSON.stringify([...wantIds].sort((a, b) => a - b)),
    );
  } catch (_) {
    // localStorage unavailable
  }
}

function loadOwnCollectionIds() {
  try {
    const saved = localStorage.getItem(COLLECTION_STORAGE_KEY);
    if (!saved) {
      ownCollectionIds = new Set();
      return;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      ownCollectionIds = new Set();
      return;
    }
    ownCollectionIds = new Set(
      parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id)),
    );
  } catch (_) {
    ownCollectionIds = new Set();
  }
}

function saveOwnCollectionIds() {
  try {
    localStorage.setItem(
      COLLECTION_STORAGE_KEY,
      JSON.stringify([...ownCollectionIds].sort((a, b) => a - b)),
    );
  } catch (_) {
    // localStorage unavailable
  }
}

function saveSampleCollectionIds() {
  try {
    localStorage.setItem(
      SAMPLE_COLLECTION_STORAGE_KEY,
      JSON.stringify([...sampleCollectionIds].sort((a, b) => a - b)),
    );
  } catch (_) {
    // localStorage unavailable
  }
}

function saveActiveCollectionIds() {
  if (useOwnCollection()) {
    saveOwnCollectionIds();
  } else {
    saveSampleCollectionIds();
  }
}

function isWanted(book) {
  return wantIds.has(book.id);
}

function toggleWant(bookId) {
  const id = Number(bookId);
  if (!Number.isFinite(id)) {
    return;
  }
  if (wantIds.has(id)) {
    wantIds.delete(id);
  } else {
    wantIds.add(id);
    if (activeCollectionIds().has(id)) {
      activeCollectionIds().delete(id);
      saveActiveCollectionIds();
    }
  }
  saveWantList();
  render();
  if (!bookDetailDialog.hidden) {
    openBookDetail(detailBookId);
  }
}

function toggleCollection(bookId) {
  const id = Number(bookId);
  if (!Number.isFinite(id)) {
    return;
  }
  const ids = activeCollectionIds();
  if (ids.has(id)) {
    ids.delete(id);
  } else {
    ids.add(id);
    wantIds.delete(id);
    saveWantList();
  }
  saveActiveCollectionIds();
  render();
  if (!bookDetailDialog.hidden) {
    openBookDetail(detailBookId);
  }
}

function getWantCount() {
  return getActiveBooks().filter(
    (book) => passesBookVisibility(book) && isWanted(book),
  ).length;
}

function getCollectionCount() {
  return getActiveBooks().filter(
    (book) => passesBookVisibility(book) && isInCollection(book),
  ).length;
}


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
  const filters = [
    `<button type="button" class="stat owned-stat stat-toggle${collectionOnly ? " active" : ""}" id="collection-filter-toggle" aria-pressed="${collectionOnly}">COLLECTION</button>`,
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
    .filter((book) => !collectionOnly || isInCollection(book))
    .filter((book) => !wantOnly || isWanted(book))
    .filter((book) => matchesSearch(book, query));
}


/* Covers, cards, stats, and main grid render */

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^the\s+/, "");
}

function wikiTitleFromUrl(url) {
  if (!url) return null;
  const match = url.match(/\/wiki\/([^#?]+)/);
  return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : null;
}

function getCoverSources(book) {
  if (book.coverEditPath) {
    return [book.coverEditPath];
  }

  const sources = [];
  if (book.coverImageFile) {
    sources.push(book.coverImageFile);
  }

  const slugBase = slugify(
    wikiTitleFromUrl(book.wikipediaUrl) || book.listTitle || book.title,
  );
  if (slugBase && book.id) {
    ["jpg", "jpeg", "png", "webp", "gif"].forEach((ext) => {
      sources.push(`covers/${slugBase}-${book.id}.${ext}`);
    });
  }

  if (book.coverImageUrl) {
    sources.push(book.coverImageUrl);
  }

  return [...new Set(sources)];
}

function renderCover(book, cacheKey) {
  const sources = getCoverSources(book);
  if (!sources.length) {
    return `<div class="placeholder">No cover image</div>`;
  }

  const primary = cacheKey
    ? `${sources[0]}?v=${encodeURIComponent(cacheKey)}`
    : sources[0];
  const fallback = sources.slice(1).join("|");
  return `<img src="${primary}" alt="Cover of ${book.title}" loading="lazy" data-fallbacks="${fallback}" onerror="tryCoverFallback(this)">`;
}

const editIcon = `
<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
  <path d="M12.1 3.9 16.1 7.9 7.4 16.6 3.4 12.6 12.1 3.9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M10.8 5.2 14.8 9.2" stroke="currentColor" stroke-width="1.5"/>
</svg>
    `;

function isViewingOnDevServer() {
  return !readOnly && window.location.protocol !== "file:";
}

function renderEditButton(book, className = "edit-book-btn") {
  if (!serveEnabled) {
    return "";
  }

  return `
  <button
    type="button"
    class="${className} edit-book-btn"
    data-book-id="${book.id}"
    aria-label="Edit ${book.title || "this book"}"
    title="Edit book"
  >${editIcon}</button>
`;
}

function renderDetailEditButton(book) {
  if (!isViewingOnDevServer()) {
    return "";
  }

  const title = serveEnabled
    ? "Edit book"
    : "Edit book (waiting for server…)";

  return `
  <button
    type="button"
    class="book-detail-edit-btn"
    data-book-id="${book.id}"
    aria-label="Edit ${book.title || "this book"}"
    title="${title}"
    ${serveEnabled ? "" : "disabled"}
  >${editIcon}</button>
`;
}

function refreshDetailToolbar(book) {
  if (!book) {
    return;
  }

  if (bookDetailImprint) {
    bookDetailImprint.innerHTML = renderImprintBadge(book, "detail");
  }

  if (bookDetailToolbarStart) {
    bookDetailToolbarStart
      .querySelectorAll(".book-detail-edit-btn")
      .forEach((element) => element.remove());
    const editBtn = renderDetailEditButton(book);
    if (editBtn) {
      bookDetailToolbarStart.insertAdjacentHTML("beforeend", editBtn);
    }
  }
}

function refreshDetailToolbarIfOpen() {
  if (bookDetailDialog.hidden || !detailBookId) {
    return;
  }

  const book = books.find((entry) => entry.id === detailBookId);
  refreshDetailToolbar(book);
}

const hideIcon = `
<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
  <path d="M3.5 10s2.2-4.5 6.5-4.5S16.5 10 16.5 10s-2.2 4.5-6.5 4.5S3.5 10 3.5 10Z" stroke="currentColor" stroke-width="1.5"/>
  <circle cx="10" cy="10" r="1.75" stroke="currentColor" stroke-width="1.5"/>
  <path d="M4 4 16 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>
    `;

function renderWikiButton(url, className = "card-wiki-btn") {
  if (!url) {
    return "";
  }

  return `
  <a
    class="${className}"
    href="${url}"
    target="_blank"
    rel="noopener"
    aria-label="Open on Wikipedia"
    title="Wikipedia"
  >W</a>
`;
}

function getAuthorLastName(book) {
  const author = getDisplayAuthor(book);
  if (!author) {
    return null;
  }
  const suffixes = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv"]);
  const parts = author.trim().split(/\s+/);
  while (parts.length > 1 && suffixes.has(parts[parts.length - 1].toLowerCase())) {
    parts.pop();
  }
  return parts.length
    ? parts[parts.length - 1].replace(/[,.]+$/, "")
    : null;
}

function getGoodreadsSearchUrl(book) {
  const query = [(book.title || book.listTitle || "").trim(), getAuthorLastName(book)]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!query) {
    return null;
  }
  const params = new URLSearchParams({
    utf8: "✓",
    q: query,
    search_type: "books",
  });
  return `https://www.goodreads.com/search?${params}`;
}

function getGoodreadsLinkForBook(book) {
  const savedUrl = resolveGoodreadsUrl(book);
  if (savedUrl) {
    return { url: savedUrl, search: false };
  }
  const searchUrl = getGoodreadsSearchUrl(book);
  if (!searchUrl) {
    return null;
  }
  return { url: searchUrl, search: true };
}

function renderGoodreadsButton(link, className = "card-goodreads-btn") {
  if (!link?.url) {
    return "";
  }

  const searchClass = link.search ? ` ${className}--search` : "";
  const label = link.search ? "Search on Goodreads" : "Open on Goodreads";
  const title = link.search ? "Search Goodreads" : "Goodreads";

  return `
  <a
    class="${className}${searchClass}"
    href="${link.url}"
    target="_blank"
    rel="noopener"
    aria-label="${label}"
    title="${title}"
  >G</a>
`;
}

function getDisplayAuthor(book) {
  if (book.author) {
    return book.author;
  }

  const line = (book.listAuthor || "").trim();
  if (!line) {
    return null;
  }

  const withoutYear = line.replace(/\s*\(\d{4}\)\s*$/, "").trim();
  const editedMatch = withoutYear.match(/edited by\s+(.+)$/i);
  if (editedMatch) {
    return editedMatch[1].trim();
  }

  const byMatch = withoutYear.match(/(?:^|,\s*)by\s+(.+)$/i);
  if (byMatch) {
    return byMatch[1].split(/\s+vol\.\s+/i)[0].trim() || null;
  }

  return null;
}

function renderBookMetaHtml(book) {
  const author = getDisplayAuthor(book);
  const lines = [];

  if (author) {
    lines.push(`<p class="meta"><strong>Author:</strong> ${author}</p>`);
  }

  if (book.coverArtist) {
    lines.push(`<p class="meta"><strong>Cover:</strong> ${book.coverArtist}</p>`);
  }

  if (book.imprint === "mycroft_moran") {
    lines.push(`<p class="meta"><strong>Imprint:</strong> Mycroft &amp; Moran</p>`);
  }

  return lines.join("");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBookDescriptionHtml(book) {
  const description = getBookDescription(book);
  if (!description?.trim()) {
    return "";
  }
  return `<div class="book-detail-description">${escapeHtml(description)}</div>`;
}

const unhideIcon = `
<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
  <path d="M3.5 10s2.2-4.5 6.5-4.5S16.5 10 16.5 10s-2.2 4.5-6.5 4.5S3.5 10 3.5 10Z" stroke="currentColor" stroke-width="1.5"/>
  <circle cx="10" cy="10" r="1.75" stroke="currentColor" stroke-width="1.5"/>
</svg>
    `;

function renderHideButton(book) {
  if (!serveEnabled) {
    return "";
  }

  const isHidden = Boolean(book.hidden);
  return `
  <button
    type="button"
    class="hide-book-btn"
    data-book-id="${book.id}"
    data-hidden="${isHidden ? "true" : "false"}"
    aria-label="${isHidden ? "Unhide" : "Hide"} ${book.title || "this book"}"
    title="${isHidden ? "Unhide book" : "Hide book"}"
  >${isHidden ? unhideIcon : hideIcon}</button>
`;
}

function renderImprintBadge(book, placement = "cover") {
  const isMycroft = book.imprint === "mycroft_moran";
  const label = isMycroft ? "MM" : "AH";
  const title = isMycroft ? "Mycroft & Moran" : "Arkham House";
  const imprintClass = isMycroft ? "imprint-badge--mm" : "imprint-badge--ah";

  return `<span class="imprint-badge imprint-badge--${placement} ${imprintClass}" title="${title}" aria-label="${title}">${label}</span>`;
}

function renderCardWantBadge(book) {
  if (isInCollection(book) || !isWanted(book)) {
    return "";
  }

  return `<span class="want-btn active want-badge">Wanted</span>`;
}

function renderCollectionButton(book) {
  const collected = isInCollection(book);
  const label = collected ? "Collection" : "Collect";
  const className = `collection-btn${collected ? " active" : ""}`;

  return `
  <button
    type="button"
    class="${className}"
    data-book-id="${book.id}"
    aria-pressed="${collected}"
  >${label}</button>
`;
}

function renderOwnedBadge(book) {
  const owned = getCollectionItem(book);
  if (!owned) {
    return "";
  }

  return `<span class="owned-badge">${owned.status === "order" ? "On order" : "Collection"}</span>`;
}

function renderWantButton(book) {
  if (isInCollection(book)) {
    return "";
  }

  const wanted = isWanted(book);
  const label = wanted ? "Wanted" : "Want";
  const className = `want-btn${wanted ? " active" : ""}`;

  return `
  <button
    type="button"
    class="${className}"
    data-book-id="${book.id}"
    aria-pressed="${wanted}"
  >${label}</button>
`;
}

function renderCardBottomRow(
  imprintBadge,
  wantBadge,
  linkButtons,
  ownedBadge,
) {
  const left = [imprintBadge, linkButtons].filter(Boolean).join("");
  const right = [wantBadge, ownedBadge].filter(Boolean).join("");

  return `
  <div class="card-bottom-row">
    <div class="card-bottom-left">${left}</div>
    <div class="card-bottom-right">${right}</div>
  </div>
`;
}

function renderCoverActions(book) {
  return `${renderHideButton(book)}${renderEditButton(book)}`;
}

function resolveGoodreadsUrl(book) {
  const key = String(book.id);
  const edit = window.BOOK_EDITS?.[key];
  if (
    edit != null &&
    Object.prototype.hasOwnProperty.call(edit, "goodreadsUrl")
  ) {
    const fromEdit = (edit.goodreadsUrl || "").trim();
    return fromEdit || null;
  }
  const scraped = (window.BOOKS || []).find((entry) => entry.id === book.id);
  const fromData = (scraped?.goodreadsUrl || "").trim();
  return fromData || null;
}

window.tryCoverFallback = function (img) {
  const remaining = img.dataset.fallbacks
    ? img.dataset.fallbacks.split("|").filter(Boolean)
    : [];
  if (!remaining.length) {
    img.replaceWith(
      Object.assign(document.createElement("div"), {
        className: "placeholder",
        textContent: "No cover image",
      }),
    );
    return;
  }

  img.dataset.fallbacks = remaining.slice(1).join("|");
  img.src = remaining[0];
};

function renderCard(book) {
  const inCollection = isInCollection(book);
  const ownedClass =
    inCollection && shouldHighlightCollectionOnCards() ? " owned" : "";
  const hiddenClass = book.hidden ? " hidden-book" : "";
  const imageHtml = renderCover(book, book.coverCacheKey);
  const coverActions = renderCoverActions(book);

  const imprintBadge = renderImprintBadge(book, "card");
  const wantBadge = renderCardWantBadge(book);
  const ownedBadge = renderOwnedBadge(book);
  const bottomRow = renderCardBottomRow(
    imprintBadge,
    wantBadge,
    "",
    ownedBadge,
  );

  const hiddenBadge = book.hidden
    ? `<span class="hidden-badge">Hidden</span>`
    : "";

  const wantedClass =
    isWanted(book) && shouldHighlightWantsOnCards() ? " wanted" : "";

  return `
  <article class="card${ownedClass}${wantedClass}${hiddenClass}" data-book-id="${book.id}">
    <div class="cover-wrap">
      ${coverActions}
      ${imageHtml}
    </div>
    <div class="card-body">
      ${hiddenBadge}
      <h2 class="title">${book.title || "Untitled"}</h2>
      ${book.publicationDate ? `<div class="date">${book.publicationDate}</div>` : ""}
      ${renderBookMetaHtml(book)}
      ${bottomRow}
    </div>
  </article>
`;
}

function updateHeaderLogo() {
  if (headerLogo) {
    headerLogo.src = isMycroftOnlyFilter() ? LOGO_MYCROFT : LOGO_ARKHAM;
  }
  const title = isMycroftOnlyFilter() ? "Mycroft & Moran" : "Arkham House";
  if (pageTitle) {
    pageTitle.textContent = title;
  }
  document.title = title;
}

function render() {
  const activeBooks = getActiveBooks();
  const visible = getVisibleBooks();

  if (!bookDetailDialog.hidden && detailBookId) {
    const detailBook = books.find((entry) => entry.id === detailBookId);
    if (detailBook && !passesMycroftImprintFilter(detailBook)) {
      closeBookDetail();
    }
  }

  updateHeaderLogo();
  document.body.classList.toggle(
    "viewing-collection",
    collectionOnly && !hiddenOnly && !isMycroftOnlyFilter() && !wantOnly,
  );
  document.body.classList.toggle(
    "viewing-hidden",
    hiddenOnly && !collectionOnly && !isMycroftOnlyFilter() && !wantOnly,
  );
  document.body.classList.toggle(
    "viewing-want",
    wantOnly && !collectionOnly && !hiddenOnly && !isMycroftOnlyFilter(),
  );
  document.body.classList.toggle("viewing-mycroft-hidden", isMycroftHiddenFilter());
  if (pageSubtitle) {
    if (collectionOnly && hiddenOnly) {
      pageSubtitle.textContent =
        "Viewing hidden books in your collection — click a stat again to show all books";
    } else if (collectionOnly) {
      pageSubtitle.textContent =
        "Viewing your collection — click the stat again to show all books";
    } else if (hiddenOnly) {
      pageSubtitle.textContent =
        "Viewing hidden books — click the stat again to show all books";
    } else if (isMycroftOnlyFilter()) {
      pageSubtitle.textContent =
        "An imprint for weird detective fiction—founded in 1945 to house August Derleth's Solar Pons.";
    } else if (isMycroftHiddenFilter()) {
      pageSubtitle.textContent =
        "Mycroft & Moran titles hidden — click the stat again to show all books";
    } else if (wantOnly) {
      pageSubtitle.textContent =
        "Viewing your want list — click the stat again to show all books";
    } else {
      pageSubtitle.textContent =
        "A publishing house of horror and weird fiction—founded in 1939 to rescue Lovecraft from the pulps.";
    }
  }

  renderStats(visible, activeBooks);

  if (!visible.length) {
    let message = "No books match your search.";
    if (collectionOnly) {
      message = searchInput.value.trim()
        ? "No books in your collection match your search."
        : "Your collection is empty — open a book and tap Collect to add it.";
    } else if (hiddenOnly) {
      message = searchInput.value.trim()
        ? "No hidden books match your search."
        : "No hidden books to show.";
    } else if (isMycroftOnlyFilter()) {
      message = searchInput.value.trim()
        ? "No Mycroft & Moran books match your search."
        : "No Mycroft & Moran books to show.";
    } else if (wantOnly) {
      message = searchInput.value.trim()
        ? "No wanted books match your search."
        : "Your want list is empty — open a book and tap Want to add it.";
    }
    grid.innerHTML = `<div class="empty">${message}</div>`;
    if (!bookDetailDialog.hidden && detailBookId) {
      updateDetailNav();
    }
    syncSettingsHighlightCheckboxes();
    return;
  }

  grid.innerHTML = visible.map(renderCard).join("");

  if (!bookDetailDialog.hidden && detailBookId) {
    const detailBook = books.find((entry) => entry.id === detailBookId);
    refreshDetailToolbar(detailBook);
    updateDetailNav();
  }

  syncSettingsHighlightCheckboxes();
}


/* Book detail overlay, settings, and attribution dialogs */

function getDetailNavigation() {
  const visible = getVisibleBooks();
  const index = visible.findIndex((book) => book.id === detailBookId);
  return {
    index,
    prevId: index > 0 ? visible[index - 1].id : null,
    nextId:
      index >= 0 && index < visible.length - 1
        ? visible[index + 1].id
        : null,
  };
}

function updateDetailNav() {
  const book = books.find((entry) => entry.id === detailBookId);
  if (!book || isDeleted(book)) {
    closeBookDetail();
    return;
  }

  const { prevId, nextId } = getDetailNavigation();
  if (bookDetailPrevBtn) {
    bookDetailPrevBtn.hidden = !prevId;
  }
  if (bookDetailNextBtn) {
    bookDetailNextBtn.hidden = !nextId;
  }
}

function navigateDetail(direction) {
  const { prevId, nextId } = getDetailNavigation();
  const targetId = direction < 0 ? prevId : nextId;
  if (targetId) {
    openBookDetail(targetId);
  }
}

async function checkServeSupport() {
  if (readOnly) {
    serveEnabled = false;
    hiddenOnly = false;
    showHiddenWrap.hidden = true;
    updateSortControlVisibility();
    return;
  }

  try {
    const response = await fetch("/api/health");
    serveEnabled = response.ok;
    if (serveEnabled) {
      const payload = await response.json();
      serveEditDeltas = payload.editDeltas === true;
    } else {
      serveEditDeltas = false;
    }
  } catch (_) {
    serveEnabled = false;
    serveEditDeltas = false;
  }

  if (!serveEnabled) {
    hiddenOnly = false;
  }

  showHiddenWrap.hidden = !serveEnabled;
  updateSortControlVisibility();
  refreshDetailToolbarIfOpen();
}

function openBookDetail(bookId) {
  const book = books.find((entry) => entry.id === bookId);
  if (!book || isDeleted(book)) {
    return;
  }

  detailBookId = bookId;

  refreshDetailToolbar(book);

  bookDetailCover.innerHTML = renderCover(book, book.coverCacheKey);
  const hiddenBadge = book.hidden
    ? `<span class="hidden-badge">Hidden</span>`
    : "";
  const linkButtons = [
    renderWikiButton(book.wikipediaUrl, "book-detail-wiki-btn"),
    renderGoodreadsButton(
      getGoodreadsLinkForBook(book),
      "book-detail-goodreads-btn",
    ),
  ]
    .filter(Boolean)
    .join("");
  const wantButton = renderWantButton(book);
  const collectionControl = renderCollectionButton(book);
  const bottomRow = renderCardBottomRow(
    "",
    wantButton,
    linkButtons,
    collectionControl,
  );

  const metaHtml = renderBookMetaHtml(book);
  const description = getBookDescription(book);
  const descriptionHtml = description?.trim()
    ? `<div class="book-detail-description">${escapeHtml(description)}</div>`
    : `<div class="book-detail-description book-detail-description--empty" aria-hidden="true"></div>`;

  const detailDateHtml = book.publicationDate
    ? `<span class="date"> (${escapeHtml(book.publicationDate)})</span>`
    : "";
  bookDetailBody.innerHTML = `
  ${hiddenBadge}
  <h2 class="title" id="book-detail-title">${escapeHtml(book.title || "Untitled")}${detailDateHtml}</h2>
  <div class="book-detail-scroll-block">
    <div class="book-detail-meta">${metaHtml}</div>
    ${descriptionHtml}
  </div>
`;
  if (bookDetailActions) {
    bookDetailActions.innerHTML = bottomRow;
  }

  bookDetailDialog.hidden = false;
  document.body.classList.add("book-detail-open");
  if (bookDetailScroll) {
    bookDetailScroll.scrollTop = 0;
  }
  const detailScrollBlock = bookDetailBody.querySelector(
    ".book-detail-scroll-block",
  );
  if (detailScrollBlock) {
    detailScrollBlock.scrollTop = 0;
  }
  updateDetailNav();
}

function closeBookDetail() {
  detailBookId = null;
  bookDetailDialog.hidden = true;
  bookDetailCover.innerHTML = "";
  bookDetailBody.innerHTML = "";
  if (bookDetailImprint) {
    bookDetailImprint.innerHTML = "";
  }
  if (bookDetailToolbarStart) {
    bookDetailToolbarStart
      .querySelectorAll(".book-detail-edit-btn")
      .forEach((element) => element.remove());
  }
  if (bookDetailActions) {
    bookDetailActions.innerHTML = "";
  }
  if (bookDetailPrevBtn) {
    bookDetailPrevBtn.hidden = true;
  }
  if (bookDetailNextBtn) {
    bookDetailNextBtn.hidden = true;
  }
  document.body.classList.remove("book-detail-open");
}

function openEditDialog(bookId) {
  const book = books.find((entry) => entry.id === bookId);
  if (!book || isDeleted(book)) {
    return;
  }

  editingBookId = bookId;
  editTitleInput.value = book.title || "";
  editAuthorInput.value = book.author || "";
  editCoverArtistInput.value = book.coverArtist || "";
  editPublicationDateInput.value = book.publicationDate || "";
  editWikipediaUrlInput.value = book.wikipediaUrl || "";
  editGoodreadsUrlInput.value = resolveGoodreadsUrl(book) || "";
  editDescriptionInput.value = getBookDescription(book) || "";
  editCoverFileInput.value = "";
  editDialog.hidden = false;
  editTitleInput.focus();
}

function closeEditDialog() {
  editingBookId = null;
  editDialog.hidden = true;
  editBookForm.reset();
}

function openSettingsDialog() {
  hideResetSampleConfirm();
  syncSettingsCollectionRadios();
  settingsDialog.hidden = false;
  settingsBtn.setAttribute("aria-expanded", "true");
  settingsCloseBtn.focus();
}

function closeSettingsDialog() {
  settingsDialog.hidden = true;
  settingsBtn.setAttribute("aria-expanded", "false");
}

async function onCollectionSourceChange(next) {
  if (next !== "sample" && next !== "own") {
    return;
  }
  if (collectionSource === next) {
    return;
  }
  collectionSource = next;
  saveCollectionSourcePreference();
  syncSettingsCollectionRadios();
  render();
  if (!bookDetailDialog.hidden && detailBookId) {
    openBookDetail(detailBookId);
  }
}

function escapeCsvField(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function collectionRowsForExport() {
  const ids = activeCollectionIds();
  return getActiveBooks()
    .filter((book) => ids.has(book.id))
    .sort(compareCanonical)
    .map((book) => [
      book.title || book.listTitle || "Untitled",
      book.author || "",
      parseYear(book.publicationDate) || "",
    ]);
}

function exportCollectionCsv() {
  const rows = collectionRowsForExport();
  if (!rows.length) {
    window.alert("Your collection is empty — nothing to export.");
    return;
  }

  const csv = `${rows
    .map((cols) => cols.map(escapeCsvField).join(","))
    .join("\n")}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "my_collection.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function resetSampleCollection() {
  try {
    localStorage.removeItem(SAMPLE_COLLECTION_STORAGE_KEY);
  } catch (_) {
    // localStorage unavailable
  }

  sampleCollectionIds = await buildSampleIdsFromCsv({
    forceCsv: Boolean(window.SAMPLE_COLLECTION_CSV),
  });
  let wantChanged = false;
  for (const id of sampleCollectionIds) {
    if (wantIds.delete(id)) {
      wantChanged = true;
    }
  }
  if (wantChanged) {
    saveWantList();
  }
  saveSampleCollectionIds();
  hideResetSampleConfirm();
  render();
  if (!bookDetailDialog.hidden && detailBookId) {
    openBookDetail(detailBookId);
  }
}

function openAttributionDialog() {
  attributionDialog.hidden = false;
  attributionBtn.setAttribute("aria-expanded", "true");
  attributionCloseBtn.focus();
}

function closeAttributionDialog() {
  attributionDialog.hidden = true;
  attributionBtn.setAttribute("aria-expanded", "false");
}


/* Edit dialog and dev-server PATCH / DELETE API */


async function deleteBook() {
  if (!editingBookId) {
    return;
  }

  const book = books.find((entry) => entry.id === editingBookId);
  const title = book?.title || "this book";
  const confirmed = window.confirm(
    `Remove "${title}" from the gallery? It will disappear everywhere, even with "Show hidden" on localhost. Scraped data is unchanged.`,
  );
  if (!confirmed) {
    return;
  }

  editDeleteBtn.disabled = true;
  editSaveBtn.disabled = true;

  try {
    const response = await fetch(`/api/books/${editingBookId}`, {
      method: "DELETE",
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not delete book");
    }

          if (book) {
            book.deleted = true;
          }
          invalidateSortedCache();

          if (detailBookId === editingBookId) {
      closeBookDetail();
    }

    closeEditDialog();
    render();
  } catch (error) {
    console.error(error);
    window.alert(`Could not delete book: ${error.message}`);
  } finally {
    editDeleteBtn.disabled = false;
    editSaveBtn.disabled = false;
  }
}

function applyEditResponseToBook(bookId, payload) {
  const book = books.find((entry) => entry.id === bookId);
  if (!book) {
    return;
  }

  book.title = payload.title;
  book.author = payload.author;
  book.coverArtist = payload.coverArtist;
  book.publicationDate = payload.publicationDate;
  book.decade =
    payload.decade ?? decadeFromYear(parseYear(book.publicationDate));
  book.wikipediaUrl = payload.wikipediaUrl;
  book.goodreadsUrl = payload.goodreadsUrl;
  if (Object.prototype.hasOwnProperty.call(payload, "description")) {
    book.description = payload.description || null;
  }
  if (payload.coverImageFile) {
    book.coverImageFile = payload.coverImageFile;
    book.coverEditPath = payload.coverImageFile;
    book.coverCacheKey = Date.now();
  }
  const key = String(bookId);
  const storedEdit = payload.edit || {};
  book.hidden = storedEdit.hidden === true;
  book.deleted = storedEdit.deleted === true;
  if (Object.keys(storedEdit).length) {
    window.BOOK_EDITS[key] = { ...storedEdit };
  } else {
    delete window.BOOK_EDITS[key];
  }

  prepareBookSearchIndex(book);
  invalidateSortedCache();
}

async function saveBookEdits(event) {
  event.preventDefault();
  if (!editingBookId) {
    return;
  }

  editSaveBtn.disabled = true;

  if (serveEnabled && !serveEditDeltas) {
    window.alert(
      "Restart npm run serve so edits save only changed fields (not the whole form).",
    );
    editSaveBtn.disabled = false;
    return;
  }

  try {
    const formData = new FormData();
    formData.append("title", sanitizeSingleLineText(editTitleInput.value));
    formData.append("author", sanitizeSingleLineText(editAuthorInput.value));
    formData.append(
      "coverArtist",
      sanitizeSingleLineText(editCoverArtistInput.value),
    );
    formData.append(
      "publicationDate",
      sanitizeSingleLineText(editPublicationDateInput.value),
    );
    formData.append(
      "wikipediaUrl",
      sanitizeUrlInput(editWikipediaUrlInput.value),
    );
    formData.append(
      "goodreadsUrl",
      sanitizeGoodreadsUrlInput(editGoodreadsUrlInput.value),
    );
    formData.append(
      "description",
      htmlToPlainText(editDescriptionInput.value),
    );
    if (editCoverFileInput.files?.[0]) {
      formData.append("cover", editCoverFileInput.files[0]);
    }

    const response = await fetch(`/api/books/${editingBookId}`, {
      method: "PATCH",
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not save book");
    }

    applyEditResponseToBook(editingBookId, payload);

    const savedBookId = editingBookId;
    closeEditDialog();
    render();
    if (detailBookId === savedBookId) {
      openBookDetail(savedBookId);
    }
  } catch (error) {
    console.error(error);
    window.alert(`Could not save book: ${error.message}`);
  } finally {
    editSaveBtn.disabled = false;
  }
}

async function setBookHidden(bookId, hidden) {
  const button = grid.querySelector(
    `.hide-book-btn[data-book-id="${bookId}"]`,
  );
  if (button) {
    button.disabled = true;
  }

  try {
    const response = await fetch(`/api/books/${bookId}/hidden`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not update book");
    }

    applyEditResponseToBook(bookId, payload);
    render();
  } catch (error) {
    console.error(error);
    window.alert(`Could not update book: ${error.message}`);
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}


/* Admin book order dialog */

let bookOrderDragId = null;

function getBookById(bookId) {
  return books.find((entry) => entry.id === bookId) || null;
}

function isValidBookOrder(order) {
  for (let index = 1; index < order.length; index += 1) {
    const prevYear = parseYear(getBookById(order[index - 1])?.publicationDate);
    const nextYear = parseYear(getBookById(order[index])?.publicationDate);
    if (prevYear && nextYear && Number(prevYear) > Number(nextYear)) {
      return false;
    }
  }
  return true;
}

function wouldSwapBooksInOrder(order, indexA, indexB) {
  if (
    indexA < 0 ||
    indexB < 0 ||
    indexA >= order.length ||
    indexB >= order.length ||
    indexA === indexB
  ) {
    return false;
  }

  const next = [...order];
  [next[indexA], next[indexB]] = [next[indexB], next[indexA]];
  return isValidBookOrder(next);
}

function wouldMoveBookToIndex(order, bookId, targetIndex) {
  const from = order.indexOf(bookId);
  if (from < 0 || targetIndex < 0 || targetIndex >= order.length || from === targetIndex) {
    return false;
  }

  const next = [...order];
  next.splice(from, 1);
  if (from < targetIndex) {
    targetIndex -= 1;
  }
  next.splice(targetIndex, 0, bookId);
  return isValidBookOrder(next);
}

function canMoveBookInOrder(order, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= order.length) {
    return false;
  }

  return wouldSwapBooksInOrder(order, index, target);
}

function getOrderDialogIds() {
  const showHidden = showHiddenInput.checked;
  return workingBookOrder.filter((id) => {
    const book = getBookById(id);
    return book && (showHidden || !book.hidden);
  });
}

function renderBookOrderList() {
  if (!bookOrderList) {
    return;
  }

  const ids = getOrderDialogIds();
  if (!ids.length) {
    bookOrderList.innerHTML =
      '<p class="order-dialog-empty">No books to reorder.</p>';
    return;
  }

  bookOrderList.innerHTML = ids
    .map((id) => {
      const book = getBookById(id);
      if (!book) {
        return "";
      }

      const index = workingBookOrder.indexOf(id);
      const canMoveUp = canMoveBookInOrder(workingBookOrder, index, -1);
      const canMoveDown = canMoveBookInOrder(workingBookOrder, index, 1);
      const dateLabel = book.publicationDate || "—";
      const title = escapeHtml(book.title || book.listTitle || "Untitled");

      return `
        <div class="order-dialog-row" data-book-id="${id}">
          <span
            class="order-dialog-drag-handle"
            draggable="true"
            aria-label="Drag to reorder"
            role="button"
            tabindex="0"
          >⠿</span>
          <div class="order-dialog-row-text">
            <span class="order-dialog-row-title">${title}</span>
            <span class="order-dialog-row-date">${escapeHtml(dateLabel)}</span>
          </div>
          <div class="order-dialog-row-actions">
            <button
              type="button"
              class="order-dialog-move"
              data-move="-1"
              aria-label="Move up"
              ${canMoveUp ? "" : "disabled"}
            >↑</button>
            <button
              type="button"
              class="order-dialog-move"
              data-move="1"
              aria-label="Move down"
              ${canMoveDown ? "" : "disabled"}
            >↓</button>
          </div>
        </div>
      `;
    })
    .join("");
}

async function openBookOrderDialog() {
  if (!bookOrderDialog || !serveEnabled) {
    return;
  }

  try {
    const response = await fetch("/api/book-order");
    if (!response.ok) {
      throw new Error("Could not load book order");
    }
    const payload = await response.json();
    workingBookOrder = Array.isArray(payload.order)
      ? payload.order.map((id) => Number(id))
      : [];
    bookOrderDirty = false;
    renderBookOrderList();
    bookOrderDialog.hidden = false;
    if (bookOrderBtn) {
      bookOrderBtn.setAttribute("aria-expanded", "true");
    }
    bookOrderCloseBtn?.focus();
  } catch (error) {
    window.alert(error.message || "Could not load book order.");
  }
}

function closeBookOrderDialog() {
  if (!bookOrderDialog) {
    return;
  }
  bookOrderDialog.hidden = true;
  workingBookOrder = [];
  bookOrderDirty = false;
  if (bookOrderBtn) {
    bookOrderBtn.setAttribute("aria-expanded", "false");
  }
}

async function saveBookOrderDialog() {
  if (!serveEnabled || !bookOrderDirty) {
    closeBookOrderDialog();
    return;
  }

  try {
    const response = await fetch("/api/book-order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: workingBookOrder }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Could not save book order");
    }

    setBookOrderIds(payload.order || workingBookOrder);
    window.BOOK_ORDER = [...bookOrderIds];
    closeBookOrderDialog();
    render();
  } catch (error) {
    window.alert(error.message || "Could not save book order.");
  }
}

function moveBookInWorkingOrder(bookId, delta) {
  const index = workingBookOrder.indexOf(bookId);
  if (index < 0 || !canMoveBookInOrder(workingBookOrder, index, delta)) {
    return;
  }

  const target = index + delta;
  const next = [...workingBookOrder];
  [next[index], next[target]] = [next[target], next[index]];
  workingBookOrder = next;
  bookOrderDirty = true;
  renderBookOrderList();
}

function reorderBookToTarget(dragId, targetId) {
  const from = workingBookOrder.indexOf(dragId);
  const to = workingBookOrder.indexOf(targetId);
  if (
    from < 0 ||
    to < 0 ||
    from === to ||
    !wouldMoveBookToIndex(workingBookOrder, dragId, to)
  ) {
    return;
  }

  const next = [...workingBookOrder];
  next.splice(from, 1);
  let insertAt = to;
  if (from < to) {
    insertAt -= 1;
  }
  next.splice(insertAt, 0, dragId);
  workingBookOrder = next;
  bookOrderDirty = true;
  renderBookOrderList();
}

function clearBookOrderDragState() {
  bookOrderDragId = null;
  if (!bookOrderList) {
    return;
  }
  bookOrderList
    .querySelectorAll(".order-dialog-row-dragging, .order-dialog-row-drop-target")
    .forEach((element) => {
      element.classList.remove("order-dialog-row-dragging", "order-dialog-row-drop-target");
    });
}

function onBookOrderDragStart(event) {
  const handle = event.target.closest(".order-dialog-drag-handle");
  if (!handle) {
    return;
  }

  const row = handle.closest(".order-dialog-row");
  if (!row) {
    return;
  }

  const bookId = Number(row.dataset.bookId);
  if (!Number.isInteger(bookId)) {
    return;
  }

  bookOrderDragId = bookId;
  row.classList.add("order-dialog-row-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(bookId));
}

function onBookOrderDragOver(event) {
  if (!bookOrderDragId) {
    return;
  }

  const row = event.target.closest(".order-dialog-row");
  if (!row) {
    return;
  }

  const targetId = Number(row.dataset.bookId);
  const targetIndex = workingBookOrder.indexOf(targetId);
  bookOrderList
    .querySelectorAll(".order-dialog-row-drop-target")
    .forEach((element) => {
      if (element !== row) {
        element.classList.remove("order-dialog-row-drop-target");
      }
    });

  if (!wouldMoveBookToIndex(workingBookOrder, bookOrderDragId, targetIndex)) {
    event.dataTransfer.dropEffect = "none";
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  row.classList.add("order-dialog-row-drop-target");
}

function onBookOrderDragLeave(event) {
  const row = event.target.closest(".order-dialog-row");
  if (row) {
    row.classList.remove("order-dialog-row-drop-target");
  }
}

function onBookOrderDrop(event) {
  event.preventDefault();
  const row = event.target.closest(".order-dialog-row");
  if (!row || !bookOrderDragId) {
    clearBookOrderDragState();
    return;
  }

  const targetId = Number(row.dataset.bookId);
  reorderBookToTarget(bookOrderDragId, targetId);
  clearBookOrderDragState();
}

function onBookOrderDragEnd() {
  clearBookOrderDragState();
}

function onBookOrderListClick(event) {
  const moveButton = event.target.closest(".order-dialog-move");
  if (!moveButton || moveButton.disabled) {
    return;
  }

  const row = moveButton.closest(".order-dialog-row");
  if (!row) {
    return;
  }

  const bookId = Number(row.dataset.bookId);
  const delta = Number(moveButton.dataset.move);
  if (!Number.isInteger(bookId) || !delta) {
    return;
  }

  moveBookInWorkingOrder(bookId, delta);
}

function refreshBookOrderDialogIfOpen() {
  if (bookOrderDialog && !bookOrderDialog.hidden) {
    renderBookOrderList();
  }
}


/* Event listeners and application startup */

grid.addEventListener("click", (event) => {
  const editButton = event.target.closest(".edit-book-btn");
  if (editButton) {
    event.preventDefault();
    event.stopPropagation();
    openEditDialog(Number(editButton.dataset.bookId));
    return;
  }

  const hideButton = event.target.closest(".hide-book-btn");
  if (hideButton) {
    event.preventDefault();
    event.stopPropagation();
    const bookId = Number(hideButton.dataset.bookId);
    const isHidden = hideButton.dataset.hidden === "true";
    setBookHidden(bookId, !isHidden);
    return;
  }

  if (
    event.target.closest(".book-detail-wiki-btn") ||
    event.target.closest(".book-detail-goodreads-btn")
  ) {
    return;
  }

  const card = event.target.closest(".card");
  if (card) {
    openBookDetail(Number(card.dataset.bookId));
  }
});

bookDetailCloseBtn.addEventListener("click", closeBookDetail);
bookDetailPrevBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  navigateDetail(-1);
});
bookDetailNextBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  navigateDetail(1);
});
bookDetailDialog.addEventListener("click", (event) => {
  const editButton = event.target.closest(".book-detail-edit-btn");
  if (editButton) {
    event.preventDefault();
    event.stopPropagation();
    openEditDialog(Number(editButton.dataset.bookId));
    return;
  }

  const collectionButton = event.target.closest(".collection-btn");
  if (collectionButton) {
    event.preventDefault();
    event.stopPropagation();
    toggleCollection(Number(collectionButton.dataset.bookId));
    return;
  }

  const wantButton = event.target.closest(".want-btn");
  if (!wantButton || wantButton.classList.contains("want-badge")) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  toggleWant(Number(wantButton.dataset.bookId));
});
bookDetailDialog
  .querySelectorAll("[data-close-detail]")
  .forEach((element) => {
    element.addEventListener("click", closeBookDetail);
  });

editBookForm.addEventListener("submit", saveBookEdits);
bindEditFieldSanitizers(editBookForm);
editDeleteBtn.addEventListener("click", deleteBook);
editCancelBtn.addEventListener("click", closeEditDialog);
editDialog.querySelectorAll("[data-close-edit]").forEach((element) => {
  element.addEventListener("click", closeEditDialog);
});

settingsBtn.addEventListener("click", () => {
  if (settingsDialog.hidden) {
    openSettingsDialog();
  } else {
    closeSettingsDialog();
  }
});

settingsCloseBtn.addEventListener("click", closeSettingsDialog);
settingsDialog.querySelectorAll("[data-close-settings]").forEach((element) => {
  element.addEventListener("click", closeSettingsDialog);
});

collectionSourceSampleInput.addEventListener("change", () => {
  if (collectionSourceSampleInput.checked) {
    onCollectionSourceChange("sample");
  }
});

collectionSourceOwnInput.addEventListener("change", () => {
  if (collectionSourceOwnInput.checked) {
    onCollectionSourceChange("own");
  }
});

if (exportCollectionBtn) {
  exportCollectionBtn.addEventListener("click", () => {
    exportCollectionCsv();
  });
}

if (resetSampleCollectionBtn) {
  resetSampleCollectionBtn.addEventListener("click", () => {
    showResetSampleConfirm();
  });
}

if (resetSampleCancelBtn) {
  resetSampleCancelBtn.addEventListener("click", () => {
    hideResetSampleConfirm();
  });
}

if (resetSampleConfirmBtn) {
  resetSampleConfirmBtn.addEventListener("click", () => {
    resetSampleCollection();
  });
}

if (highlightWantsInput) {
  highlightWantsInput.addEventListener("change", () => {
    highlightWants = highlightWantsInput.checked;
    saveHighlightWantsPreference();
    render();
  });
}

if (highlightCollectionInput) {
  highlightCollectionInput.addEventListener("change", () => {
    highlightCollection = highlightCollectionInput.checked;
    saveHighlightCollectionPreference();
    render();
  });
}

if (showMagazinesInput) {
  showMagazinesInput.addEventListener("change", () => {
    showMagazines = showMagazinesInput.checked;
    saveShowMagazinesPreference();
    render();
  });
}

if (bookOrderBtn) {
  bookOrderBtn.addEventListener("click", () => {
    if (bookOrderDialog.hidden) {
      openBookOrderDialog();
    } else {
      closeBookOrderDialog();
    }
  });
}

if (bookOrderCloseBtn) {
  bookOrderCloseBtn.addEventListener("click", closeBookOrderDialog);
}

if (bookOrderCancelBtn) {
  bookOrderCancelBtn.addEventListener("click", closeBookOrderDialog);
}

if (bookOrderSaveBtn) {
  bookOrderSaveBtn.addEventListener("click", () => {
    saveBookOrderDialog();
  });
}

if (bookOrderDialog) {
  bookOrderDialog.querySelectorAll("[data-close-book-order]").forEach((element) => {
    element.addEventListener("click", closeBookOrderDialog);
  });
}

if (bookOrderList) {
  bookOrderList.addEventListener("click", onBookOrderListClick);
  bookOrderList.addEventListener("dragstart", onBookOrderDragStart);
  bookOrderList.addEventListener("dragover", onBookOrderDragOver);
  bookOrderList.addEventListener("dragleave", onBookOrderDragLeave);
  bookOrderList.addEventListener("drop", onBookOrderDrop);
  bookOrderList.addEventListener("dragend", onBookOrderDragEnd);
}

attributionBtn.addEventListener("click", () => {
  if (attributionDialog.hidden) {
    openAttributionDialog();
  } else {
    closeAttributionDialog();
  }
});

attributionCloseBtn.addEventListener("click", closeAttributionDialog);
attributionDialog.querySelectorAll("[data-close-attribution]").forEach((element) => {
  element.addEventListener("click", closeAttributionDialog);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !editDialog.hidden) {
    closeEditDialog();
    return;
  }
  if (event.key === "Escape" && !bookDetailDialog.hidden) {
    closeBookDetail();
    return;
  }
  if (!bookDetailDialog.hidden && editDialog.hidden) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateDetail(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateDetail(1);
      return;
    }
  }
  if (event.key === "Escape" && !settingsDialog.hidden) {
    closeSettingsDialog();
    return;
  }
  if (event.key === "Escape" && bookOrderDialog && !bookOrderDialog.hidden) {
    closeBookOrderDialog();
    return;
  }
  if (event.key === "Escape" && !attributionDialog.hidden) {
    closeAttributionDialog();
  }
});

function updateSearchClearVisibility() {
  searchClearBtn.hidden = !searchInput.value;
}

let searchRenderTimer = null;

function renderNow() {
  if (searchRenderTimer) {
    clearTimeout(searchRenderTimer);
    searchRenderTimer = null;
  }
  render();
}

function debouncedRender() {
  if (searchRenderTimer) {
    clearTimeout(searchRenderTimer);
  }
  searchRenderTimer = setTimeout(() => {
    searchRenderTimer = null;
    render();
  }, 200);
}

function onSearchInput() {
  updateSearchClearVisibility();
  debouncedRender();
}

function onSearchCommit() {
  updateSearchClearVisibility();
  renderNow();
}

searchClearBtn.addEventListener("click", () => {
  searchInput.value = "";
  searchInput.focus();
  onSearchCommit();
});

searchInput.addEventListener("input", onSearchInput);
searchInput.addEventListener("search", onSearchCommit);
searchInput.addEventListener("change", onSearchCommit);
sortSelect.addEventListener("change", onSortChange);
showHiddenInput.addEventListener("change", () => {
  refreshBookOrderDialogIfOpen();
  render();
});

loadWantList();
restoreCollectionSourcePreference();
restoreHighlightPreferences();
restoreShowMagazinesPreference();
syncSettingsCollectionRadios();
loadOwnCollectionIds();
loadHeaderFiltersPreference();
updateHeaderFiltersState();
restoreSortPreference();
updateSortControlVisibility();

if (headerFiltersToggle) {
  headerFiltersToggle.addEventListener("click", () => {
    headerFiltersExpanded = !headerFiltersExpanded;
    saveHeaderFiltersPreference();
    updateHeaderFiltersState();
  });
}

stats.addEventListener("click", (event) => {
  if (event.target.closest("#collection-filter-toggle")) {
    const next = !collectionOnly;
    collectionOnly = next;
    if (next) {
      wantOnly = false;
    }
    render();
    return;
  }
  if (event.target.closest("#hidden-filter-toggle")) {
    hiddenOnly = !hiddenOnly;
    render();
    return;
  }
  if (event.target.closest("#mycroft-filter-toggle")) {
    cycleMycroftFilter();
    render();
    return;
  }
  if (event.target.closest("#want-filter-toggle")) {
    const next = !wantOnly;
    wantOnly = next;
    if (next) {
      collectionOnly = false;
    }
    render();
    return;
  }
});

if (readOnly) {
  ensureSampleCollectionIds().then(render);
} else {
  checkServeSupport()
    .then(() => ensureSampleCollectionIds())
    .then(render);
}

})();

