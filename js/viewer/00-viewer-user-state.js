/* Generated from scripts/lib/viewer-user-state.js — run npm run bundle-viewer */

const viewerUserState = (function () {
  const USER_STATE_KEY = "arkham-user-state";
  const USER_STATE_BACKUP_KEY = "arkham-user-state-backup";
  const USER_STATE_VERSION = 3;
  const USER_STATE_VERSION_V2 = 2;
  const USER_STATE_VERSION_V1 = 1;
  
  /**
   * Stamp used when a time has to be invented — pre-v3 data, or id arrays that
   * arrived without a status map. The epoch loses to every real edit, so upgrading
   * or re-reading old state can never outrank a live change on another device.
   */
  const FALLBACK_STAMP_AT = new Date(0).toISOString();
  
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
      wantIds: [],
      wantOrderIds: [],
      collections: defaultCollections(),
      preferences: {
        sort: "date-asc",
        viewMode: "cards",
        headerFiltersExpanded: true,
        highlightWants: true,
        highlightCollection: true,
        showMagazines: false,
        wantOrderLocked: false,
      },
    };
  }
  
  /**
   * A storage slot keeps `statuses` as the only source of truth. The id arrays are
   * derived mirrors, recomputed on every normalize so they can never drift out of
   * step with the stamps.
   */
  function buildCollectionSlot(statuses, wantOrderIdsRaw) {
    const normalized = viewerBookStatus.normalizeStatusMap(statuses);
    const derived = viewerBookStatus.deriveIdsByStatus(normalized);
    return {
      statuses: normalized,
      collectionIds: derived.collectionIds,
      orderedIds: derived.orderedIds,
      wantIds: derived.wantIds,
      wantOrderIds: viewerWantOrderNormalize.normalizeWantOrderIds(wantOrderIdsRaw, derived.wantIds),
    };
  }
  
  function emptyCollectionSlot() {
    return buildCollectionSlot({}, []);
  }
  
  function slotFromIdArrays(arrays, at, wantOrderIdsRaw) {
    return buildCollectionSlot(
      viewerBookStatus.statusMapFromIdArrays(
        {
          collectionIds: normalizeIdArray(arrays?.collectionIds),
          orderedIds: normalizeIdArray(arrays?.orderedIds),
          wantIds: normalizeIdArray(arrays?.wantIds),
        },
        at,
      ),
      wantOrderIdsRaw,
    );
  }
  
  function defaultCollections() {
    return { local: emptyCollectionSlot(), gist: emptyCollectionSlot() };
  }
  
  function resolveStampAt(raw) {
    return viewerBookStatus.normalizeStampTime(raw) || FALLBACK_STAMP_AT;
  }
  
  function normalizeCollectionSlot(raw, fallback = emptyCollectionSlot(), options = {}) {
    const source = raw && typeof raw === "object" ? raw : null;
    if (!source) {
      return buildCollectionSlot(fallback.statuses, fallback.wantOrderIds);
    }
  
    const statuses = viewerBookStatus.normalizeStatusMap(source.statuses);
    if (Object.keys(statuses).length) {
      return buildCollectionSlot(statuses, source.wantOrderIds);
    }
  
    // Pre-v3 slot: rebuild stamps from whatever id arrays it carried.
    return slotFromIdArrays(
      {
        collectionIds: source.collectionIds,
        orderedIds: source.orderedIds,
        wantIds: source.wantIds ?? fallback.wantIds,
      },
      resolveStampAt(options.at),
      source.wantOrderIds ?? fallback.wantOrderIds,
    );
  }
  
  function normalizeCollections(
    raw,
    topLevelIds = [],
    topLevelOrdered = [],
    options = {},
  ) {
    const at = resolveStampAt(options.at);
    const fallbackArrays = {
      collectionIds: topLevelIds,
      orderedIds: topLevelOrdered,
      wantIds: options.wantIds,
    };
    const fallback = slotFromIdArrays(fallbackArrays, at, options.wantOrderIds);
  
    if (!raw || typeof raw !== "object") {
      return {
        local: slotFromIdArrays(fallbackArrays, at, options.wantOrderIds),
        gist: slotFromIdArrays(fallbackArrays, at, options.wantOrderIds),
      };
    }
    return {
      local: normalizeCollectionSlot(raw.local, fallback, options),
      gist: normalizeCollectionSlot(raw.gist, fallback, options),
    };
  }
  
  function activeCollectionSlot(state) {
    const mode = normalizeStorageMode(state.storageMode);
    const collections = normalizeCollections(
      state.collections,
      state.collectionIds,
      state.orderedIds,
      {
        wantIds: state.wantIds,
        wantOrderIds: state.wantOrderIds,
        at: state.updatedAt,
      },
    );
    return collections[mode];
  }
  
  function localCollectionSlotFromPersisted(localPersisted) {
    return normalizeCollectionSlot(
      localPersisted?.collections?.local,
      slotFromIdArrays(
        {
          collectionIds: localPersisted?.collectionIds,
          orderedIds: localPersisted?.orderedIds,
          wantIds: localPersisted?.wantIds,
        },
        resolveStampAt(localPersisted?.updatedAt),
        localPersisted?.wantOrderIds,
      ),
      { at: localPersisted?.updatedAt },
    );
  }
  
  /** Shape the top-level mirrors from whichever slot the active storage mode uses. */
  function withActiveSlotMirrors(state, collections, storageMode) {
    const active = collections[storageMode] || collections.local;
    return {
      ...state,
      storageMode,
      collectionIds: active.collectionIds,
      orderedIds: active.orderedIds,
      wantIds: active.wantIds,
      wantOrderIds: active.wantOrderIds,
      collections,
    };
  }
  
  function buildNewGistConnectState(localPersisted) {
    const base = defaultUserState();
    const at = resolveStampAt(localPersisted?.updatedAt);
    const mode = normalizeStorageMode(localPersisted?.storageMode);
    const collections = normalizeCollections(
      localPersisted?.collections,
      localPersisted?.collectionIds,
      localPersisted?.orderedIds,
      {
        wantIds: localPersisted?.wantIds,
        wantOrderIds: localPersisted?.wantOrderIds,
        at,
      },
    );
    const activeSlot = collections[mode] || collections.local;
    const nextCollections = {
      local: collections.local,
      gist: buildCollectionSlot(activeSlot.statuses, activeSlot.wantOrderIds),
    };
    return withActiveSlotMirrors(
      {
        ...base,
        updatedAt: new Date().toISOString(),
        preferences: normalizePreferences(localPersisted?.preferences, base),
      },
      nextCollections,
      "gist",
    );
  }
  
  /** @deprecated Use buildNewGistConnectState */
  function buildEmptyGistConnectState(localPersisted) {
    return buildNewGistConnectState(localPersisted);
  }
  
  function adoptRemoteGistState(remoteState, localPersisted) {
    const parsed =
      typeof remoteState === "string"
        ? parseUserState(remoteState)
        : parseUserState(serializeUserState(remoteState));
    if (!parsed) {
      return null;
    }
    const collections = {
      local: localCollectionSlotFromPersisted(localPersisted),
      gist: parsed.collections.gist,
    };
    return withActiveSlotMirrors(parsed, collections, "gist");
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
    return raw && SORT_MODES.has(raw) ? raw : fallback;
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
    return raw === "gist" ? "gist" : "local";
  }
  
  function normalizeViewMode(raw, fallback = "cards") {
    return raw === "list" ? "list" : fallback;
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
    const arrays = {
      collectionIds: legacyCollectionIds(snapshot),
      orderedIds: normalizeIdArray(snapshot[LEGACY_KEYS.ordered]),
      wantIds: normalizeIdArray(snapshot[LEGACY_KEYS.want]),
    };
    const slot = slotFromIdArrays(arrays, FALLBACK_STAMP_AT, null);
  
    return withActiveSlotMirrors(
      {
        ...base,
        updatedAt: null,
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
      },
      {
        local: slot,
        gist: slotFromIdArrays(arrays, FALLBACK_STAMP_AT, null),
      },
      legacyStorageModeFromSource(snapshot[LEGACY_KEYS.collectionSource]),
    );
  }
  
  function hasLegacyUserData(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      return false;
    }
    return Object.values(snapshot).some(
      (value) => value != null && value !== "",
    );
  }
  
  /** v1 → v2: flat arrays only. v2 → v3 builds the stamped slots. */
  function migrateV1ToV2(v1) {
    const base = defaultUserState();
    const wantIds = normalizeIdArray(v1.wantIds);
    return {
      version: USER_STATE_VERSION_V2,
      updatedAt: v1.updatedAt || null,
      storageMode: "local",
      collectionIds: normalizeIdArray(v1.ownCollectionIds),
      orderedIds: normalizeIdArray(v1.orderedIds),
      wantIds,
      wantOrderIds: viewerWantOrderNormalize.normalizeWantOrderIds(null, wantIds),
      preferences: normalizePreferences(v1.preferences, base),
    };
  }
  
  /**
   * v2 kept one shared want list across both storage slots while collections were
   * per-slot. v3 gives each slot a single status per book, so the shared wants are
   * seeded into both slots — nothing is dropped, and the two only diverge if wants
   * are edited after the upgrade.
   */
  function migrateV2ToV3(v2) {
    const base = defaultUserState();
    const at = resolveStampAt(v2?.updatedAt);
    const wantIds = normalizeIdArray(v2?.wantIds);
    const wantOrderIds = viewerWantOrderNormalize.normalizeWantOrderIds(v2?.wantOrderIds, wantIds);
    const rawCollections =
      v2?.collections && typeof v2.collections === "object" ? v2.collections : null;
  
    const slotFor = (slotRaw) =>
      slotFromIdArrays(
        {
          collectionIds: slotRaw?.collectionIds ?? v2?.collectionIds,
          orderedIds: slotRaw?.orderedIds ?? v2?.orderedIds,
          wantIds,
        },
        at,
        wantOrderIds,
      );
  
    return withActiveSlotMirrors(
      {
        ...base,
        updatedAt: typeof v2?.updatedAt === "string" ? v2.updatedAt : null,
        preferences: normalizePreferences(v2?.preferences, base),
      },
      {
        local: slotFor(rawCollections?.local),
        gist: slotFor(rawCollections?.gist),
      },
      normalizeStorageMode(v2?.storageMode),
    );
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
      if (!parsed || parsed.version !== USER_STATE_VERSION_V2) {
        return null;
      }
  
      const base = defaultUserState();
      const wantIds = normalizeIdArray(parsed.wantIds);
      return {
        version: USER_STATE_VERSION_V2,
        updatedAt:
          typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
        storageMode: normalizeStorageMode(parsed.storageMode),
        collectionIds: normalizeIdArray(parsed.collectionIds),
        orderedIds: normalizeIdArray(parsed.orderedIds),
        collections: parsed.collections,
        wantIds,
        wantOrderIds: viewerWantOrderNormalize.normalizeWantOrderIds(parsed.wantOrderIds, wantIds),
        preferences: normalizePreferences(parsed.preferences, base),
      };
    } catch (_) {
      return null;
    }
  }
  
  function parseUserStateV3(json) {
    if (json == null || json === "") {
      return null;
    }
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      if (!parsed || parsed.version !== USER_STATE_VERSION) {
        return null;
      }
  
      const base = defaultUserState();
      const collections = normalizeCollections(
        parsed.collections,
        parsed.collectionIds,
        parsed.orderedIds,
        {
          wantIds: parsed.wantIds,
          wantOrderIds: parsed.wantOrderIds,
          at: parsed.updatedAt,
        },
      );
      return withActiveSlotMirrors(
        {
          ...base,
          updatedAt:
            typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
          preferences: normalizePreferences(parsed.preferences, base),
        },
        collections,
        normalizeStorageMode(parsed.storageMode),
      );
    } catch (_) {
      return null;
    }
  }
  
  function parseUserState(json) {
    const v3 = parseUserStateV3(json);
    if (v3) {
      return v3;
    }
    const v2 = parseUserStateV2(json);
    if (v2) {
      return migrateV2ToV3(v2);
    }
    const v1 = parseUserStateV1(json);
    if (v1) {
      return migrateV2ToV3(migrateV1ToV2(v1));
    }
    return null;
  }
  
  /**
   * Build persistable state from the live viewer. `bookStatuses` is authoritative
   * when present; without it the id arrays are stamped at the epoch rather than
   * now, so an ordinary save never looks newer than a real edit elsewhere.
   */
  function buildUserStateFromRuntime(snapshot, options = {}) {
    const base = defaultUserState();
    const mode = normalizeStorageMode(snapshot.storageMode);
    const statuses = snapshot.bookStatuses
      ? viewerBookStatus.normalizeStatusMap(snapshot.bookStatuses)
      : viewerBookStatus.statusMapFromIdArrays(
          {
            collectionIds: normalizeIdArray(snapshot.collectionIds),
            orderedIds: normalizeIdArray(snapshot.orderedIds),
            wantIds: normalizeIdArray(snapshot.wantIds),
          },
          FALLBACK_STAMP_AT,
        );
  
    const collections = normalizeCollections(options.existingCollections, [], [], {
      at: FALLBACK_STAMP_AT,
    });
    collections[mode] = buildCollectionSlot(statuses, snapshot.wantOrderIds);
  
    return withActiveSlotMirrors(
      {
        ...base,
        updatedAt: new Date().toISOString(),
        preferences: {
          sort: normalizeSort(snapshot.sort),
          viewMode: normalizeViewMode(snapshot.viewMode),
          headerFiltersExpanded: Boolean(snapshot.headerFiltersExpanded),
          highlightWants: Boolean(snapshot.highlightWants),
          highlightCollection: Boolean(snapshot.highlightCollection),
          showMagazines: Boolean(snapshot.showMagazines),
          wantOrderLocked: normalizeWantOrderLocked(snapshot.wantOrderLocked),
        },
      },
      collections,
      mode,
    );
  }
  
  function applyUserStateToRuntime(state) {
    const parsed = parseUserState(state) || migrateFromLegacy(null);
    const active = activeCollectionSlot(parsed);
    return {
      storageMode: parsed.storageMode,
      bookStatuses: active.statuses,
      collectionIds: active.collectionIds,
      orderedIds: active.orderedIds,
      wantIds: active.wantIds,
      wantOrderIds: active.wantOrderIds,
      sort: parsed.preferences.sort,
      viewMode: parsed.preferences.viewMode,
      headerFiltersExpanded: parsed.preferences.headerFiltersExpanded,
      highlightWants: parsed.preferences.highlightWants,
      highlightCollection: parsed.preferences.highlightCollection,
      showMagazines: parsed.preferences.showMagazines,
      wantOrderLocked: parsed.preferences.wantOrderLocked,
    };
  }
  
  function serializeUserState(state) {
    return JSON.stringify(state);
  }
  
  /** Accepts a JSON string, a v3 object, or an older payload, and returns v3 or null. */
  function normalizeStateForMerge(state) {
    if (state == null) {
      return null;
    }
    return parseUserState(
      typeof state === "string" ? state : serializeUserState(state),
    );
  }
  
  function stateUpdatedAtMs(state) {
    const parsed = Date.parse(state?.updatedAt || "");
    return Number.isFinite(parsed) ? parsed : null;
  }
  
  /** Ties favour the local payload, which is the one the user is looking at. */
  function pickNewerState(local, remote) {
    const localMs = stateUpdatedAtMs(local);
    const remoteMs = stateUpdatedAtMs(remote);
    if (localMs == null && remoteMs != null) {
      return remote;
    }
    if (remoteMs == null) {
      return local;
    }
    return remoteMs > localMs ? remote : local;
  }
  
  /**
   * Merge two payloads book by book.
   *
   * Each book's own stamp decides its fate, so a device that never saw a book
   * cannot delete it — which is the whole reason v3 exists. Only the gist slot
   * merges: the local slot never leaves the device, so the local copy wins
   * outright. Preferences and want order have no per-item history, so they follow
   * the newer payload, and want order is re-normalized against merged membership.
   *
   * Older payloads are migrated on the way in, so a device still writing v2 can be
   * merged safely: its books arrive stamped at the epoch and lose to any real edit
   * without ever being dropped.
   */
  function mergeUserState(localState, remoteState) {
    const local = normalizeStateForMerge(localState);
    const remote = normalizeStateForMerge(remoteState);
    if (!local) {
      return remote;
    }
    if (!remote) {
      return local;
    }
  
    const newer = pickNewerState(local, remote);
    const collections = {
      local: local.collections.local,
      gist: buildCollectionSlot(
        viewerBookStatus.mergeStatusMaps(
          local.collections.gist.statuses,
          remote.collections.gist.statuses,
        ),
        newer.collections.gist.wantOrderIds,
      ),
    };
    const localMs = stateUpdatedAtMs(local);
    const remoteMs = stateUpdatedAtMs(remote);
    const updatedAt =
      localMs != null && remoteMs != null && localMs > remoteMs
        ? local.updatedAt
        : remote.updatedAt || local.updatedAt;
  
    return withActiveSlotMirrors(
      { ...newer, updatedAt },
      collections,
      normalizeStorageMode(newer.storageMode),
    );
  }
  return {
    USER_STATE_KEY,
    USER_STATE_BACKUP_KEY,
    USER_STATE_VERSION,
    FALLBACK_STAMP_AT,
    LEGACY_KEYS,
    defaultUserState,
    buildCollectionSlot,
    emptyCollectionSlot,
    normalizeCollections,
    normalizeCollectionSlot,
    activeCollectionSlot,
    localCollectionSlotFromPersisted,
    withActiveSlotMirrors,
    buildEmptyGistConnectState,
    buildNewGistConnectState,
    adoptRemoteGistState,
    normalizeIdArray,
    normalizeStorageMode,
    migrateFromLegacy,
    migrateV1ToV2,
    migrateV2ToV3,
    parseUserState,
    buildUserStateFromRuntime,
    applyUserStateToRuntime,
    serializeUserState,
    mergeUserState,
  };
})();
