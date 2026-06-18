const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  USER_STATE_VERSION,
  LEGACY_KEYS,
  defaultUserState,
  normalizeIdArray,
  migrateFromLegacy,
  parseUserState,
  buildUserStateFromRuntime,
  applyUserStateToRuntime,
  serializeUserState,
} = require("../scripts/lib/viewer-user-state");

test("migrateFromLegacy maps full legacy snapshot", () => {
  const legacy = {
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
  };

  const state = migrateFromLegacy(legacy);
  assert.equal(state.version, USER_STATE_VERSION);
  assert.equal(state.collectionSource, "own");
  assert.deepEqual(state.ownCollectionIds, [1, 42]);
  assert.deepEqual(state.sampleCollectionIds, [3, 7]);
  assert.deepEqual(state.orderedIds, [99]);
  assert.deepEqual(state.wantIds, [5, 12]);
  assert.equal(state.preferences.sort, "title-desc");
  assert.equal(state.preferences.viewMode, "list");
  assert.equal(state.preferences.headerFiltersExpanded, false);
  assert.equal(state.preferences.highlightWants, false);
  assert.equal(state.preferences.highlightCollection, true);
  assert.equal(state.preferences.showMagazines, true);
});

test("migrateFromLegacy uses defaults for partial legacy snapshot", () => {
  const state = migrateFromLegacy({
    [LEGACY_KEYS.want]: "[10]",
  });
  assert.deepEqual(state.wantIds, [10]);
  assert.deepEqual(state.ownCollectionIds, []);
  assert.equal(state.sampleCollectionIds, null);
  assert.equal(state.collectionSource, null);
  assert.equal(state.preferences.highlightWants, true);
});

test("migrateFromLegacy maps legacy sort aliases", () => {
  assert.equal(
    migrateFromLegacy({ [LEGACY_KEYS.sort]: "default" }).preferences.sort,
    "date-asc",
  );
  assert.equal(
    migrateFromLegacy({ [LEGACY_KEYS.sort]: "title" }).preferences.sort,
    "title-asc",
  );
});

test("normalizeIdArray rejects invalid JSON arrays", () => {
  assert.deepEqual(normalizeIdArray("not-json"), []);
  assert.deepEqual(normalizeIdArray("[1, null, 2.5, 2]"), [1, 2]);
});

test("parseUserState rejects invalid or wrong version", () => {
  assert.equal(parseUserState(null), null);
  assert.equal(parseUserState("{"), null);
  assert.equal(parseUserState(JSON.stringify({ version: 2 })), null);
});

test("buildUserStateFromRuntime roundtrips through parseUserState", () => {
  const built = buildUserStateFromRuntime({
    collectionSource: "own",
    ownCollectionIds: [7, 3, 3],
    sampleCollectionIds: null,
    orderedIds: [9],
    wantIds: [1],
    sort: "date-desc",
    viewMode: "list",
    headerFiltersExpanded: false,
    highlightWants: true,
    highlightCollection: false,
    showMagazines: true,
  });
  assert.match(built.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

  const parsed = parseUserState(serializeUserState(built));
  assert.deepEqual(parsed.ownCollectionIds, [3, 7]);
  assert.equal(parsed.sampleCollectionIds, null);
  assert.equal(parsed.preferences.sort, "date-desc");
  assert.equal(parsed.preferences.viewMode, "list");
});

test("applyUserStateToRuntime preserves null sampleCollectionIds", () => {
  const runtime = applyUserStateToRuntime(
    buildUserStateFromRuntime({
      collectionSource: "sample",
      ownCollectionIds: [],
      sampleCollectionIds: null,
      orderedIds: [],
      wantIds: [],
      sort: "date-asc",
      viewMode: "cards",
      headerFiltersExpanded: true,
      highlightWants: true,
      highlightCollection: true,
      showMagazines: false,
    }),
  );
  assert.equal(runtime.sampleCollectionIds, null);
});

test("defaultUserState matches first-visit defaults", () => {
  const state = defaultUserState();
  assert.equal(state.collectionSource, "sample");
  assert.equal(state.sampleCollectionIds, null);
  assert.equal(state.preferences.highlightWants, true);
  assert.equal(state.preferences.showMagazines, false);
});
