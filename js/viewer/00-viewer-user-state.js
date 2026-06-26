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
  
  
  function defaultUserState() {
    return {
      version: USER_STATE_VERSION,
      updatedAt: null,
      storageMode: "local",
      collectionIds: [],
      orderedIds: [],
      collections: defaultCollections(),
      wantIds: [],
      wantOrderIds: [],
      preferences: {
        sort: "date-asc",
        viewMode: "cards",
        headerFiltersExpanded: true,
        highlightWants: true,
        highlightCollection: true,
        showMagazines: false,
        wantRankDragSide: "right",
        wantOrderLocked: false,
      },
    };
  }
  
  const WANT_RANK_DRAG_SIDES = new Set(["left", "right"]);
  
  function normalizeWantRankDragSide(raw, fallback = "right") {
    if (raw && WANT_RANK_DRAG_SIDES.has(raw)) {
      return raw;
    }
    return fallback;
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
      wantOrderIds: [],
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
  
  function normalizeWantOrderLocked(raw, fallback = false) {
    return typeof raw === "boolean" ? raw : fallback;
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
      wantRankDragSide: normalizeWantRankDragSide(
        raw?.wantRankDragSide,
        base.preferences.wantRankDragSide,
      ),
      wantOrderLocked: normalizeWantOrderLocked(
        raw?.wantOrderLocked,
        base.preferences.wantOrderLocked,
      ),
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
      wantOrderIds: viewerWantOrderNormalize.normalizeWantOrderIds(
        null,
        normalizeIdArray(snapshot[LEGACY_KEYS.want]),
      ),
      preferences: normalizePreferences(
        {
          sort: snapshot[LEGACY_KEYS.sort],
          viewMode: snapshot[LEGACY_KEYS.viewMode],
          headerFiltersExpanded: snapshot[LEGACY_KEYS.headerFiltersExpanded],
          highlightWants: snapshot[LEGACY_KEYS.highlightWants],
          highlightCollection: snapshot[LEGACY_KEYS.highlightCollection],
          showMagazines: snapshot[LEGACY_KEYS.showMagazines],
        },
        base,
      ),
    };
  }
  
  function hasLegacyUserData(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      return false;
    }
    return Object.values(snapshot).some(
      (value) => value != null && value !== "",
    );
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
      wantOrderIds: viewerWantOrderNormalize.normalizeWantOrderIds(null, normalizeIdArray(v1.wantIds)),
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
      const wantIds = normalizeIdArray(parsed.wantIds);
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
        wantIds,
        wantOrderIds: viewerWantOrderNormalize.normalizeWantOrderIds(parsed.wantOrderIds, wantIds),
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
    const wantIds = normalizeIdArray(snapshot.wantIds);
    return {
      version: USER_STATE_VERSION,
      updatedAt: new Date().toISOString(),
      storageMode: mode,
      collectionIds,
      orderedIds,
      collections,
      wantIds,
      wantOrderIds: viewerWantOrderNormalize.normalizeWantOrderIds(snapshot.wantOrderIds, wantIds),
      preferences: {
        sort: normalizeSort(snapshot.sort),
        viewMode: normalizeViewMode(snapshot.viewMode),
        headerFiltersExpanded: Boolean(snapshot.headerFiltersExpanded),
        highlightWants: Boolean(snapshot.highlightWants),
        highlightCollection: Boolean(snapshot.highlightCollection),
        showMagazines: Boolean(snapshot.showMagazines),
        wantRankDragSide: normalizeWantRankDragSide(snapshot.wantRankDragSide),
        wantOrderLocked: normalizeWantOrderLocked(snapshot.wantOrderLocked),
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
      wantOrderIds: parsed.wantOrderIds,
      sort: parsed.preferences.sort,
      viewMode: parsed.preferences.viewMode,
      headerFiltersExpanded: parsed.preferences.headerFiltersExpanded,
      highlightWants: parsed.preferences.highlightWants,
      highlightCollection: parsed.preferences.highlightCollection,
      showMagazines: parsed.preferences.showMagazines,
      wantRankDragSide: parsed.preferences.wantRankDragSide,
      wantOrderLocked: parsed.preferences.wantOrderLocked,
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
