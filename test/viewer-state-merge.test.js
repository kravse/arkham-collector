const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  USER_STATE_VERSION,
  USER_STATE_VERSION_V2,
  FALLBACK_STAMP_AT,
  defaultUserState,
  parseUserState,
  mergeUserState,
  applyUserStateToRuntime,
  buildUserStateFromRuntime,
  serializeUserState,
} = require("../scripts/lib/viewer-user-state");
const {
  COLLECTED,
  ORDERED,
  WANT,
  NONE,
  cycleCollectionStatus,
} = require("../scripts/lib/viewer-book-status");

/** Readable, ordered timestamps: at(1) is older than at(2). */
function at(minute) {
  return new Date(Date.UTC(2026, 0, 1, 0, minute)).toISOString();
}

function stamp(status, minute) {
  return { status, at: at(minute) };
}

/** A normalized v3 payload in gist mode. */
function gistState({
  statuses = {},
  local = {},
  wantOrderIds = [],
  updatedAt,
  sort,
} = {}) {
  return parseUserState(
    JSON.stringify({
      version: USER_STATE_VERSION,
      updatedAt,
      storageMode: "gist",
      collections: {
        local: { statuses: local, wantOrderIds: [] },
        gist: { statuses, wantOrderIds },
      },
      preferences: {
        ...defaultUserState().preferences,
        ...(sort ? { sort } : {}),
      },
    }),
  );
}

test("a stale tab cannot erase a book it never saw", () => {
  // The desktop collected book 10 and pushed it.
  const remote = gistState({
    statuses: { 10: stamp(COLLECTED, 5) },
    updatedAt: at(5),
  });
  // The phone loaded before that, so it only knows about its own later addition.
  const local = gistState({
    statuses: { 20: stamp(ORDERED, 9) },
    updatedAt: at(9),
  });

  const merged = mergeUserState(local, remote);
  assert.deepEqual(merged.collectionIds, [10], "the desktop's book survives");
  assert.deepEqual(merged.orderedIds, [20], "the phone's book survives");
});

test("a recorded removal survives a stale tab that still holds the book", () => {
  const remote = gistState({
    statuses: { 10: stamp(NONE, 9) },
    updatedAt: at(9),
  });
  const local = gistState({
    statuses: { 10: stamp(COLLECTED, 2) },
    updatedAt: at(3),
  });

  assert.deepEqual(mergeUserState(local, remote).collectionIds, []);
});

test("re-adding a book outranks an older removal", () => {
  const remote = gistState({
    statuses: { 10: stamp(NONE, 2) },
    updatedAt: at(2),
  });
  const local = gistState({
    statuses: { 10: stamp(WANT, 9) },
    updatedAt: at(9),
  });

  assert.deepEqual(mergeUserState(local, remote).wantIds, [10]);
});

test("the local slot is never taken from the remote payload", () => {
  const remote = gistState({
    local: { 77: stamp(COLLECTED, 9) },
    updatedAt: at(9),
  });
  const local = gistState({
    local: { 55: stamp(COLLECTED, 1) },
    updatedAt: at(1),
  });

  const merged = mergeUserState(local, remote);
  assert.deepEqual(merged.collections.local.collectionIds, [55]);
});

test("want order follows the newer payload and is normalized to merged wants", () => {
  const remote = gistState({
    statuses: { 1: stamp(WANT, 1), 2: stamp(WANT, 1) },
    wantOrderIds: [2, 1],
    updatedAt: at(9),
  });
  const local = gistState({
    statuses: { 3: stamp(WANT, 5) },
    wantOrderIds: [3],
    updatedAt: at(5),
  });

  const merged = mergeUserState(local, remote);
  assert.deepEqual(merged.wantIds, [1, 2, 3]);
  assert.deepEqual(
    merged.wantOrderIds,
    [2, 1, 3],
    "the newer ranking leads and newly merged wants are appended",
  );
});

test("preferences and updatedAt follow the newer payload", () => {
  const merged = mergeUserState(
    gistState({ updatedAt: at(1), sort: "title-asc" }),
    gistState({ updatedAt: at(9), sort: "date-desc" }),
  );
  assert.equal(merged.preferences.sort, "date-desc");
  assert.equal(merged.updatedAt, at(9));
});

test("a merge with nothing on the other side returns the side that exists", () => {
  const local = gistState({
    statuses: { 1: stamp(COLLECTED, 1) },
    updatedAt: at(1),
  });
  assert.deepEqual(mergeUserState(local, null).collectionIds, [1]);
  assert.deepEqual(mergeUserState(null, local).collectionIds, [1]);
  assert.equal(mergeUserState(null, null), null);
});

test("a device still writing v2 merges without losing either side", () => {
  const v2Remote = {
    version: USER_STATE_VERSION_V2,
    updatedAt: at(9),
    storageMode: "gist",
    collectionIds: [10],
    orderedIds: [],
    wantIds: [30],
    collections: {
      local: { collectionIds: [], orderedIds: [] },
      gist: { collectionIds: [10], orderedIds: [] },
    },
    preferences: defaultUserState().preferences,
  };
  const local = gistState({
    statuses: { 20: stamp(COLLECTED, 5) },
    updatedAt: at(5),
  });

  const merged = mergeUserState(local, v2Remote);
  assert.deepEqual(merged.collectionIds, [10, 20]);
  assert.deepEqual(merged.wantIds, [30], "v2's shared want list is carried over");
});

test("a v2 payload's single timestamp speaks for every book it lists", () => {
  // v2 has no per-book history, so the payload time is the only evidence about
  // anything in it. A v2 device that wrote later therefore still outranks an
  // earlier removal — the unavoidable cost of the upgrade window, and the reason
  // v3 records removals per book instead.
  const v2Remote = {
    version: USER_STATE_VERSION_V2,
    updatedAt: at(9),
    storageMode: "gist",
    collectionIds: [10],
    orderedIds: [],
    wantIds: [],
    preferences: defaultUserState().preferences,
  };
  const local = gistState({
    statuses: { 10: stamp(NONE, 5) },
    updatedAt: at(5),
  });

  assert.deepEqual(mergeUserState(local, v2Remote).collectionIds, [10]);
});

test("a save round-trip preserves each book's own stamp", () => {
  // The riskiest seam: if persisting flattened stamps to one time, every save
  // would look like a fresh edit and merging would start losing books again.
  const stored = gistState({
    statuses: { 10: stamp(COLLECTED, 5) },
    updatedAt: at(5),
  });
  const runtime = applyUserStateToRuntime(serializeUserState(stored));
  assert.deepEqual(runtime.bookStatuses[10], stamp(COLLECTED, 5));

  const afterClick = cycleCollectionStatus(runtime.bookStatuses, 20, at(9));
  const saved = buildUserStateFromRuntime(
    { ...runtime, bookStatuses: afterClick, storageMode: "gist" },
    { existingCollections: stored.collections },
  );

  assert.deepEqual(saved.collections.gist.statuses[10], stamp(COLLECTED, 5));
  assert.deepEqual(saved.collections.gist.statuses[20], stamp(ORDERED, 9));
});

test("a save without stamps dates them to the epoch rather than now", () => {
  // Anything that reaches persistence without a status map must not outrank a
  // real edit made on another device.
  const saved = buildUserStateFromRuntime({
    storageMode: "gist",
    collectionIds: [1],
    orderedIds: [],
    wantIds: [],
    wantOrderIds: [],
    sort: "date-asc",
    viewMode: "cards",
  });
  assert.equal(saved.collections.gist.statuses[1].at, FALLBACK_STAMP_AT);

  const remote = gistState({
    statuses: { 1: stamp(NONE, 1) },
    updatedAt: at(1),
  });
  assert.deepEqual(
    mergeUserState(saved, remote).collectionIds,
    [],
    "a real removal still wins over an unstamped save",
  );
});

test("merging is stable when both sides are already identical", () => {
  const statuses = { 1: stamp(COLLECTED, 4), 2: stamp(WANT, 4) };
  const a = gistState({ statuses, wantOrderIds: [2], updatedAt: at(4) });
  const b = gistState({ statuses, wantOrderIds: [2], updatedAt: at(4) });
  assert.equal(
    JSON.stringify(mergeUserState(a, b)),
    JSON.stringify(a),
    "an unchanged merge must not look like a change to the sync loop",
  );
});
