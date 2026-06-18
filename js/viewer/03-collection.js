/* Collection, want list, storage mode, and user state */

const GIST_PUSH_DELAY_MS = 1500;
let gistPushTimer = null;
let gistPullInFlight = null;

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

function readGistSyncConfig() {
  try {
    const saved = localStorage.getItem(viewerGistSync.GIST_SYNC_KEY);
    return viewerGistSync.parseGistSyncConfig(saved);
  } catch (_) {
    return null;
  }
}

function writeGistSyncConfig(config) {
  try {
    localStorage.setItem(
      viewerGistSync.GIST_SYNC_KEY,
      viewerGistSync.serializeGistSyncConfig(config),
    );
  } catch (_) {
    // localStorage unavailable
  }
}

function clearGistSyncConfig() {
  if (gistPushTimer) {
    clearTimeout(gistPushTimer);
    gistPushTimer = null;
  }
  try {
    localStorage.removeItem(viewerGistSync.GIST_SYNC_KEY);
  } catch (_) {
    // localStorage unavailable
  }
  if (gistTokenInput) {
    gistTokenInput.value = "";
  }
  syncGistConnectUi();
  refreshGistSyncStatus();
}

function readPersistedUserState() {
  try {
    const saved = localStorage.getItem(viewerUserState.USER_STATE_KEY);
    return viewerUserState.parseUserState(saved);
  } catch (_) {
    return null;
  }
}

function buildStateForPersistence() {
  const existing = readPersistedUserState();
  return viewerUserState.buildUserStateFromRuntime(collectRuntimeSnapshot(), {
    existingCollections: existing?.collections,
  });
}

function gistMergeHelpers() {
  return {
    normalizeCollections: viewerUserState.normalizeCollections,
    normalizeCollectionSlot: viewerUserState.normalizeCollectionSlot,
    emptyCollectionSlot: viewerUserState.emptyCollectionSlot,
  };
}

function swapCollectionForStorageMode(nextMode) {
  const existing = readPersistedUserState();
  const collections = viewerUserState.normalizeCollections(
    existing?.collections,
    existing?.collectionIds,
    existing?.orderedIds,
  );
  collections[storageMode] = {
    collectionIds: [...collectionIds],
    orderedIds: [...orderedIds],
  };
  const nextSlot = collections[nextMode] || viewerUserState.emptyCollectionSlot();
  collectionIds = new Set(nextSlot.collectionIds);
  orderedIds = new Set(nextSlot.orderedIds);
  return collections;
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
    storageMode,
    collectionIds: [...collectionIds],
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
  storageMode = viewerUserState.normalizeStorageMode(runtime.storageMode);
  wantIds = new Set(runtime.wantIds);
  collectionIds = new Set(runtime.collectionIds);
  orderedIds = new Set(runtime.orderedIds);
  gridViewMode = runtime.viewMode;
  headerFiltersExpanded = runtime.headerFiltersExpanded;
  highlightWants = runtime.highlightWants;
  highlightCollection = runtime.highlightCollection;
  showMagazines = runtime.showMagazines;
  if (sortSelect && runtime.sort) {
    sortSelect.value = runtime.sort;
  }
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function fetchGistState(config) {
  const response = await fetch(
    `${viewerGistSync.GITHUB_API}/gists/${config.gistId}`,
    { headers: githubHeaders(config.token) },
  );
  if (!response.ok) {
    throw new Error(`Gist fetch failed (${response.status})`);
  }
  const body = await response.json();
  const content = viewerGistSync.extractStateJsonFromGistResponse(body);
  if (!content) {
    return null;
  }
  return viewerUserState.parseUserState(content);
}

async function pushGistState(config, state) {
  const stateJson = viewerUserState.serializeUserState(state);
  const response = await fetch(
    `${viewerGistSync.GITHUB_API}/gists/${config.gistId}`,
    {
      method: "PATCH",
      headers: {
        ...githubHeaders(config.token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(viewerGistSync.buildGistUpdatePayload(stateJson)),
    },
  );
  if (!response.ok) {
    throw new Error(`Gist update failed (${response.status})`);
  }
}

async function createGistWithState(config, state) {
  const stateJson = viewerUserState.serializeUserState(state);
  const response = await fetch(`${viewerGistSync.GITHUB_API}/gists`, {
    method: "POST",
    headers: {
      ...githubHeaders(config.token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(viewerGistSync.buildGistCreatePayload(stateJson)),
  });
  if (!response.ok) {
    throw new Error(`Gist create failed (${response.status})`);
  }
  const body = await response.json();
  return body.id;
}

async function connectGistSync(token) {
  const trimmed = String(token || "").trim();
  if (!trimmed) {
    throw new Error("Enter a GitHub token with gist access.");
  }

  const existing = readGistSyncConfig();
  const config = {
    token: trimmed,
    gistId: existing?.gistId || "",
  };
  const state = buildStateForPersistence();

  if (!config.gistId) {
    config.gistId = await createGistWithState(config, state);
  } else {
    await pushGistState(config, state);
  }

  writeGistSyncConfig(config);
  storageMode = "gist";
  saveUserState();
  syncSettingsStorageMode();
  return config;
}

function scheduleGistPush() {
  if (storageMode !== "gist") {
    return;
  }
  const config = readGistSyncConfig();
  if (!viewerGistSync.isConnectedGistConfig(config)) {
    return;
  }
  if (gistPushTimer) {
    clearTimeout(gistPushTimer);
  }
  gistPushTimer = setTimeout(async () => {
    gistPushTimer = null;
    try {
      await pushGistState(config, buildStateForPersistence());
      updateGistSyncStatus("Synced to gist.");
    } catch (error) {
      updateGistSyncStatus(error.message || "Gist sync failed.", true);
    }
  }, GIST_PUSH_DELAY_MS);
}

async function pullGistStateIfConfigured(options = {}) {
  if (storageMode !== "gist") {
    return;
  }
  const config = readGistSyncConfig();
  if (!viewerGistSync.isConnectedGistConfig(config)) {
    return;
  }
  if (gistPullInFlight) {
    return gistPullInFlight;
  }

  gistPullInFlight = (async () => {
    try {
      const localRaw = localStorage.getItem(viewerUserState.USER_STATE_KEY);
      const localState = viewerUserState.parseUserState(localRaw);
      const remoteState = await fetchGistState(config);
      const merged = viewerGistSync.mergeGistUserState(
        localState,
        remoteState,
        gistMergeHelpers(),
      );
      if (merged && merged.updatedAt !== localState?.updatedAt) {
        persistUserState(merged);
        applyRuntimeSnapshot(viewerUserState.applyUserStateToRuntime(merged));
        syncSettingsStorageMode();
        if (options.reRender !== false) {
          render();
        }
      } else {
        refreshGistSyncStatus();
      }
    } catch (error) {
      updateGistSyncStatus(error.message || "Gist pull failed.", true);
    } finally {
      gistPullInFlight = null;
    }
  })();

  return gistPullInFlight;
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

  applyRuntimeSnapshot(viewerUserState.applyUserStateToRuntime(state));
  syncSettingsHighlightCheckboxes();
  updateHeaderFiltersState();
  updateViewModeState();
  syncSettingsStorageMode();
}

async function loadUserStateAsync() {
  loadUserState();
  await pullGistStateIfConfigured({ reRender: false });
}

function saveUserState() {
  persistUserState(buildStateForPersistence());
  scheduleGistPush();
}

async function importCollectionFromCsvText(csvText) {
  const rows = viewerCollectionImport.parseCollectionCsv(csvText);
  if (!rows.length) {
    throw new Error("No collection rows found in that file.");
  }

  const result = viewerCollectionImport.matchCollectionImportRows(
    getActiveBooks(),
    rows,
  );
  collectionIds = new Set(result.matchedIds);
  orderedIds = new Set();
  saveUserState();

  let syncedToGist = false;
  if (storageMode === "gist") {
    const config = readGistSyncConfig();
    if (viewerGistSync.isConnectedGistConfig(config)) {
      await pushGistState(config, buildStateForPersistence());
      syncedToGist = true;
      updateGistSyncStatus("Synced to gist.");
    }
  }

  return {
    rowCount: rows.length,
    matchedCount: result.matchedIds.length,
    unmatchedCount: result.unmatchedRows.length,
    syncedToGist,
  };
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
    if (collectionIds.has(id)) {
      collectionIds.delete(id);
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
    collectionIds.delete(id);
    orderedIds.delete(id);
  } else if (isOrdered({ id })) {
    orderedIds.delete(id);
    collectionIds.add(id);
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
