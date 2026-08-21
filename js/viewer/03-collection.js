/* Collection, want list, storage mode, and user state */

const GIST_PUSH_DELAY_MS = 1000;
let gistPushTimer = null;
let gistPushInFlight = null;
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
  gistPushInFlight = null;
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

function swapCollectionForStorageMode(nextMode) {
  const existing = readPersistedUserState();
  const collections = viewerUserState.normalizeCollections(
    existing?.collections,
    existing?.collectionIds,
    existing?.orderedIds,
    {
      wantIds: existing?.wantIds,
      wantOrderIds: existing?.wantOrderIds,
      at: existing?.updatedAt,
    },
  );
  collections[storageMode] = viewerUserState.buildCollectionSlot(
    bookStatuses,
    wantOrderIds,
  );
  const nextSlot = collections[nextMode] || viewerUserState.emptyCollectionSlot();
  applyBookStatuses(nextSlot.statuses, { wantOrderIds: nextSlot.wantOrderIds });
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
    bookStatuses,
    collectionIds: [...collectionIds],
    orderedIds: [...orderedIds],
    wantIds: [...wantIds],
    wantOrderIds: [...wantOrderIds],
    sort: getCatalogSortMode(),
    viewMode: gridViewMode,
    headerFiltersExpanded,
    highlightWants,
    highlightCollection,
    showMagazines,
    wantOrderLocked,
  };
}

function applyRuntimeSnapshot(runtime) {
  storageMode = viewerUserState.normalizeStorageMode(runtime.storageMode);
  applyBookStatuses(runtime.bookStatuses, {
    wantOrderIds: runtime.wantOrderIds,
  });
  gridViewMode = runtime.viewMode;
  headerFiltersExpanded = runtime.headerFiltersExpanded;
  highlightWants = runtime.highlightWants;
  highlightCollection = runtime.highlightCollection;
  showMagazines = runtime.showMagazines;
  wantOrderLocked = runtime.wantOrderLocked === true;
  if (runtime.sort) {
    syncSortControlFromMode(runtime.sort);
  }
  updateViewModeState();
  updateHeaderFiltersState();
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function listUserGists(token) {
  const response = await fetch(`${viewerGistSync.GITHUB_API}/gists?per_page=100`, {
    headers: githubHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) {
    return [];
  }
  return response.json();
}

async function fetchGistState(config) {
  const response = await fetch(
    `${viewerGistSync.GITHUB_API}/gists/${config.gistId}`,
    {
      headers: githubHeaders(config.token),
      cache: "no-store",
    },
  );
  if (response.status === 404) {
    throw new Error("Gist fetch failed (404)");
  }
  if (!response.ok) {
    throw new Error(`Gist fetch failed (${response.status})`);
  }
  const body = await response.json();
  const stateFilename = viewerGistSync.resolveGistStateFilename(
    body,
    config.stateFilename,
  );
  if (stateFilename !== config.stateFilename) {
    writeGistSyncConfig({ ...config, stateFilename });
  }
  const content = viewerGistSync.extractStateJsonFromGistResponse(
    body,
    stateFilename,
  );
  if (!content) {
    return null;
  }
  return viewerUserState.parseUserState(content);
}

async function findExistingArkhamGist(token) {
  const gists = await listUserGists(token);
  return viewerGistSync.findArkhamGistEntry(gists);
}

async function patchGistState(config, state) {
  const stateJson = viewerUserState.serializeUserState(state);
  const stateFilename =
    config.stateFilename || viewerGistSync.GIST_STATE_FILENAME;
  const response = await fetch(
    `${viewerGistSync.GITHUB_API}/gists/${config.gistId}`,
    {
      method: "PATCH",
      headers: {
        ...githubHeaders(config.token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        viewerGistSync.buildGistUpdatePayload(stateJson, stateFilename),
      ),
    },
  );
  if (!response.ok) {
    throw new Error(`Gist update failed (${response.status})`);
  }
}

/**
 * Fold whatever a push resolved to back into the live view, re-merging against
 * current state so a click made while the request was in flight survives.
 */
function adoptMergedGistState(merged) {
  const current = buildStateForPersistence();
  const next = viewerUserState.mergeUserState(current, merged) || merged;
  const unchanged =
    JSON.stringify(next.collections.gist.statuses) ===
      JSON.stringify(current.collections.gist.statuses) &&
    JSON.stringify(next.wantOrderIds) === JSON.stringify(current.wantOrderIds);
  if (unchanged) {
    return;
  }
  persistUserState(next);
  applyRuntimeSnapshot(viewerUserState.applyUserStateToRuntime(next));
  syncSettingsStorageMode();
  render();
}

/**
 * Read, merge, then write. A blind PATCH lets a tab that loaded an hour ago erase
 * books another device added since; merging the remote doc first means a stale tab
 * can only add to the record, never subtract from it.
 *
 * `authoritative` skips the merge for the one case that must not merge: restoring
 * a snapshot, which is a deliberate replacement of everything.
 */
async function pushGistState(config, state, options = {}) {
  if (options.authoritative) {
    await patchGistState(config, state);
    return state;
  }

  let remoteState = null;
  try {
    remoteState = await fetchGistState(config);
  } catch (error) {
    // Never overwrite a gist we could not read; a missing file is safe to replace.
    if (!String(error.message || "").includes("404")) {
      throw error;
    }
  }
  const merged = viewerUserState.mergeUserState(state, remoteState) || state;
  await patchGistState(config, merged);
  adoptMergedGistState(merged);
  return merged;
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

  const existingConfig = readGistSyncConfig();
  let gistId = existingConfig?.gistId || "";
  let stateFilename = existingConfig?.stateFilename || "";
  if (!gistId) {
    const entry = await findExistingArkhamGist(trimmed);
    gistId = entry?.gistId || "";
    stateFilename = entry?.stateFilename || "";
  }

  const localPersisted = readPersistedUserState();
  let remoteState = null;

  if (gistId) {
    try {
      remoteState = await fetchGistState({
        token: trimmed,
        gistId,
        stateFilename,
      });
    } catch (error) {
      if (String(error.message || "").includes("404")) {
        gistId = "";
        stateFilename = "";
      } else {
        throw error;
      }
    }
  }

  const resolved = viewerGistSync.resolveGistConnectState({
    gistId,
    remoteState,
    localPersisted,
    adoptRemoteGistState: viewerUserState.adoptRemoteGistState,
    buildNewGistConnectState: viewerUserState.buildNewGistConnectState,
  });
  if (!resolved.ok) {
    throw new Error(resolved.error);
  }

  let nextState = resolved.nextState;
  if (resolved.action === "create") {
    gistId = await createGistWithState(
      { token: trimmed, gistId: "" },
      nextState,
    );
    stateFilename = viewerGistSync.GIST_STATE_FILENAME;
  }

  const gists = await listUserGists(trimmed);
  const backupGistId =
    existingConfig?.backupGistId ||
    viewerGistBackup.findBackupGistId(gists, gistId) ||
    "";

  writeGistSyncConfig({
    token: trimmed,
    gistId,
    backupGistId,
    stateFilename,
  });
  persistUserState(nextState);
  applyRuntimeSnapshot(viewerUserState.applyUserStateToRuntime(nextState));
  pendingGistSetup = false;
  storageMode = "gist";
  syncSettingsStorageMode();
  return { token: trimmed, gistId };
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
      gistPushInFlight = pushGistState(config, buildStateForPersistence());
      await gistPushInFlight;
      updateGistSyncStatus("Synced to GitHub Gist.");
      try {
        await maybeCreateGistSnapshot();
      } catch (_) {
        /* Backup failures must not block live sync. */
      }
    } catch (error) {
      updateGistSyncStatus(error.message || "Gist sync failed.", true);
    } finally {
      gistPushInFlight = null;
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
  if (gistPushTimer || gistPushInFlight) {
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
      const merged = viewerUserState.mergeUserState(localState, remoteState);
      // Comparing updatedAt is not enough: a remote doc can carry books this
      // device is missing while still holding an older payload timestamp.
      const changed =
        merged &&
        viewerUserState.serializeUserState(merged) !==
          viewerUserState.serializeUserState(localState);
      if (changed) {
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

function enforceStorageModeConsistency() {
  if (storageMode === "gist" && !viewerGistSync.isConnectedGistConfig(readGistSyncConfig())) {
    const collections = swapCollectionForStorageMode("local");
    storageMode = "local";
    persistUserState(
      viewerUserState.buildUserStateFromRuntime(collectRuntimeSnapshot(), {
        existingCollections: collections,
      }),
    );
  }
  pendingGistSetup = false;
}

function activateLocalStorageMode(options = {}) {
  pendingGistSetup = false;
  if (storageMode === "gist") {
    const collections = swapCollectionForStorageMode("local");
    storageMode = "local";
    persistUserState(
      viewerUserState.buildUserStateFromRuntime(collectRuntimeSnapshot(), {
        existingCollections: collections,
      }),
    );
  }
  syncSettingsStorageMode();
  if (options.render !== false) {
    render();
  }
  if (options.render !== false && !bookDetailDialog.hidden && detailBookId) {
    openBookDetail(detailBookId, { historyMode: "none" });
  }
}

async function activateGistStorageMode(options = {}) {
  if (!viewerGistSync.isConnectedGistConfig(readGistSyncConfig())) {
    pendingGistSetup = true;
    syncSettingsStorageMode();
    return false;
  }

  pendingGistSetup = false;
  if (storageMode !== "gist") {
    const collections = swapCollectionForStorageMode("gist");
    storageMode = "gist";
    persistUserState(
      viewerUserState.buildUserStateFromRuntime(collectRuntimeSnapshot(), {
        existingCollections: collections,
      }),
    );
    await pullGistStateIfConfigured({ reRender: false });
  }
  syncSettingsStorageMode();
  if (options.render !== false) {
    render();
  }
  if (options.render !== false && !bookDetailDialog.hidden && detailBookId) {
    openBookDetail(detailBookId, { historyMode: "none" });
  }
  return true;
}

function loadUserState() {
  let state = null;
  try {
    const saved = localStorage.getItem(viewerUserState.USER_STATE_KEY);
    state = viewerUserState.parseUserState(saved);
    if (!state) {
      const legacy = readLegacyStorageSnapshot();
      state = viewerUserState.hasLegacyUserData(legacy)
        ? viewerUserState.migrateFromLegacy(legacy)
        : viewerUserState.defaultUserState();
      persistUserState(state);
    }
  } catch (_) {
    state = viewerUserState.defaultUserState();
  }

  applyRuntimeSnapshot(viewerUserState.applyUserStateToRuntime(state));
  enforceStorageModeConsistency();
  syncSettingsHighlightCheckboxes();
  updateHeaderFiltersState();
  updateViewModeState();
  syncSettingsStorageMode();
}

async function loadUserStateAsync() {
  loadUserState();
  await pullGistStateIfConfigured({ reRender: false });
  try {
    await maybeCreateGistSnapshot();
  } catch (_) {
    /* Backup failures must not block startup. */
  }
}

function saveUserState() {
  if (
    storageMode === "gist" &&
    !viewerGistSync.isConnectedGistConfig(readGistSyncConfig())
  ) {
    storageMode = "local";
    pendingGistSetup = false;
  }
  persistUserState(buildStateForPersistence());
  scheduleGistPush();
}

async function importCollectionFromCsvText(csvText) {
  const rows = viewerCollectionImport.parseCollectionCsv(csvText);
  if (!rows.length) {
    throw new Error("No collection rows found in that file.");
  }

  const result = viewerCollectionImport.matchCollectionImportEntries(
    getActiveBooks(),
    rows,
  );
  applyBookStatuses(
    viewerBookStatus.replaceStatusesFromImport(
      bookStatuses,
      result.entries,
      new Date().toISOString(),
    ),
  );
  saveUserState();

  let syncedToGist = false;
  if (isGistStorageActive()) {
    const config = readGistSyncConfig();
    await pushGistState(config, buildStateForPersistence());
    syncedToGist = true;
      updateGistSyncStatus("Synced to GitHub Gist.");
  }

  return {
    rowCount: rows.length,
    matchedCount: result.entries.length,
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
  const listMode = gridViewMode === "list";
  document.body.classList.toggle("view-mode-list", listMode);
  if (!viewModeToggle) {
    return;
  }
  const listPreference = gridViewMode === "list";
  viewModeToggle.setAttribute("aria-pressed", String(listPreference));
  viewModeToggle.setAttribute(
    "aria-label",
    listPreference ? "Switch to grid view" : "Switch to list view",
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
  syncWantMembership(id, !wantIds.has(id));
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

  applyBookStatuses(
    viewerBookStatus.cycleCollectionStatus(
      bookStatuses,
      id,
      new Date().toISOString(),
    ),
  );

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

let backupSnapshotChain = Promise.resolve();

function isGistSyncConnected() {
  return (
    storageMode === "gist" &&
    viewerGistSync.isConnectedGistConfig(readGistSyncConfig())
  );
}

function backupUserStateLocally(state) {
  try {
    localStorage.setItem(
      viewerUserState.USER_STATE_BACKUP_KEY,
      viewerUserState.serializeUserState(state),
    );
  } catch (_) {
    // localStorage unavailable
  }
}

function clearStoredBackupGistId() {
  const config = readGistSyncConfig();
  if (!config?.backupGistId) {
    return;
  }
  writeGistSyncConfig({ ...config, backupGistId: "" });
}

async function gistApiRequest(path, options = {}) {
  const { method = "GET", token, body } = options;
  const response = await fetch(`${viewerGistSync.GITHUB_API}${path}`, {
    method,
    headers: {
      ...githubHeaders(token),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!response.ok) {
    const error = new Error(`GitHub API failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

async function resolveBackupGistId() {
  const config = readGistSyncConfig();
  if (!config?.token) {
    return null;
  }
  if (config.backupGistId) {
    return config.backupGistId;
  }
  const gists = await listUserGists(config.token);
  const backupGistId = viewerGistBackup.findBackupGistId(gists, config.gistId);
  if (backupGistId) {
    writeGistSyncConfig({ ...config, backupGistId });
  }
  return backupGistId || null;
}

async function fetchBackupGistBody(backupGistId) {
  const config = readGistSyncConfig();
  try {
    return await gistApiRequest(`/gists/${backupGistId}`, {
      token: config.token,
    });
  } catch (error) {
    if (error?.status === 404) {
      clearStoredBackupGistId();
      return null;
    }
    throw error;
  }
}

async function readBackupPayload(backupGistId) {
  const body = await fetchBackupGistBody(backupGistId);
  if (!body) {
    return viewerGistBackup.emptyBackupPayload();
  }
  const content = viewerGistBackup.extractBackupContent(body);
  return content
    ? viewerGistBackup.parseBackupPayload(content)
    : viewerGistBackup.emptyBackupPayload();
}

async function writeBackupPayload(backupGistId, payload) {
  const config = readGistSyncConfig();
  const contentJson = viewerGistBackup.serializeBackupPayload(payload);
  try {
    await gistApiRequest(`/gists/${backupGistId}`, {
      method: "PATCH",
      token: config.token,
      body: viewerGistBackup.buildBackupGistUpdatePayload(contentJson),
    });
  } catch (error) {
    if (error?.status === 404) {
      clearStoredBackupGistId();
      await createBackupGist(payload);
      return;
    }
    throw error;
  }
}

async function createBackupGist(payload) {
  const config = readGistSyncConfig();
  const contentJson = viewerGistBackup.serializeBackupPayload(payload);
  const created = await gistApiRequest("/gists", {
    method: "POST",
    token: config.token,
    body: viewerGistBackup.buildBackupGistCreatePayload(contentJson),
  });
  const backupGistId = created?.id || "";
  if (!backupGistId) {
    throw new Error("GitHub did not return a backup Gist id.");
  }
  writeGistSyncConfig({ ...config, backupGistId });
  return backupGistId;
}

async function createGistSnapshotNow() {
  const now = Date.now();
  const atIso = new Date(now).toISOString();
  const stateObject = viewerUserState.parseUserState(
    viewerUserState.serializeUserState(buildStateForPersistence()),
  );
  if (!stateObject) {
    return { ok: false, reason: "state" };
  }

  let backupGistId = await resolveBackupGistId();
  let payload = viewerGistBackup.emptyBackupPayload();

  if (backupGistId) {
    const body = await fetchBackupGistBody(backupGistId);
    if (!body) {
      backupGistId = null;
    } else {
      payload = viewerGistBackup.parseBackupPayload(
        viewerGistBackup.extractBackupContent(body) || "",
      );
      if (!viewerGistBackup.shouldCreateSnapshot(payload.snapshots, now)) {
        return { ok: true, skipped: true };
      }
    }
  }

  if (!backupGistId && !viewerGistBackup.shouldCreateSnapshot([], now)) {
    return { ok: true, skipped: true };
  }

  const nextPayload = viewerGistBackup.appendSnapshot(
    payload,
    stateObject,
    atIso,
  );

  if (!backupGistId) {
    await createBackupGist(nextPayload);
    return { ok: true, created: true };
  }

  await writeBackupPayload(backupGistId, nextPayload);
  return { ok: true, created: true };
}

async function maybeCreateGistSnapshot() {
  if (!isGistSyncConnected()) {
    return { ok: false, reason: "disabled" };
  }
  backupSnapshotChain = backupSnapshotChain.then(() => createGistSnapshotNow());
  return backupSnapshotChain;
}

async function listGistSnapshots() {
  if (!isGistSyncConnected()) {
    return [];
  }
  const backupGistId = await resolveBackupGistId();
  if (!backupGistId) {
    return [];
  }
  const payload = await readBackupPayload(backupGistId);
  return viewerGistBackup.snapshotListEntries(payload);
}

async function restoreGistSnapshot(at) {
  if (!isGistSyncConnected()) {
    return { ok: false, error: "Gist sync is not connected." };
  }
  if (!Date.parse(String(at || ""))) {
    return { ok: false, error: "That snapshot is not valid." };
  }

  const backupGistId = await resolveBackupGistId();
  if (!backupGistId) {
    return { ok: false, error: "No backup Gist found." };
  }

  const payload = await readBackupPayload(backupGistId);
  const entry = viewerGistBackup.findSnapshotByAt(payload, at);
  if (!entry) {
    return { ok: false, error: "Could not find that snapshot." };
  }
  const parsed = viewerUserState.parseUserState(entry.state);
  if (!parsed) {
    return { ok: false, error: "Could not read that snapshot." };
  }

  const current = buildStateForPersistence();
  backupUserStateLocally(current);

  const config = readGistSyncConfig();
  let remoteState = null;
  try {
    remoteState = await fetchGistState(config);
  } catch (_) {
    // A restore still proceeds when the remote doc cannot be read.
  }

  // A restore is a deliberate replacement, so every book is re-stamped now and
  // anything the snapshot never had gets a tombstone. Without fresh stamps the
  // next merge from another device would simply resurrect what was restored away.
  const baseline = viewerUserState.mergeUserState(current, remoteState) || current;
  const restoredAt = new Date().toISOString();
  const restored = viewerUserState.withActiveSlotMirrors(
    { ...parsed, updatedAt: restoredAt },
    {
      local: current.collections.local,
      gist: viewerUserState.buildCollectionSlot(
        viewerBookStatus.supersedeStatusMap(
          baseline.collections.gist.statuses,
          parsed.collections.gist.statuses,
          restoredAt,
        ),
        parsed.collections.gist.wantOrderIds,
      ),
    },
    "gist",
  );

  persistUserState(restored);
  applyRuntimeSnapshot(viewerUserState.applyUserStateToRuntime(restored));
  storageMode = "gist";
  pendingGistSetup = false;
  syncSettingsStorageMode();
  invalidateSortedCache();

  await pushGistState(config, restored, { authoritative: true });
  updateGistSyncStatus("Synced to GitHub Gist.");

  return { ok: true };
}
