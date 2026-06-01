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
