const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  USER_STATE_VERSION,
  LEGACY_KEYS,
  defaultUserState,
  normalizeIdArray,
  migrateFromLegacy,
  migrateV1ToV2,
  parseUserState,
  buildUserStateFromRuntime,
  applyUserStateToRuntime,
  serializeUserState,
  adoptRemoteGistState,
  buildEmptyGistConnectState,
  buildNewGistConnectState,
} = require("../scripts/lib/viewer-user-state");

test("migrateFromLegacy maps own collection and drops sample ids", () => {
  const state = migrateFromLegacy({
    [LEGACY_KEYS.collection]: "[1, 42]",
    [LEGACY_KEYS.sampleCollection]: "[3, 7]",
    [LEGACY_KEYS.ordered]: "[99]",
    [LEGACY_KEYS.want]: "[5, 12]",
    [LEGACY_KEYS.collectionSource]: "own",
    [LEGACY_KEYS.sort]: "title-desc",
    [LEGACY_KEYS.viewMode]: "list",
    [LEGACY_KEYS.headerFiltersExpanded]: "0",
    [LEGACY_KEYS.highlightWants]: "0",
    [LEGACY_KEYS.highlightCollection]: "1",
    [LEGACY_KEYS.showMagazines]: "1",
  });

  assert.equal(state.version, USER_STATE_VERSION);
  assert.equal(state.storageMode, "local");
  assert.deepEqual(state.collectionIds, [1, 42]);
  assert.deepEqual(state.orderedIds, [99]);
  assert.deepEqual(state.wantIds, [5, 12]);
  assert.equal(state.preferences.sort, "title-desc");
  assert.equal(state.preferences.viewMode, "list");
});

test("migrateFromLegacy discards sample-only collection data", () => {
  const state = migrateFromLegacy({
    [LEGACY_KEYS.sampleCollection]: "[3, 7]",
    [LEGACY_KEYS.collectionSource]: "sample",
  });
  assert.deepEqual(state.collectionIds, []);
  assert.equal(state.storageMode, "local");
});

test("migrateFromLegacy uses defaults for partial legacy snapshot", () => {
  const state = migrateFromLegacy({
    [LEGACY_KEYS.want]: "[10]",
  });
  assert.deepEqual(state.wantIds, [10]);
  assert.deepEqual(state.collectionIds, []);
  assert.equal(state.storageMode, "local");
});

test("migrateV1ToV2 keeps own ids and drops sample ids", () => {
  const state = migrateV1ToV2({
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    collectionSource: "sample",
    ownCollectionIds: [1, 2],
    sampleCollectionIds: [9],
    orderedIds: [3],
    wantIds: [4],
    preferences: defaultUserState().preferences,
  });
  assert.equal(state.version, USER_STATE_VERSION);
  assert.deepEqual(state.collectionIds, [1, 2]);
  assert.equal(state.storageMode, "local");
});

test("parseUserState upgrades v1 unified state to v2", () => {
  const v1 = {
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    collectionSource: "own",
    ownCollectionIds: [5],
    sampleCollectionIds: null,
    orderedIds: [],
    wantIds: [],
    preferences: defaultUserState().preferences,
  };
  const parsed = parseUserState(JSON.stringify(v1));
  assert.equal(parsed.version, USER_STATE_VERSION);
  assert.deepEqual(parsed.collectionIds, [5]);
});

test("buildUserStateFromRuntime roundtrips wantOrderIds through parseUserState", () => {
  const built = buildUserStateFromRuntime({
    storageMode: "gist",
    collectionIds: [7, 3, 3],
    orderedIds: [9],
    wantIds: [1, 2],
    wantOrderIds: [2, 1],
    sort: "date-desc",
    viewMode: "list",
    headerFiltersExpanded: false,
    highlightWants: true,
    highlightCollection: false,
    showMagazines: true,
  });
  const parsed = parseUserState(serializeUserState(built));
  assert.deepEqual(parsed.wantIds, [1, 2]);
  assert.deepEqual(parsed.wantOrderIds, [2, 1]);
  assert.equal(parsed.preferences.wantOrderLocked, false);
});

test("buildUserStateFromRuntime defaults wantOrderLocked to unlocked", () => {
  const built = buildUserStateFromRuntime({
    storageMode: "local",
    collectionIds: [],
    orderedIds: [],
    wantIds: [],
    wantOrderIds: [],
    sort: "date-asc",
    viewMode: "cards",
    headerFiltersExpanded: true,
    highlightWants: true,
    highlightCollection: true,
    showMagazines: false,
  });
  assert.equal(built.preferences.wantOrderLocked, false);
});

test("migrateFromLegacy defaults wantOrderLocked to unlocked", () => {
  const migrated = migrateFromLegacy({});
  assert.equal(migrated.preferences.wantOrderLocked, false);
});

test("buildUserStateFromRuntime roundtrips through parseUserState", () => {
  const built = buildUserStateFromRuntime({
    storageMode: "gist",
    collectionIds: [7, 3, 3],
    orderedIds: [9],
    wantIds: [1],
    wantOrderIds: [1],
    sort: "date-desc",
    viewMode: "list",
    headerFiltersExpanded: false,
    highlightWants: true,
    highlightCollection: false,
    showMagazines: true,
  });
  assert.match(built.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

  const parsed = parseUserState(serializeUserState(built));
  assert.deepEqual(parsed.collectionIds, [3, 7]);
  assert.equal(parsed.storageMode, "gist");
});

test("buildUserStateFromRuntime keeps the other storage collection slot", () => {
  const built = buildUserStateFromRuntime(
    {
      storageMode: "local",
      collectionIds: [1],
      orderedIds: [],
      wantIds: [],
      sort: "date-asc",
      viewMode: "cards",
      headerFiltersExpanded: true,
      highlightWants: true,
      highlightCollection: true,
      showMagazines: false,
    },
    {
      existingCollections: {
        local: { collectionIds: [9], orderedIds: [] },
        gist: { collectionIds: [2, 3], orderedIds: [4] },
      },
    },
  );
  assert.deepEqual(built.collections.local.collectionIds, [1]);
  assert.deepEqual(built.collections.gist.collectionIds, [2, 3]);
  assert.deepEqual(built.collections.gist.orderedIds, [4]);
});

test("applyUserStateToRuntime uses active storage collection slot", () => {
  const runtime = applyUserStateToRuntime(
    serializeUserState({
      version: USER_STATE_VERSION,
      updatedAt: null,
      storageMode: "local",
      collectionIds: [99],
      orderedIds: [],
      collections: {
        local: { collectionIds: [1, 2], orderedIds: [3] },
        gist: { collectionIds: [8], orderedIds: [] },
      },
      wantIds: [],
      preferences: defaultUserState().preferences,
    }),
  );
  assert.deepEqual(runtime.collectionIds, [1, 2]);
  assert.deepEqual(runtime.orderedIds, [3]);
});

test("adoptRemoteGistState replaces gist data but keeps local collection slot", () => {
  const adopted = adoptRemoteGistState(
    {
      version: USER_STATE_VERSION,
      updatedAt: "2026-06-02T00:00:00.000Z",
      storageMode: "gist",
      collectionIds: [5, 6],
      orderedIds: [7],
      wantIds: [8],
      preferences: {
        ...defaultUserState().preferences,
        sort: "title-desc",
      },
    },
    {
      collections: {
        local: { collectionIds: [1], orderedIds: [2] },
        gist: { collectionIds: [99], orderedIds: [] },
      },
    },
  );
  assert.deepEqual(adopted.collections.local.collectionIds, [1]);
  assert.deepEqual(adopted.collections.local.orderedIds, [2]);
  assert.deepEqual(adopted.collections.gist.collectionIds, [5, 6]);
  assert.deepEqual(adopted.wantIds, [8]);
  assert.equal(adopted.preferences.sort, "title-desc");
});

test("buildNewGistConnectState seeds gist from local collection and wants", () => {
  const seeded = buildNewGistConnectState({
    storageMode: "local",
    collectionIds: [3, 4],
    orderedIds: [5],
    wantIds: [8],
    wantOrderIds: [8],
    preferences: {
      sort: "title-desc",
    },
    collections: {
      local: { collectionIds: [3, 4], orderedIds: [5] },
      gist: { collectionIds: [], orderedIds: [] },
    },
  });
  assert.deepEqual(seeded.collections.local.collectionIds, [3, 4]);
  assert.deepEqual(seeded.collections.gist.collectionIds, [3, 4]);
  assert.deepEqual(seeded.collections.gist.orderedIds, [5]);
  assert.deepEqual(seeded.collectionIds, [3, 4]);
  assert.deepEqual(seeded.wantIds, [8]);
  assert.equal(seeded.preferences.sort, "title-desc");
});

test("buildEmptyGistConnectState alias seeds gist from local data", () => {
  const empty = buildEmptyGistConnectState({
    collections: {
      local: { collectionIds: [3], orderedIds: [] },
      gist: { collectionIds: [9], orderedIds: [4] },
    },
  });
  assert.deepEqual(empty.collections.local.collectionIds, [3]);
  assert.deepEqual(empty.collections.gist.collectionIds, [3]);
});

test("defaultUserState matches first-visit defaults", () => {
  const state = defaultUserState();
  assert.equal(state.storageMode, "local");
  assert.deepEqual(state.collectionIds, []);
  assert.equal(state.preferences.highlightWants, true);
  assert.equal(state.preferences.wantOrderLocked, false);
});

test("normalizeIdArray rejects invalid JSON arrays", () => {
  assert.deepEqual(normalizeIdArray("not-json"), []);
  assert.deepEqual(normalizeIdArray("[1, null, 2.5, 2]"), [1, 2]);
});
