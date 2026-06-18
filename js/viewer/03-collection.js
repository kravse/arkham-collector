/* Sample and own collection, want list, unified user state */

const DEFAULT_COLLECTION_CSV = "my_collection/my_collection.csv";

let sampleCollectionSeeded = true;

function readLegacyStorageSnapshot() {
  const snapshot = {};
  try {
    for (const key of Object.values(viewerUserState.LEGACY_KEYS)) {
      snapshot[key] = localStorage.getItem(key);
    }
  } catch (_) {
    // localStorage unavailable
  }
  return snapshot;
}

function persistUserState(state) {
  try {
    localStorage.setItem(
      viewerUserState.USER_STATE_KEY,
      viewerUserState.serializeUserState(state),
    );
  } catch (_) {
    // localStorage unavailable
  }
}

function collectRuntimeSnapshot() {
  return {
    collectionSource,
    ownCollectionIds: [...ownCollectionIds],
    sampleCollectionIds: sampleCollectionSeeded
      ? [...sampleCollectionIds]
      : null,
    orderedIds: [...orderedIds],
    wantIds: [...wantIds],
    sort: sortSelect.value,
    viewMode: gridViewMode,
    headerFiltersExpanded,
    highlightWants,
    highlightCollection,
    showMagazines,
  };
}

function applyRuntimeSnapshot(runtime) {
  wantIds = new Set(runtime.wantIds);
  ownCollectionIds = new Set(runtime.ownCollectionIds);
  orderedIds = new Set(runtime.orderedIds);
  if (runtime.sampleCollectionIds === null) {
    sampleCollectionSeeded = false;
    sampleCollectionIds = new Set();
  } else {
    sampleCollectionSeeded = true;
    sampleCollectionIds = new Set(runtime.sampleCollectionIds);
  }
  gridViewMode = runtime.viewMode;
  headerFiltersExpanded = runtime.headerFiltersExpanded;
  highlightWants = runtime.highlightWants;
  highlightCollection = runtime.highlightCollection;
  showMagazines = runtime.showMagazines;
  if (sortSelect && runtime.sort) {
    sortSelect.value = runtime.sort;
  }
}

function applyCollectionSourcePreference() {
  const saved =
    collectionSource === "own" || collectionSource === "sample"
      ? collectionSource
      : null;
  collectionSource = viewerCollectionSource.resolveCollectionSourceOnLoad({
    saved,
    defaultSource: defaultCollectionSource(),
    sampleUrlOverride: viewerCollectionSource.parseSampleUrlOverride(
      window.location.search,
    ),
  });
}

function loadUserState() {
  let state = null;
  try {
    const saved = localStorage.getItem(viewerUserState.USER_STATE_KEY);
    state = viewerUserState.parseUserState(saved);
    if (!state) {
      state = viewerUserState.migrateFromLegacy(readLegacyStorageSnapshot());
      persistUserState(state);
    }
  } catch (_) {
    state = viewerUserState.defaultUserState();
  }

  const runtime = viewerUserState.applyUserStateToRuntime(state);
  applyRuntimeSnapshot(runtime);
  collectionSource =
    runtime.collectionSource === "own" || runtime.collectionSource === "sample"
      ? runtime.collectionSource
      : defaultCollectionSource();
  applyCollectionSourcePreference();
  syncSettingsHighlightCheckboxes();
  updateHeaderFiltersState();
  updateViewModeState();
}

function saveUserState() {
  persistUserState(
    viewerUserState.buildUserStateFromRuntime(collectRuntimeSnapshot()),
  );
}

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
  if (sampleCollectionSeeded) {
    return;
  }

  sampleCollectionIds = await buildSampleIdsFromCsv();
  sampleCollectionSeeded = true;
  saveUserState();
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

function updateViewModeState() {
  document.body.classList.toggle("view-mode-list", gridViewMode === "list");
  if (!viewModeToggle) {
    return;
  }
  const listMode = gridViewMode === "list";
  viewModeToggle.setAttribute("aria-pressed", String(listMode));
  viewModeToggle.setAttribute(
    "aria-label",
    listMode ? "Switch to grid view" : "Switch to list view",
  );
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
    }
    if (orderedIds.has(id)) {
      orderedIds.delete(id);
    }
  }
  saveUserState();
  render();
  if (!bookDetailDialog.hidden) {
    openBookDetail(detailBookId, { historyMode: "none" });
  }
}

function toggleCollection(bookId) {
  const id = Number(bookId);
  if (!Number.isFinite(id)) {
    return;
  }

  if (isCollected({ id })) {
    activeCollectionIds().delete(id);
    orderedIds.delete(id);
  } else if (isOrdered({ id })) {
    orderedIds.delete(id);
    activeCollectionIds().add(id);
  } else {
    orderedIds.add(id);
    wantIds.delete(id);
  }

  saveUserState();
  render();
  if (!bookDetailDialog.hidden) {
    openBookDetail(detailBookId, { historyMode: "none" });
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
