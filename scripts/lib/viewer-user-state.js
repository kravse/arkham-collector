const USER_STATE_KEY = "arkham-user-state";
const USER_STATE_VERSION = 1;

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
    collectionSource: "sample",
    ownCollectionIds: [],
    sampleCollectionIds: null,
    orderedIds: [],
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

function normalizeCollectionSource(raw) {
  if (raw === "own" || raw === "sample") {
    return raw;
  }
  return null;
}

function normalizeViewMode(raw, fallback = "cards") {
  if (raw === "list") {
    return "list";
  }
  return fallback;
}

function migrateFromLegacy(legacy) {
  const base = defaultUserState();
  const snapshot = legacy || {};

  const sampleRaw = snapshot[LEGACY_KEYS.sampleCollection];
  let sampleCollectionIds = null;
  if (sampleRaw !== null && sampleRaw !== undefined) {
    sampleCollectionIds = normalizeIdArray(sampleRaw);
  }

  return {
    version: USER_STATE_VERSION,
    updatedAt: null,
    collectionSource: normalizeCollectionSource(
      snapshot[LEGACY_KEYS.collectionSource],
    ),
    ownCollectionIds: normalizeIdArray(snapshot[LEGACY_KEYS.collection]),
    sampleCollectionIds,
    orderedIds: normalizeIdArray(snapshot[LEGACY_KEYS.ordered]),
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

function parseUserState(json) {
  if (json == null || json === "") {
    return null;
  }
  try {
    const parsed = typeof json === "string" ? JSON.parse(json) : json;
    if (!parsed || parsed.version !== USER_STATE_VERSION) {
      return null;
    }

    const base = defaultUserState();
    const sampleRaw = parsed.sampleCollectionIds;
    let sampleCollectionIds = null;
    if (sampleRaw !== null && sampleRaw !== undefined) {
      sampleCollectionIds = normalizeIdArray(sampleRaw);
    }

    return {
      version: USER_STATE_VERSION,
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
      collectionSource: normalizeCollectionSource(parsed.collectionSource),
      ownCollectionIds: normalizeIdArray(parsed.ownCollectionIds),
      sampleCollectionIds,
      orderedIds: normalizeIdArray(parsed.orderedIds),
      wantIds: normalizeIdArray(parsed.wantIds),
      preferences: {
        sort: normalizeSort(parsed.preferences?.sort, base.preferences.sort),
        viewMode: normalizeViewMode(
          parsed.preferences?.viewMode,
          base.preferences.viewMode,
        ),
        headerFiltersExpanded:
          typeof parsed.preferences?.headerFiltersExpanded === "boolean"
            ? parsed.preferences.headerFiltersExpanded
            : base.preferences.headerFiltersExpanded,
        highlightWants:
          typeof parsed.preferences?.highlightWants === "boolean"
            ? parsed.preferences.highlightWants
            : base.preferences.highlightWants,
        highlightCollection:
          typeof parsed.preferences?.highlightCollection === "boolean"
            ? parsed.preferences.highlightCollection
            : base.preferences.highlightCollection,
        showMagazines:
          typeof parsed.preferences?.showMagazines === "boolean"
            ? parsed.preferences.showMagazines
            : base.preferences.showMagazines,
      },
    };
  } catch (_) {
    return null;
  }
}

function buildUserStateFromRuntime(snapshot) {
  const sampleIds = snapshot.sampleCollectionIds;
  return {
    version: USER_STATE_VERSION,
    updatedAt: new Date().toISOString(),
    collectionSource:
      normalizeCollectionSource(snapshot.collectionSource) ?? "sample",
    ownCollectionIds: normalizeIdArray(snapshot.ownCollectionIds),
    sampleCollectionIds:
      sampleIds === null || sampleIds === undefined
        ? null
        : normalizeIdArray(sampleIds),
    orderedIds: normalizeIdArray(snapshot.orderedIds),
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
  let parsed = null;
  if (state != null) {
    parsed =
      typeof state === "string" ? parseUserState(state) : parseUserState(state);
  }
  if (!parsed) {
    parsed = migrateFromLegacy(null);
  }
  return {
    collectionSource: parsed.collectionSource,
    ownCollectionIds: parsed.ownCollectionIds,
    sampleCollectionIds: parsed.sampleCollectionIds,
    orderedIds: parsed.orderedIds,
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

module.exports = {
  USER_STATE_KEY,
  USER_STATE_VERSION,
  LEGACY_KEYS,
  SORT_MODES,
  defaultUserState,
  normalizeIdArray,
  normalizeSort,
  normalizeBoolFlag,
  migrateFromLegacy,
  parseUserState,
  buildUserStateFromRuntime,
  applyUserStateToRuntime,
  serializeUserState,
};
