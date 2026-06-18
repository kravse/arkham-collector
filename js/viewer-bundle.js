(function () {
  "use strict";

/* Configuration, DOM references, and mutable state */

const books = applyBookEdits(window.BOOKS || [], window.BOOK_EDITS || {});
const grid = document.getElementById("grid");
const stats = document.getElementById("stats");
const searchInput = document.getElementById("search");
const searchClearBtn = document.getElementById("search-clear");
const viewModeToggle = document.getElementById("view-mode-toggle");
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
const coverLightbox = document.getElementById("cover-lightbox");
const coverLightboxImg = document.getElementById("cover-lightbox-img");
const settingsBtn = document.getElementById("settings-btn");
const settingsDialog = document.getElementById("settings-dialog");
const settingsCloseBtn = document.getElementById("settings-close");
const settingsTabAbout = document.getElementById("settings-tab-about");
const settingsTabSettings = document.getElementById("settings-tab-settings");
const settingsPanelAbout = document.getElementById("settings-panel-about");
const settingsPanelSettings = document.getElementById("settings-panel-settings");
const storageModeLocalInput = document.getElementById("storage-mode-local");
const storageModeGistInput = document.getElementById("storage-mode-gist");
const gistSyncPanel = document.getElementById("gist-sync-panel");
const gistSyncSaved = document.getElementById("gist-sync-saved");
const gistConnectForm = document.getElementById("gist-sync-connect-form");
const gistTokenInput = document.getElementById("gist-token-input");
const gistConnectBtn = document.getElementById("gist-connect-btn");
const gistClearBtn = document.getElementById("gist-clear-btn");
const gistSyncStatus = document.getElementById("gist-sync-status");
const exportCollectionBtn = document.getElementById("export-collection-btn");
const importCollectionBtn = document.getElementById("import-collection-btn");
const importCollectionInput = document.getElementById("import-collection-input");
const importCollectionStatus = document.getElementById("import-collection-status");
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
const SORT_MODES = new Set([
  "date-desc",
  "date-asc",
  "title-asc",
  "title-desc",
]);
let serveEnabled = false;
let serveEditDeltas = false;
let editingBookId = null;
let collectionFilterMode = null;
let hiddenOnly = false;
let mycroftFilterMode = null;
let wantOnly = false;
let wantIds = new Set();
let collectionIds = new Set();
let orderedIds = new Set();
let storageMode = "local";
let pendingGistSetup = false;
let headerFiltersExpanded = true;
let gridViewMode = "cards";
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
  if (bookOrderBtn) {
    bookOrderBtn.hidden = !viewerMode.shouldShowBookOrderButton(serveEnabled);
  }
}

function activeCollectionIds() {
  return collectionIds;
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
  return highlightCollection || collectionFilterMode != null;
}

function isGistStorageActive() {
  return (
    storageMode === "gist" &&
    viewerGistSync.isConnectedGistConfig(readGistSyncConfig())
  );
}

function gistSettingsPanelVisible() {
  return isGistStorageActive() || pendingGistSetup;
}

function syncSettingsStorageMode() {
  if (storageModeLocalInput) {
    storageModeLocalInput.checked = storageMode === "local" && !pendingGistSetup;
  }
  if (storageModeGistInput) {
    storageModeGistInput.checked = storageMode === "gist" || pendingGistSetup;
  }
  if (gistSyncPanel) {
    gistSyncPanel.hidden = !gistSettingsPanelVisible();
  }
  syncSettingsHighlightCheckboxes();
  syncGistConnectUi();
  refreshGistSyncStatus();
}

function hasSavedGistCredentials() {
  return viewerGistSync.isConnectedGistConfig(readGistSyncConfig());
}

function syncGistConnectUi() {
  const connected = isGistStorageActive();
  if (gistSyncSaved) {
    gistSyncSaved.hidden = !connected;
  }
  if (gistConnectForm) {
    gistConnectForm.hidden = connected;
  }
}

function refreshGistSyncStatus() {
  if (!gistSyncStatus) {
    return;
  }
  if (!gistSettingsPanelVisible()) {
    gistSyncStatus.textContent = "";
    gistSyncStatus.classList.remove("settings-gist-status--error");
    return;
  }
  if (isGistStorageActive()) {
    gistSyncStatus.textContent = "";
    gistSyncStatus.classList.remove("settings-gist-status--error");
    return;
  }
  gistSyncStatus.textContent =
    "Paste a GitHub token and click Connect.";
  gistSyncStatus.classList.remove("settings-gist-status--error");
}

function updateGistSyncStatus(message, isError) {
  if (!gistSyncStatus) {
    return;
  }
  gistSyncStatus.textContent = message;
  gistSyncStatus.classList.toggle("settings-gist-status--error", Boolean(isError));
}

function updateImportCollectionStatus(message, isError) {
  if (!importCollectionStatus) {
    return;
  }
  importCollectionStatus.hidden = !message;
  importCollectionStatus.textContent = message;
  importCollectionStatus.classList.toggle(
    "settings-gist-status--error",
    Boolean(isError),
  );
}


/* Generated from scripts/lib/viewer-user-state.js — run npm run bundle-viewer */

const viewerUserState = (function () {
  const USER_STATE_KEY = "arkham-user-state";
  const USER_STATE_VERSION = 2;
  const USER_STATE_VERSION_V1 = 1;
  
  const LEGACY_KEYS = {
    collection: "arkham-collection",
    sampleCollection: "arkham-sample-collection",
    ordered: "arkham-collection-ordered",
    want: "arkham-want-list",
    collectionSource: "arkham-collection-source",
    sort: "arkham-sort",
    viewMode: "arkham-view-mode",
    headerFiltersExpanded: "arkham-header-filters-expanded",
    highlightWants: "arkham-highlight-wants",
    highlightCollection: "arkham-highlight-collection",
    showMagazines: "arkham-show-magazines",
  };
  
  const SORT_MODES = new Set([
    "date-desc",
    "date-asc",
    "title-asc",
    "title-desc",
  ]);
  
  const SORT_LEGACY = { default: "date-asc", title: "title-asc" };
  
  function defaultUserState() {
    return {
      version: USER_STATE_VERSION,
      updatedAt: null,
      storageMode: "local",
      collectionIds: [],
      orderedIds: [],
      collections: defaultCollections(),
      wantIds: [],
      preferences: {
        sort: "date-asc",
        viewMode: "cards",
        headerFiltersExpanded: true,
        highlightWants: true,
        highlightCollection: true,
        showMagazines: false,
      },
    };
  }
  
  function emptyCollectionSlot() {
    return { collectionIds: [], orderedIds: [] };
  }
  
  function defaultCollections() {
    return {
      local: emptyCollectionSlot(),
      gist: emptyCollectionSlot(),
    };
  }
  
  function normalizeCollectionSlot(raw, fallback = emptyCollectionSlot()) {
    if (!raw || typeof raw !== "object") {
      return {
        collectionIds: [...fallback.collectionIds],
        orderedIds: [...fallback.orderedIds],
      };
    }
    return {
      collectionIds: normalizeIdArray(raw.collectionIds),
      orderedIds: normalizeIdArray(raw.orderedIds),
    };
  }
  
  function normalizeCollections(raw, topLevelIds = [], topLevelOrdered = []) {
    const fallback = {
      collectionIds: normalizeIdArray(topLevelIds),
      orderedIds: normalizeIdArray(topLevelOrdered),
    };
    if (!raw || typeof raw !== "object") {
      return {
        local: normalizeCollectionSlot(null, fallback),
        gist: normalizeCollectionSlot(null, fallback),
      };
    }
    return {
      local: normalizeCollectionSlot(raw.local, fallback),
      gist: normalizeCollectionSlot(raw.gist, fallback),
    };
  }
  
  function activeCollectionSlot(state) {
    const mode = normalizeStorageMode(state.storageMode);
    const collections = normalizeCollections(
      state.collections,
      state.collectionIds,
      state.orderedIds,
    );
    return collections[mode];
  }
  
  function localCollectionSlotFromPersisted(localPersisted) {
    return normalizeCollectionSlot(localPersisted?.collections?.local, {
      collectionIds: localPersisted?.collectionIds || [],
      orderedIds: localPersisted?.orderedIds || [],
    });
  }
  
  function buildEmptyGistConnectState(localPersisted) {
    const base = defaultUserState();
    const localSlot = localCollectionSlotFromPersisted(localPersisted);
    return {
      ...base,
      updatedAt: new Date().toISOString(),
      storageMode: "gist",
      collectionIds: [],
      orderedIds: [],
      wantIds: [],
      collections: {
        local: localSlot,
        gist: emptyCollectionSlot(),
      },
    };
  }
  
  function adoptRemoteGistState(remoteState, localPersisted) {
    const parsed =
      typeof remoteState === "string"
        ? parseUserState(remoteState)
        : parseUserState(serializeUserState(remoteState));
    if (!parsed) {
      return null;
    }
    const localSlot = localCollectionSlotFromPersisted(localPersisted);
    const gistSlot = activeCollectionSlot({
      ...parsed,
      storageMode: "gist",
    });
    return {
      ...parsed,
      storageMode: "gist",
      collectionIds: gistSlot.collectionIds,
      orderedIds: gistSlot.orderedIds,
      collections: {
        local: localSlot,
        gist: {
          collectionIds: gistSlot.collectionIds,
          orderedIds: gistSlot.orderedIds,
        },
      },
    };
  }
  
  function normalizeIdArray(raw) {
    if (raw == null || raw === "") {
      return [];
    }
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!Array.isArray(parsed)) {
        return [];
      }
      const ids = [
        ...new Set(
          parsed
            .filter((id) => id != null && id !== "")
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && Number.isInteger(id)),
        ),
      ];
      ids.sort((a, b) => a - b);
      return ids;
    } catch (_) {
      return [];
    }
  }
  
  function normalizeSort(raw, fallback = "date-asc") {
    if (raw && SORT_MODES.has(raw)) {
      return raw;
    }
    if (raw && SORT_LEGACY[raw]) {
      return SORT_LEGACY[raw];
    }
    return fallback;
  }
  
  function normalizeBoolFlag(raw, defaultVal) {
    if (raw === "0") {
      return false;
    }
    if (raw === "1") {
      return true;
    }
    return defaultVal;
  }
  
  function normalizeStorageMode(raw) {
    if (raw === "gist") {
      return "gist";
    }
    return "local";
  }
  
  function normalizeViewMode(raw, fallback = "cards") {
    if (raw === "list") {
      return "list";
    }
    return fallback;
  }
  
  function normalizePreferences(raw, base) {
    return {
      sort: normalizeSort(raw?.sort, base.preferences.sort),
      viewMode: normalizeViewMode(raw?.viewMode, base.preferences.viewMode),
      headerFiltersExpanded:
        typeof raw?.headerFiltersExpanded === "boolean"
          ? raw.headerFiltersExpanded
          : base.preferences.headerFiltersExpanded,
      highlightWants:
        typeof raw?.highlightWants === "boolean"
          ? raw.highlightWants
          : base.preferences.highlightWants,
      highlightCollection:
        typeof raw?.highlightCollection === "boolean"
          ? raw.highlightCollection
          : base.preferences.highlightCollection,
      showMagazines:
        typeof raw?.showMagazines === "boolean"
          ? raw.showMagazines
          : base.preferences.showMagazines,
    };
  }
  
  function legacyStorageModeFromSource(sourceRaw) {
    return "local";
  }
  
  function legacyCollectionIds(snapshot) {
    return normalizeIdArray(snapshot[LEGACY_KEYS.collection]);
  }
  
  function migrateFromLegacy(legacy) {
    const base = defaultUserState();
    const snapshot = legacy || {};
  
    return {
      version: USER_STATE_VERSION,
      updatedAt: null,
      storageMode: legacyStorageModeFromSource(
        snapshot[LEGACY_KEYS.collectionSource],
      ),
      collectionIds: legacyCollectionIds(snapshot),
      orderedIds: normalizeIdArray(snapshot[LEGACY_KEYS.ordered]),
      collections: normalizeCollections(
        null,
        legacyCollectionIds(snapshot),
        normalizeIdArray(snapshot[LEGACY_KEYS.ordered]),
      ),
      wantIds: normalizeIdArray(snapshot[LEGACY_KEYS.want]),
      preferences: {
        sort: normalizeSort(
          snapshot[LEGACY_KEYS.sort],
          base.preferences.sort,
        ),
        viewMode: normalizeViewMode(
          snapshot[LEGACY_KEYS.viewMode],
          base.preferences.viewMode,
        ),
        headerFiltersExpanded: normalizeBoolFlag(
          snapshot[LEGACY_KEYS.headerFiltersExpanded],
          base.preferences.headerFiltersExpanded,
        ),
        highlightWants: normalizeBoolFlag(
          snapshot[LEGACY_KEYS.highlightWants],
          base.preferences.highlightWants,
        ),
        highlightCollection: normalizeBoolFlag(
          snapshot[LEGACY_KEYS.highlightCollection],
          base.preferences.highlightCollection,
        ),
        showMagazines: normalizeBoolFlag(
          snapshot[LEGACY_KEYS.showMagazines],
          base.preferences.showMagazines,
        ),
      },
    };
  }
  
  function migrateV1ToV2(v1) {
    const base = defaultUserState();
    const collectionIds = normalizeIdArray(v1.ownCollectionIds);
    const orderedIds = normalizeIdArray(v1.orderedIds);
    return {
      version: USER_STATE_VERSION,
      updatedAt: v1.updatedAt || null,
      storageMode: "local",
      collectionIds,
      orderedIds,
      collections: normalizeCollections(null, collectionIds, orderedIds),
      wantIds: normalizeIdArray(v1.wantIds),
      preferences: normalizePreferences(v1.preferences, base),
    };
  }
  
  function parseUserStateV1(json) {
    if (json == null || json === "") {
      return null;
    }
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      if (!parsed || parsed.version !== USER_STATE_VERSION_V1) {
        return null;
      }
  
      const base = defaultUserState();
      const sampleRaw = parsed.sampleCollectionIds;
      let sampleCollectionIds = null;
      if (sampleRaw !== null && sampleRaw !== undefined) {
        sampleCollectionIds = normalizeIdArray(sampleRaw);
      }
  
      return {
        version: USER_STATE_VERSION_V1,
        updatedAt:
          typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
        collectionSource:
          parsed.collectionSource === "own" || parsed.collectionSource === "sample"
            ? parsed.collectionSource
            : null,
        ownCollectionIds: normalizeIdArray(parsed.ownCollectionIds),
        sampleCollectionIds,
        orderedIds: normalizeIdArray(parsed.orderedIds),
        wantIds: normalizeIdArray(parsed.wantIds),
        preferences: normalizePreferences(parsed.preferences, base),
      };
    } catch (_) {
      return null;
    }
  }
  
  function parseUserStateV2(json) {
    if (json == null || json === "") {
      return null;
    }
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      if (!parsed || parsed.version !== USER_STATE_VERSION) {
        return null;
      }
  
      const base = defaultUserState();
      const collectionIds = normalizeIdArray(parsed.collectionIds);
      const orderedIds = normalizeIdArray(parsed.orderedIds);
      return {
        version: USER_STATE_VERSION,
        updatedAt:
          typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
        storageMode: normalizeStorageMode(parsed.storageMode),
        collectionIds,
        orderedIds,
        collections: normalizeCollections(
          parsed.collections,
          collectionIds,
          orderedIds,
        ),
        wantIds: normalizeIdArray(parsed.wantIds),
        preferences: normalizePreferences(parsed.preferences, base),
      };
    } catch (_) {
      return null;
    }
  }
  
  function parseUserState(json) {
    const v2 = parseUserStateV2(json);
    if (v2) {
      return v2;
    }
    const v1 = parseUserStateV1(json);
    if (v1) {
      return migrateV1ToV2(v1);
    }
    return null;
  }
  
  function buildUserStateFromRuntime(snapshot, options = {}) {
    const mode = normalizeStorageMode(snapshot.storageMode);
    const collectionIds = normalizeIdArray(snapshot.collectionIds);
    const orderedIds = normalizeIdArray(snapshot.orderedIds);
    const collections = normalizeCollections(
      options.existingCollections,
      collectionIds,
      orderedIds,
    );
    collections[mode] = { collectionIds, orderedIds };
    return {
      version: USER_STATE_VERSION,
      updatedAt: new Date().toISOString(),
      storageMode: mode,
      collectionIds,
      orderedIds,
      collections,
      wantIds: normalizeIdArray(snapshot.wantIds),
      preferences: {
        sort: normalizeSort(snapshot.sort),
        viewMode: normalizeViewMode(snapshot.viewMode),
        headerFiltersExpanded: Boolean(snapshot.headerFiltersExpanded),
        highlightWants: Boolean(snapshot.highlightWants),
        highlightCollection: Boolean(snapshot.highlightCollection),
        showMagazines: Boolean(snapshot.showMagazines),
      },
    };
  }
  
  function applyUserStateToRuntime(state) {
    const parsed = parseUserState(state) || migrateFromLegacy(null);
    const active = activeCollectionSlot(parsed);
    return {
      storageMode: parsed.storageMode,
      collectionIds: active.collectionIds,
      orderedIds: active.orderedIds,
      wantIds: parsed.wantIds,
      sort: parsed.preferences.sort,
      viewMode: parsed.preferences.viewMode,
      headerFiltersExpanded: parsed.preferences.headerFiltersExpanded,
      highlightWants: parsed.preferences.highlightWants,
      highlightCollection: parsed.preferences.highlightCollection,
      showMagazines: parsed.preferences.showMagazines,
    };
  }
  
  function serializeUserState(state) {
    return JSON.stringify(state);
  }
  return {
    USER_STATE_KEY,
    USER_STATE_VERSION,
    LEGACY_KEYS,
    defaultUserState,
    emptyCollectionSlot,
    normalizeCollections,
    normalizeCollectionSlot,
    activeCollectionSlot,
    localCollectionSlotFromPersisted,
    buildEmptyGistConnectState,
    adoptRemoteGistState,
    normalizeIdArray,
    normalizeStorageMode,
    migrateFromLegacy,
    migrateV1ToV2,
    parseUserState,
    buildUserStateFromRuntime,
    applyUserStateToRuntime,
    serializeUserState,
  };
})();


/* Generated from scripts/lib/viewer-gist-sync.js — run npm run bundle-viewer */

const viewerGistSync = (function () {
  const GIST_SYNC_KEY = "arkham-gist-sync";
  const GIST_STATE_FILENAME = "state.json";
  const GITHUB_API = "https://api.github.com";
  
  function parseGistSyncConfig(json) {
    if (json == null || json === "") {
      return null;
    }
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      const token = typeof parsed.token === "string" ? parsed.token.trim() : "";
      const gistId = typeof parsed.gistId === "string" ? parsed.gistId.trim() : "";
      if (!token) {
        return null;
      }
      return { token, gistId };
    } catch (_) {
      return null;
    }
  }
  
  function serializeGistSyncConfig(config) {
    return JSON.stringify({
      token: config.token,
      gistId: config.gistId || "",
    });
  }
  
  function isConnectedGistConfig(config) {
    return Boolean(config?.token && config?.gistId);
  }
  
  function mergeUserStateByUpdatedAt(localState, remoteState) {
    if (!remoteState) {
      return localState;
    }
    if (!localState) {
      return remoteState;
    }
    const localTime = Date.parse(localState.updatedAt || "");
    const remoteTime = Date.parse(remoteState.updatedAt || "");
    if (!Number.isFinite(localTime) && Number.isFinite(remoteTime)) {
      return remoteState;
    }
    if (Number.isFinite(localTime) && !Number.isFinite(remoteTime)) {
      return localState;
    }
    if (remoteTime > localTime) {
      return remoteState;
    }
    return localState;
  }
  
  function mergeGistUserState(localState, remoteState, helpers) {
    const merged = mergeUserStateByUpdatedAt(localState, remoteState);
    if (!merged || !localState || !helpers) {
      return merged;
    }
    const {
      normalizeCollections,
      normalizeCollectionSlot,
      emptyCollectionSlot,
    } = helpers;
    const localSlot = normalizeCollectionSlot(
      localState.collections?.local,
      {
        collectionIds: localState.collectionIds || [],
        orderedIds: localState.orderedIds || [],
      },
    );
    merged.collections = normalizeCollections(
      merged.collections,
      merged.collectionIds,
      merged.orderedIds,
    );
    merged.collections.local = localSlot;
    if (!merged.collections.gist) {
      merged.collections.gist = emptyCollectionSlot();
    }
    return merged;
  }
  
  function extractStateJsonFromGistResponse(body) {
    if (!body || typeof body !== "object") {
      return null;
    }
    const file = body.files?.[GIST_STATE_FILENAME];
    if (!file || typeof file.content !== "string") {
      return null;
    }
    return file.content;
  }
  
  function findArkhamGistId(gists, stateFilename = GIST_STATE_FILENAME) {
    if (!Array.isArray(gists)) {
      return null;
    }
    const match = gists.find(
      (gist) => gist?.files && gist.files[stateFilename],
    );
    return match?.id || null;
  }
  
  function buildGistCreatePayload(stateJson) {
    return {
      description: "Arkham Collector sync",
      public: false,
      files: {
        [GIST_STATE_FILENAME]: {
          content: stateJson,
        },
      },
    };
  }
  
  function buildGistUpdatePayload(stateJson) {
    return {
      files: {
        [GIST_STATE_FILENAME]: {
          content: stateJson,
        },
      },
    };
  }
  return {
    GIST_SYNC_KEY,
    GIST_STATE_FILENAME,
    GITHUB_API,
    parseGistSyncConfig,
    serializeGistSyncConfig,
    isConnectedGistConfig,
    mergeUserStateByUpdatedAt,
    mergeGistUserState,
    extractStateJsonFromGistResponse,
    findArkhamGistId,
    buildGistCreatePayload,
    buildGistUpdatePayload,
  };
})();


/* Generated from scripts/lib/viewer-collection-import.js — run npm run bundle-viewer */

const viewerCollectionImport = (function () {
  function parseYear(value) {
    if (!value) {
      return null;
    }
    const match = String(value).match(/\d{4}/);
    return match ? match[0] : null;
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
  
  function normalizeForMatch(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[''""]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }
  
  function titlesMatch(a, b) {
    const left = normalizeForMatch(a);
    const right = normalizeForMatch(b);
    if (!left || !right) {
      return false;
    }
    return left === right || left.includes(right) || right.includes(left);
  }
  
  function parseCollectionCsv(csvText) {
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
        if (!item.title || !item.year) {
          return false;
        }
        if (item.title.toUpperCase() === "ARKHAM HOUSE") {
          return false;
        }
        if (/^\d+ on order/i.test(item.title)) {
          return false;
        }
        return true;
      });
  }
  
  function bookTitleCandidates(book) {
    return [book.title, book.listTitle].filter(Boolean);
  }
  
  function rowMatchesBook(row, book) {
    const titles = bookTitleCandidates(book);
    if (!titles.some((candidate) => titlesMatch(candidate, row.title))) {
      return false;
    }
    if (row.year) {
      const bookYear = parseYear(book.publicationDate);
      if (bookYear && bookYear !== row.year) {
        return false;
      }
    }
    return true;
  }
  
  function matchBookIdForRow(books, row) {
    const matches = books.filter((book) => rowMatchesBook(row, book));
    if (matches.length === 1) {
      return matches[0].id;
    }
    if (row.year && matches.length > 1) {
      const exact = matches.filter(
        (book) => parseYear(book.publicationDate) === row.year,
      );
      if (exact.length === 1) {
        return exact[0].id;
      }
    }
    return null;
  }
  
  function matchCollectionImportRows(books, rows) {
    const matchedIds = [];
    const unmatchedRows = [];
  
    for (const row of rows) {
      const id = matchBookIdForRow(books, row);
      if (id == null) {
        unmatchedRows.push(row);
      } else {
        matchedIds.push(id);
      }
    }
  
    return {
      matchedIds: [...new Set(matchedIds)],
      unmatchedRows,
    };
  }
  return {
    parseCollectionCsv,
    matchCollectionImportRows,
    matchBookIdForRow,
  };
})();


/* Generated from scripts/lib/viewer-covers.js — run npm run bundle-viewer */

const viewerCovers = (function () {
  function appendCoverCacheKey(url, cacheKey) {
    if (!cacheKey) {
      return url;
    }
    return `${url}?v=${encodeURIComponent(cacheKey)}`;
  }
  
  function getCoverPath(book, variant = "card") {
    if (!book) {
      return null;
    }
    if (variant === "lightbox") {
      return book.coverImageDetailFile || book.coverImageFile || null;
    }
    return book.coverImageFile || null;
  }
  return {
    appendCoverCacheKey,
    getCoverPath,
  };
})();


/* Generated from scripts/lib/viewer-mode.js — run npm run bundle-viewer */

const viewerMode = (function () {
  const SERVE_ONLY_UI_KEYS = [
    "bookOrderButton",
    "showHiddenToggle",
    "hiddenStatFilter",
    "cardEditButton",
    "detailEditButton",
  ];
  
  function resolveServeEnabled({ readOnly, healthCheckOk = false }) {
    if (readOnly === true) {
      return false;
    }
    return healthCheckOk === true;
  }
  
  function shouldShowBookOrderButton(serveEnabled) {
    return serveEnabled === true;
  }
  
  function shouldShowShowHiddenToggle(serveEnabled) {
    return serveEnabled === true;
  }
  
  function shouldShowHiddenStatFilter(serveEnabled, hiddenCount) {
    return serveEnabled === true && hiddenCount > 0;
  }
  
  function shouldRenderCardEditButton(serveEnabled) {
    return serveEnabled === true;
  }
  
  function shouldRenderDetailEditButton({ readOnly, protocol }) {
    return readOnly !== true && protocol !== "file:";
  }
  
  function serveOnlyUiVisibility(options = {}) {
    const {
      readOnly = false,
      serveEnabled = false,
      hiddenCount = 0,
      protocol = "https:",
    } = options;
    const effectiveServeEnabled = resolveServeEnabled({
      readOnly,
      healthCheckOk: serveEnabled,
    });
  
    return {
      bookOrderButton: shouldShowBookOrderButton(effectiveServeEnabled),
      showHiddenToggle: shouldShowShowHiddenToggle(effectiveServeEnabled),
      hiddenStatFilter: shouldShowHiddenStatFilter(
        effectiveServeEnabled,
        hiddenCount,
      ),
      cardEditButton: shouldRenderCardEditButton(effectiveServeEnabled),
      detailEditButton: shouldRenderDetailEditButton({ readOnly, protocol }),
    };
  }
  
  function buildUiVisibility(options = {}) {
    return serveOnlyUiVisibility({
      readOnly: true,
      serveEnabled: false,
      ...options,
    });
  }
  
  function serveUiVisibility(options = {}) {
    return serveOnlyUiVisibility({
      readOnly: false,
      serveEnabled: true,
      ...options,
    });
  }
  return {
    resolveServeEnabled,
    shouldShowBookOrderButton,
    shouldShowShowHiddenToggle,
    shouldShowHiddenStatFilter,
    shouldRenderCardEditButton,
    shouldRenderDetailEditButton,
    serveOnlyUiVisibility,
    buildUiVisibility,
    serveUiVisibility,
  };
})();


/* Generated from scripts/lib/viewer-filters.js — run npm run bundle-viewer */

const viewerFilters = (function () {
  const SAMPLER_ISSUE_TITLE_RE = /^The Arkham Sampler \(Vol\. [IV]+, No\. \d+\)$/;
  const COLLECTOR_ISSUE_TITLE_RE = /^The Arkham Collector \(No\. \d+\)$/;
  
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
  
  function matchesSearch(book, query) {
    if (!query) {
      return true;
    }
    return (book._searchHaystack || "").includes(String(query).toLowerCase());
  }
  
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
  
  function passesHiddenVisibility(book, { hiddenOnly, showHidden }) {
    return hiddenOnly ? book.hidden : showHidden || !book.hidden;
  }
  
  function passesBookVisibility(book, { hiddenOnly, showHidden, showMagazines }) {
    if (!passesHiddenVisibility(book, { hiddenOnly, showHidden })) {
      return false;
    }
    if (isMagazineIssue(book) && !showMagazines) {
      return false;
    }
    return true;
  }
  
  function passesMycroftImprintFilter(book, mycroftFilterMode) {
    if (mycroftFilterMode === "only") {
      return book.imprint === "mycroft_moran";
    }
    if (mycroftFilterMode === "hidden") {
      return book.imprint !== "mycroft_moran";
    }
    return true;
  }
  
  function isCollected(book, collectedIds) {
    return collectedIds.has(book.id);
  }
  
  function isOrdered(book, collectedIds, orderedIds) {
    return orderedIds.has(book.id) && !isCollected(book, collectedIds);
  }
  
  function isInCollection(book, collectedIds, orderedIds) {
    return isCollected(book, collectedIds) || isOrdered(book, collectedIds, orderedIds);
  }
  
  function passesCollectionFilter(
    book,
    collectionFilterMode,
    collectedIds,
    orderedIds,
  ) {
    if (collectionFilterMode === "collection") {
      return isInCollection(book, collectedIds, orderedIds);
    }
    if (collectionFilterMode === "ordered") {
      return isOrdered(book, collectedIds, orderedIds);
    }
    return true;
  }
  
  function passesWantFilter(book, wantOnly, wantIds) {
    return !wantOnly || wantIds.has(book.id);
  }
  
  function filterVisibleBooks(books, options) {
    const {
      hiddenOnly,
      showHidden,
      showMagazines,
      mycroftFilterMode,
      collectionFilterMode,
      wantOnly,
      collectedIds,
      orderedIds,
      wantIds,
      searchQuery = "",
    } = options;
  
    return books.filter(
      (book) =>
        passesBookVisibility(book, { hiddenOnly, showHidden, showMagazines }) &&
        passesMycroftImprintFilter(book, mycroftFilterMode) &&
        passesCollectionFilter(
          book,
          collectionFilterMode,
          collectedIds,
          orderedIds,
        ) &&
        passesWantFilter(book, wantOnly, wantIds) &&
        matchesSearch(book, searchQuery),
    );
  }
  
  function cycleMycroftFilter(mycroftFilterMode) {
    if (mycroftFilterMode === null) {
      return "only";
    }
    if (mycroftFilterMode === "only") {
      return "hidden";
    }
    return null;
  }
  
  function cycleCollectionFilter(collectionFilterMode, hasAnyOrderedBooks) {
    if (hasAnyOrderedBooks) {
      if (collectionFilterMode === null) {
        return "collection";
      }
      if (collectionFilterMode === "collection") {
        return "ordered";
      }
      return null;
    }
    return collectionFilterMode === "collection" ? null : "collection";
  }
  
  function hasAnyOrderedBooks(books, collectedIds, orderedIds, visibilityOptions) {
    return books.some(
      (book) =>
        passesBookVisibility(book, visibilityOptions) &&
        isOrdered(book, collectedIds, orderedIds),
    );
  }
  return {
    prepareBookSearchIndex,
    matchesSearch,
    isMagazineIssue,
    passesHiddenVisibility,
    passesBookVisibility,
    passesMycroftImprintFilter,
    isCollected,
    isOrdered,
    isInCollection,
    passesCollectionFilter,
    passesWantFilter,
    filterVisibleBooks,
    cycleMycroftFilter,
    cycleCollectionFilter,
    hasAnyOrderedBooks,
  };
})();


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
  if (value < 1940) {
    return String(value);
  }
  return `${Math.floor(value / 10) * 10}s`;
}

function isMagazineIssue(book) {
  return viewerFilters.isMagazineIssue(book);
}

function passesHiddenVisibility(book) {
  return viewerFilters.passesHiddenVisibility(book, {
    hiddenOnly,
    showHidden: showHiddenInput.checked,
  });
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
      showHidden: showHiddenInput.checked,
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

function cycleCollectionFilter() {
  collectionFilterMode = viewerFilters.cycleCollectionFilter(
    collectionFilterMode,
    hasAnyOrderedBooks(),
  );
}

function passesBookVisibility(book) {
  return viewerFilters.passesBookVisibility(book, {
    hiddenOnly,
    showHidden: showHiddenInput.checked,
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
  const content = viewerGistSync.extractStateJsonFromGistResponse(body);
  if (!content) {
    return null;
  }
  return viewerUserState.parseUserState(content);
}

async function findExistingArkhamGistId(token) {
  const response = await fetch(`${viewerGistSync.GITHUB_API}/gists?per_page=100`, {
    headers: githubHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  const gists = await response.json();
  return viewerGistSync.findArkhamGistId(gists);
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

  const existingConfig = readGistSyncConfig();
  let gistId = existingConfig?.gistId || "";
  if (!gistId) {
    gistId = (await findExistingArkhamGistId(trimmed)) || "";
  }

  const localPersisted = readPersistedUserState();
  let nextState = null;

  if (gistId) {
    let remoteState = null;
    try {
      remoteState = await fetchGistState({ token: trimmed, gistId });
    } catch (error) {
      if (String(error.message || "").includes("404")) {
        gistId = "";
      } else {
        throw error;
      }
    }
    if (gistId && remoteState) {
      nextState = viewerUserState.adoptRemoteGistState(
        remoteState,
        localPersisted,
      );
    }
  }

  if (!nextState) {
    nextState = viewerUserState.buildEmptyGistConnectState(localPersisted);
    if (!gistId) {
      gistId = await createGistWithState(
        { token: trimmed, gistId: "" },
        nextState,
      );
    } else {
      await pushGistState({ token: trimmed, gistId }, nextState);
    }
  }

  writeGistSyncConfig({ token: trimmed, gistId });
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
      state = viewerUserState.migrateFromLegacy(readLegacyStorageSnapshot());
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

  const result = viewerCollectionImport.matchCollectionImportRows(
    getActiveBooks(),
    rows,
  );
  collectionIds = new Set(result.matchedIds);
  orderedIds = new Set();
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


/* Generated from scripts/lib/viewer-sort.js — run npm run bundle-viewer */

const viewerSort = (function () {
  function parseYear(value) {
    if (!value) {
      return null;
    }
    const match = String(value).match(/\d{4}/);
    return match ? match[0] : null;
  }
  
  function buildBookOrderIndex(orderIds) {
    return new Map(orderIds.map((id, index) => [Number(id), index]));
  }
  
  function compareOrderTiebreak(a, b, bookOrderIndex) {
    const indexA = bookOrderIndex.has(a.id) ? bookOrderIndex.get(a.id) : a.id;
    const indexB = bookOrderIndex.has(b.id) ? bookOrderIndex.get(b.id) : b.id;
    if (indexA !== indexB) {
      return indexA - indexB;
    }
    return a.id - b.id;
  }
  
  function compareCanonical(a, b, bookOrderIndex) {
    const yearA = parseYear(a.publicationDate);
    const yearB = parseYear(b.publicationDate);
    if (yearA == null && yearB == null) {
      return compareOrderTiebreak(a, b, bookOrderIndex);
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
    return compareOrderTiebreak(a, b, bookOrderIndex);
  }
  
  function sortBooks(list, mode, bookOrderIndex) {
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
    if (mode === "date-desc") {
      return copy.sort((a, b) => {
        const yearA = parseYear(a.publicationDate);
        const yearB = parseYear(b.publicationDate);
        if (yearA == null && yearB == null) {
          return compareOrderTiebreak(a, b, bookOrderIndex);
        }
        if (yearA == null) {
          return 1;
        }
        if (yearB == null) {
          return -1;
        }
        if (yearA !== yearB) {
          return yearB - yearA;
        }
        return compareOrderTiebreak(a, b, bookOrderIndex);
      });
    }
    return copy.sort((a, b) => compareCanonical(a, b, bookOrderIndex));
  }
  return {
    compareOrderTiebreak,
    compareCanonical,
    sortBooks,
  };
})();


/* Sort, search, filters, and visible book list */

let sortedActiveCache = { mode: null, books: null };

function invalidateSortedCache() {
  sortedActiveCache.mode = null;
  sortedActiveCache.books = null;
}

function compareOrderTiebreak(a, b) {
  return viewerSort.compareOrderTiebreak(a, b, bookOrderIndex);
}

function compareCanonical(a, b) {
  return viewerSort.compareCanonical(a, b, bookOrderIndex);
}

function getSortedActiveBooks() {
  const mode = sortSelect.value;
  if (sortedActiveCache.mode === mode && sortedActiveCache.books) {
    return sortedActiveCache.books;
  }
  const sorted = sortBooks(getActiveBooks(), mode);
  sortedActiveCache.mode = mode;
  sortedActiveCache.books = sorted;
  return sorted;
}

function onSortChange() {
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
    `<button type="button" class="stat want-stat stat-toggle${wantOnly ? " active" : ""}" id="want-filter-toggle" aria-pressed="${wantOnly}">WANT</button>`,
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

function getVisibleBooks() {
  return viewerFilters.filterVisibleBooks(getSortedActiveBooks(), {
    hiddenOnly,
    showHidden: showHiddenInput.checked,
    showMagazines,
    mycroftFilterMode,
    collectionFilterMode,
    wantOnly,
    collectedIds: activeCollectionIds(),
    orderedIds,
    wantIds,
    searchQuery: searchInput.value.trim(),
  });
}


/* Covers, cards, stats, and main grid render */

const coverZoomLensIcon = `
<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
  <circle cx="8.5" cy="8.5" r="4.75" stroke="currentColor" stroke-width="1.5" />
  <path d="M12.5 12.5 16 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
</svg>`;

function renderCover(book, cacheKey, variant = "card") {
  const coverPath = viewerCovers.getCoverPath(book, variant);
  if (!coverPath) {
    return `<div class="placeholder">No cover image</div>`;
  }

  const src = viewerCovers.appendCoverCacheKey(coverPath, cacheKey);
  const title = escapeHtml(book.title || "this book");
  const imgHtml = `<img src="${src}" alt="Cover of ${title}" loading="lazy" onerror="onCoverImageError(this)">`;

  if (variant !== "detail") {
    return imgHtml;
  }

  return `
    <button
      type="button"
      class="cover-zoom-trigger"
      data-book-id="${book.id}"
      aria-label="View cover of ${title} larger"
    >
      ${imgHtml}
      <span class="cover-zoom-lens">${coverZoomLensIcon}</span>
    </button>`;
}

const editIcon = `
<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
  <path d="M12.1 3.9 16.1 7.9 7.4 16.6 3.4 12.6 12.1 3.9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M10.8 5.2 14.8 9.2" stroke="currentColor" stroke-width="1.5"/>
</svg>
    `;

function isViewingOnDevServer() {
  return viewerMode.shouldRenderDetailEditButton({
    readOnly,
    protocol: window.location.protocol,
  });
}

function renderEditButton(book, className = "edit-book-btn") {
  if (!viewerMode.shouldRenderCardEditButton(serveEnabled)) {
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
  const collected = isCollected(book);
  const ordered = isOrdered(book);
  const label = collected ? "Collection" : ordered ? "Ordered" : "Collect";
  const active = collected || ordered;
  const className = `collection-btn${active ? " active" : ""}`;

  return `
  <button
    type="button"
    class="${className}"
    data-book-id="${book.id}"
    aria-pressed="${active}"
  >${label}</button>
`;
}

function renderOwnedBadge(book) {
  const owned = getCollectionItem(book);
  if (!owned) {
    return "";
  }

  const isOrder = owned.status === "order";
  if (
    gridViewMode === "list" &&
    isCollectionFilterActive() &&
    (isOrderedFilterActive() || !isOrder)
  ) {
    return "";
  }

  const label = isOrder ? "Ordered" : "Collection";
  const className = isOrder ? "owned-badge owned-badge--ordered" : "owned-badge";

  return `<span class="${className}">${label}</span>`;
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

window.onCoverImageError = function (img) {
  img.replaceWith(
    Object.assign(document.createElement("div"), {
      className: "placeholder",
      textContent: "No cover image",
    }),
  );
};

function renderCard(book) {
  let collectionClass = "";
  if (shouldHighlightCollectionOnCards()) {
    if (isOrdered(book)) {
      collectionClass = " ordered";
    } else if (isCollected(book)) {
      collectionClass = " owned";
    }
  }
  const hiddenClass = book.hidden ? " hidden-book" : "";
  const imageHtml = renderCover(book, book.coverCacheKey);
  const coverActions = renderCoverActions(book);

  const imprintBadge = renderImprintBadge(book, "card");
  const wantBadge = renderCardWantBadge(book);
  const ownedBadge = renderOwnedBadge(book);
  const bottomRow = renderCardBottomRow(
    gridViewMode === "list" ? "" : imprintBadge,
    wantBadge,
    "",
    ownedBadge,
  );
  const listPrimaryHtml =
    gridViewMode === "list"
      ? `<div class="card-list-primary">
          <h2 class="title">${book.title || "Untitled"}</h2>
          <div class="card-list-meta">
            ${book.publicationDate ? `<div class="date">${book.publicationDate}</div>` : ""}
            ${imprintBadge}
          </div>
        </div>`
      : `<div class="card-list-primary">
          <h2 class="title">${book.title || "Untitled"}</h2>
          ${book.publicationDate ? `<div class="date">${book.publicationDate}</div>` : ""}
        </div>`;

  const hiddenBadge = book.hidden
    ? `<span class="hidden-badge">Hidden</span>`
    : "";

  const wantedClass =
    isWanted(book) && shouldHighlightWantsOnCards() ? " wanted" : "";

  return `
  <article class="card${collectionClass}${wantedClass}${hiddenClass}" data-book-id="${book.id}">
    <div class="cover-wrap">
      ${coverActions}
      ${imageHtml}
    </div>
    <div class="card-body">
      ${hiddenBadge}
      <div class="card-list-head">
        ${listPrimaryHtml}
      </div>
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
      closeBookDetail({ programmatic: true });
    }
  }

  if (collectionFilterMode === "ordered" && !hasAnyOrderedBooks()) {
    collectionFilterMode = null;
  }

  updateHeaderLogo();
  document.body.classList.toggle(
    "viewing-collection",
    isCollectionFilterActive() && !hiddenOnly && !isMycroftOnlyFilter() && !wantOnly,
  );
  document.body.classList.toggle(
    "viewing-hidden",
    hiddenOnly && !isCollectionFilterActive() && !isMycroftOnlyFilter() && !wantOnly,
  );
  document.body.classList.toggle(
    "viewing-want",
    wantOnly && !isCollectionFilterActive() && !hiddenOnly && !isMycroftOnlyFilter(),
  );
  document.body.classList.toggle("viewing-mycroft-hidden", isMycroftHiddenFilter());
  if (pageSubtitle) {
    if (isCollectionAllFilter() && hiddenOnly) {
      pageSubtitle.textContent =
        "Viewing hidden books in your collection — click a stat again to show all books";
    } else if (isCollectionAllFilter()) {
      pageSubtitle.textContent = hasAnyOrderedBooks()
        ? "Viewing your collection — click again for on-order only"
        : "Viewing your collection — click the stat again to show all books";
    } else if (isOrderedFilterActive()) {
      pageSubtitle.textContent =
        "Viewing on-order titles only — click the stat again to show all books";
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
    if (isCollectionAllFilter()) {
      message = searchInput.value.trim()
        ? "No books in your collection match your search."
        : "Your collection is empty — open a book and tap Collect to add it.";
    } else if (isOrderedFilterActive()) {
      message = searchInput.value.trim()
        ? "No on-order books match your search."
        : "No on-order books to show.";
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

function detailPageUrl(bookId) {
  return `${window.location.pathname}${window.location.search}#book/${bookId}`;
}

function detailPageBaseUrl() {
  return `${window.location.pathname}${window.location.search}`;
}

function parseDetailBookIdFromHash() {
  const match = window.location.hash.match(/^#book\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function isDetailHistoryActive() {
  return history.state?.view === "detail";
}

function pushDetailHistory(bookId) {
  history.pushState({ view: "detail", bookId }, "", detailPageUrl(bookId));
}

function replaceDetailHistory(bookId) {
  history.replaceState({ view: "detail", bookId }, "", detailPageUrl(bookId));
}

function clearDetailHistory() {
  history.replaceState(null, "", detailPageBaseUrl());
}

function openBookDetailFromLocation() {
  const bookId = parseDetailBookIdFromHash();
  if (bookId) {
    openBookDetail(bookId, { historyMode: "replace" });
  }
}

function handleDetailPopState() {
  const state = history.state;
  if (state?.view === "detail") {
    openBookDetail(state.bookId, { historyMode: "none" });
    return;
  }
  if (!bookDetailDialog.hidden) {
    closeBookDetail({ fromPopState: true });
  }
}
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
    closeBookDetail({ programmatic: true });
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
    openBookDetail(targetId, { historyMode: "replace" });
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
    serveEnabled = viewerMode.resolveServeEnabled({
      readOnly,
      healthCheckOk: response.ok,
    });
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

  showHiddenWrap.hidden = !viewerMode.shouldShowShowHiddenToggle(serveEnabled);
  updateSortControlVisibility();
  refreshDetailToolbarIfOpen();
}

function openBookDetail(bookId, options = {}) {
  let { historyMode = "push" } = options;
  const book = books.find((entry) => entry.id === bookId);
  if (!book || isDeleted(book)) {
    return;
  }

  detailBookId = bookId;

  refreshDetailToolbar(book);

  bookDetailCover.innerHTML = renderCover(book, book.coverCacheKey, "detail");
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

  if (historyMode === "push" && isDetailHistoryActive()) {
    historyMode = "replace";
  }
  if (historyMode === "push") {
    pushDetailHistory(bookId);
  } else if (historyMode === "replace") {
    replaceDetailHistory(bookId);
  }
}

function closeBookDetailUI() {
  closeCoverLightbox();
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

function closeBookDetail(options = {}) {
  const { fromPopState = false, programmatic = false } = options;

  if (fromPopState) {
    closeBookDetailUI();
    return;
  }

  if (programmatic) {
    closeBookDetailUI();
    if (isDetailHistoryActive() || parseDetailBookIdFromHash() != null) {
      clearDetailHistory();
    }
    return;
  }

  if (isDetailHistoryActive()) {
    history.back();
    return;
  }

  closeBookDetailUI();
}

function isMobileCoverLightboxViewport() {
  return window.matchMedia("(max-width: 640px)").matches;
}

function updateCoverLightboxImage(book) {
  if (!coverLightbox || !coverLightboxImg || !book) {
    return false;
  }
  const coverPath = viewerCovers.getCoverPath(book, "lightbox");
  if (!coverPath) {
    return false;
  }

  coverLightboxImg.src = viewerCovers.appendCoverCacheKey(
    coverPath,
    book.coverCacheKey,
  );
  coverLightboxImg.alt = `Cover of ${book.title || "book"}`;
  return true;
}

function openCoverLightbox(book) {
  if (!updateCoverLightboxImage(book)) {
    return;
  }
  coverLightbox.hidden = false;
  document.body.classList.add("cover-lightbox-open");
}

function navigateCoverLightbox(direction) {
  if (!coverLightbox || coverLightbox.hidden || detailBookId == null) {
    return;
  }

  const visible = getVisibleBooks();
  const index = visible.findIndex((book) => book.id === detailBookId);
  if (index < 0) {
    return;
  }

  const step = direction < 0 ? -1 : 1;
  for (let i = index + step; i >= 0 && i < visible.length; i += step) {
    const book = visible[i];
    if (!viewerCovers.getCoverPath(book, "lightbox")) {
      continue;
    }
    openBookDetail(book.id, { historyMode: "replace" });
    updateCoverLightboxImage(book);
    return;
  }
}

function closeCoverLightbox() {
  if (!coverLightbox || !coverLightboxImg) {
    return;
  }
  coverLightbox.hidden = true;
  document.body.classList.remove("cover-lightbox-open");
  coverLightboxImg.removeAttribute("src");
}

function handleCoverZoomTrigger(event) {
  const trigger = event.target.closest(".cover-zoom-trigger");
  if (!trigger) {
    return false;
  }
  event.preventDefault();
  event.stopPropagation();
  const bookId = Number(trigger.dataset.bookId);
  const book = books.find((entry) => entry.id === bookId);
  if (book) {
    openCoverLightbox(book);
  }
  return true;
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

function selectSettingsTab(tab) {
  const aboutActive = tab === "about";
  settingsTabAbout.setAttribute("aria-selected", aboutActive ? "true" : "false");
  settingsTabSettings.setAttribute("aria-selected", aboutActive ? "false" : "true");
  settingsTabAbout.tabIndex = aboutActive ? 0 : -1;
  settingsTabSettings.tabIndex = aboutActive ? -1 : 0;
  settingsPanelAbout.hidden = !aboutActive;
  settingsPanelSettings.hidden = aboutActive;
}

function openSettingsDialog() {
  pendingGistSetup = false;
  syncSettingsStorageMode();
  selectSettingsTab("about");
  settingsDialog.hidden = false;
  settingsBtn.setAttribute("aria-expanded", "true");
  settingsCloseBtn.focus();
}

function closeSettingsDialog() {
  if (!viewerGistSync.isConnectedGistConfig(readGistSyncConfig())) {
    activateLocalStorageMode({ render: false });
  } else {
    pendingGistSetup = false;
    syncSettingsStorageMode();
  }
  settingsDialog.hidden = true;
  settingsBtn.setAttribute("aria-expanded", "false");
}

async function onStorageModeChange(next) {
  if (next !== "local") {
    return;
  }
  activateLocalStorageMode();
}

async function onGistSetupSelected() {
  if (viewerGistSync.isConnectedGistConfig(readGistSyncConfig())) {
    await activateGistStorageMode();
    return;
  }
  pendingGistSetup = true;
  syncSettingsStorageMode();
  if (gistTokenInput) {
    gistTokenInput.focus();
  }
}

async function onGistConnectClick() {
  if (!gistTokenInput) {
    return;
  }
  try {
    gistConnectBtn.disabled = true;
    await connectGistSync(gistTokenInput.value);
    gistTokenInput.value = "";
    updateGistSyncStatus("Connected to GitHub Gist sync.");
    render();
  } catch (error) {
    activateLocalStorageMode({ render: false });
    updateGistSyncStatus(
      error.message || "Could not connect to GitHub Gist.",
      true,
    );
  } finally {
    if (gistConnectBtn) {
      gistConnectBtn.disabled = false;
    }
  }
}

function onGistClearClick() {
  clearGistSyncConfig();
  activateLocalStorageMode();
}

function escapeCsvField(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function collectionRowsForExport() {
  const ids = exportableCollectionIds();
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

async function onImportCollectionFileSelected(input) {
  const file = input?.files?.[0];
  if (!file) {
    return;
  }

  try {
    if (importCollectionBtn) {
      importCollectionBtn.disabled = true;
    }
    const result = await importCollectionFromCsvText(await file.text());
    let message = `Imported ${result.matchedCount} of ${result.rowCount} titles.`;
    if (result.unmatchedCount) {
      message += ` ${result.unmatchedCount} row(s) could not be matched.`;
    }
    if (isGistStorageActive() && !result.syncedToGist) {
      message += " GitHub Gist sync is unavailable.";
    } else if (result.syncedToGist) {
      message += " Synced to GitHub Gist.";
    }
    updateImportCollectionStatus(message, false);
    render();
  } catch (error) {
    updateImportCollectionStatus(
      error.message || "Could not import collection CSV.",
      true,
    );
  } finally {
    if (importCollectionBtn) {
      importCollectionBtn.disabled = false;
    }
    input.value = "";
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
      closeBookDetail({ programmatic: true });
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
      openBookDetail(savedBookId, { historyMode: "none" });
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

window.addEventListener("popstate", handleDetailPopState);

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
bookDetailCover.addEventListener("click", handleCoverZoomTrigger);
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

settingsTabAbout.addEventListener("click", () => {
  selectSettingsTab("about");
});

settingsTabSettings.addEventListener("click", () => {
  selectSettingsTab("settings");
});

if (coverLightbox) {
  coverLightbox.addEventListener("click", (event) => {
    if (event.target.closest(".cover-lightbox-img")) {
      if (isMobileCoverLightboxViewport()) {
        closeCoverLightbox();
      }
      return;
    }
    closeCoverLightbox();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  if (coverLightbox && !coverLightbox.hidden) {
    event.preventDefault();
    closeCoverLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (coverLightbox && !coverLightbox.hidden) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateCoverLightbox(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateCoverLightbox(1);
      return;
    }
  }
});

if (storageModeLocalInput) {
  storageModeLocalInput.addEventListener("change", () => {
    if (storageModeLocalInput.checked) {
      onStorageModeChange("local");
    }
  });
}

if (storageModeGistInput) {
  storageModeGistInput.addEventListener("change", () => {
    if (storageModeGistInput.checked) {
      onGistSetupSelected();
    }
  });
}

if (gistConnectBtn) {
  gistConnectBtn.addEventListener("click", () => {
    onGistConnectClick();
  });
}

if (gistClearBtn) {
  gistClearBtn.addEventListener("click", () => {
    onGistClearClick();
  });
}

if (exportCollectionBtn) {
  exportCollectionBtn.addEventListener("click", () => {
    exportCollectionCsv();
  });
}

if (importCollectionBtn && importCollectionInput) {
  importCollectionBtn.addEventListener("click", () => {
    importCollectionInput.click();
  });
  importCollectionInput.addEventListener("change", () => {
    onImportCollectionFileSelected(importCollectionInput);
  });
}

if (highlightWantsInput) {
  highlightWantsInput.addEventListener("change", () => {
    highlightWants = highlightWantsInput.checked;
    saveUserState();
    render();
  });
}

if (highlightCollectionInput) {
  highlightCollectionInput.addEventListener("change", () => {
    highlightCollection = highlightCollectionInput.checked;
    saveUserState();
    render();
  });
}

if (showMagazinesInput) {
  showMagazinesInput.addEventListener("change", () => {
    showMagazines = showMagazinesInput.checked;
    saveUserState();
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
  if (
    !bookDetailDialog.hidden &&
    editDialog.hidden &&
    (!coverLightbox || coverLightbox.hidden)
  ) {
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

syncSettingsStorageMode();
updateSortControlVisibility();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    pullGistStateIfConfigured();
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    pullGistStateIfConfigured();
  }
});

if (headerFiltersToggle) {
  headerFiltersToggle.addEventListener("click", () => {
    headerFiltersExpanded = !headerFiltersExpanded;
    saveUserState();
    updateHeaderFiltersState();
  });
}

if (viewModeToggle) {
  viewModeToggle.addEventListener("click", () => {
    gridViewMode = gridViewMode === "list" ? "cards" : "list";
    saveUserState();
    updateViewModeState();
  });
}

stats.addEventListener("click", (event) => {
  if (event.target.closest("#collection-filter-toggle")) {
    cycleCollectionFilter();
    wantOnly = false;
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
      collectionFilterMode = null;
    }
    render();
    return;
  }
});

function startViewer() {
  loadUserStateAsync().then(() => {
    render();
    openBookDetailFromLocation();
  });
}

if (readOnly) {
  startViewer();
} else {
  checkServeSupport().then(() => {
    startViewer();
  });
}

})();

