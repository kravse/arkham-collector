const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  COLLECTED,
  ORDERED,
  WANT,
  NONE,
  normalizeStatusMap,
  getBookStatus,
  mergeStatusMaps,
  setBookStatus,
  cycleCollectionStatus,
  setWantStatus,
  deriveIdsByStatus,
  statusMapFromIdArrays,
  replaceCollectionStatuses,
  supersedeStatusMap,
  restampStatusMap,
  replaceStatusesFromImport,
} = require("../scripts/lib/viewer-book-status");

/** Readable, ordered timestamps: at(1) is older than at(2). */
function at(minute) {
  return new Date(Date.UTC(2026, 0, 1, 0, minute)).toISOString();
}

test("normalizeStatusMap keeps valid stamps and drops everything else", () => {
  const map = normalizeStatusMap({
    10: { status: COLLECTED, at: at(1) },
    11: { status: "bogus", at: at(1) },
    12: { status: WANT, at: "not-a-date" },
    13: null,
    "not-an-id": { status: WANT, at: at(1) },
    14: { status: NONE, at: at(2) },
  });
  assert.deepEqual(Object.keys(map), ["10", "14"]);
  assert.equal(map[10].status, COLLECTED);
  assert.equal(map[14].status, NONE);
});

test("normalizeStatusMap accepts a JSON string and rejects junk", () => {
  assert.deepEqual(
    normalizeStatusMap(`{"7":{"status":"want","at":"${at(1)}"}}`),
    { 7: { status: WANT, at: at(1) } },
  );
  assert.deepEqual(normalizeStatusMap("not json"), {});
  assert.deepEqual(normalizeStatusMap([1, 2]), {});
  assert.deepEqual(normalizeStatusMap(null), {});
});

test("getBookStatus reports none for unknown and invalid books", () => {
  const map = setBookStatus({}, 5, WANT, at(1));
  assert.equal(getBookStatus(map, 5), WANT);
  assert.equal(getBookStatus(map, "5"), WANT);
  assert.equal(getBookStatus(map, 99), NONE);
  assert.equal(getBookStatus(map, "nope"), NONE);
});

test("setBookStatus ignores invalid ids, statuses, and timestamps", () => {
  const base = setBookStatus({}, 1, WANT, at(1));
  assert.deepEqual(setBookStatus(base, null, COLLECTED, at(2)), base);
  assert.deepEqual(setBookStatus(base, 1, "bogus", at(2)), base);
  assert.deepEqual(setBookStatus(base, 1, COLLECTED, "nope"), base);
});

test("cycleCollectionStatus walks none to ordered to collected and back", () => {
  let map = cycleCollectionStatus({}, 3, at(1));
  assert.equal(getBookStatus(map, 3), ORDERED);
  map = cycleCollectionStatus(map, 3, at(2));
  assert.equal(getBookStatus(map, 3), COLLECTED);
  map = cycleCollectionStatus(map, 3, at(3));
  assert.equal(getBookStatus(map, 3), NONE);
  map = cycleCollectionStatus(map, 3, at(4));
  assert.equal(getBookStatus(map, 3), ORDERED);
});

test("cycleCollectionStatus replaces a want, since the statuses are exclusive", () => {
  const wanted = setWantStatus({}, 8, true, at(1));
  const ordered = cycleCollectionStatus(wanted, 8, at(2));
  assert.equal(getBookStatus(ordered, 8), ORDERED);
  assert.deepEqual(deriveIdsByStatus(ordered).wantIds, []);
});

test("setWantStatus toggles on, tombstones off, and ignores a non-want book", () => {
  const wanted = setWantStatus({}, 4, true, at(1));
  assert.equal(getBookStatus(wanted, 4), WANT);

  const cleared = setWantStatus(wanted, 4, false, at(2));
  assert.equal(getBookStatus(cleared, 4), NONE);

  const collected = setBookStatus({}, 4, COLLECTED, at(1));
  assert.deepEqual(setWantStatus(collected, 4, false, at(2)), collected);
});

test("deriveIdsByStatus splits sorted ids per status and omits tombstones", () => {
  const map = {
    30: { status: COLLECTED, at: at(1) },
    10: { status: COLLECTED, at: at(1) },
    20: { status: ORDERED, at: at(1) },
    40: { status: WANT, at: at(1) },
    50: { status: NONE, at: at(1) },
  };
  assert.deepEqual(deriveIdsByStatus(map), {
    collectionIds: [10, 30],
    orderedIds: [20],
    wantIds: [40],
  });
});

test("mergeStatusMaps takes the newer stamp per book and unions both sides", () => {
  const local = {
    1: { status: COLLECTED, at: at(5) },
    2: { status: WANT, at: at(1) },
    3: { status: ORDERED, at: at(1) },
  };
  const remote = {
    1: { status: NONE, at: at(2) },
    2: { status: COLLECTED, at: at(9) },
    4: { status: WANT, at: at(1) },
  };
  const merged = mergeStatusMaps(local, remote);
  assert.equal(merged[1].status, COLLECTED, "newer local stamp wins");
  assert.equal(merged[2].status, COLLECTED, "newer remote stamp wins");
  assert.equal(merged[3].status, ORDERED, "local-only book survives");
  assert.equal(merged[4].status, WANT, "remote-only book survives");
});

test("mergeStatusMaps keeps the book when stamps tie", () => {
  const merged = mergeStatusMaps(
    { 1: { status: NONE, at: at(3) }, 2: { status: WANT, at: at(3) } },
    { 1: { status: COLLECTED, at: at(3) }, 2: { status: NONE, at: at(3) } },
  );
  assert.equal(merged[1].status, COLLECTED);
  assert.equal(merged[2].status, WANT);
});

test("mergeStatusMaps lets a recorded removal outrank an older positive status", () => {
  const merged = mergeStatusMaps(
    { 1: { status: NONE, at: at(9) } },
    { 1: { status: COLLECTED, at: at(2) } },
  );
  assert.equal(merged[1].status, NONE);
});

test("statusMapFromIdArrays stamps membership without inventing tombstones", () => {
  const map = statusMapFromIdArrays(
    { collectionIds: [1], orderedIds: [2], wantIds: [3] },
    at(4),
  );
  assert.deepEqual(map, {
    1: { status: COLLECTED, at: at(4) },
    2: { status: ORDERED, at: at(4) },
    3: { status: WANT, at: at(4) },
  });
  assert.equal(getBookStatus(map, 99), NONE);
  assert.equal(Object.keys(map).length, 3, "absent books get no stamp at all");
});

test("statusMapFromIdArrays resolves legacy overlap by strongest claim", () => {
  const map = statusMapFromIdArrays(
    { collectionIds: [1], orderedIds: [1], wantIds: [1] },
    at(1),
  );
  assert.equal(map[1].status, COLLECTED);
});

test("statusMapFromIdArrays needs a usable timestamp", () => {
  assert.deepEqual(statusMapFromIdArrays({ collectionIds: [1] }, "nope"), {});
});

test("replaceStatusesFromImport round-trips every exported status", () => {
  const before = {
    1: { status: COLLECTED, at: at(1) },
    2: { status: ORDERED, at: at(1) },
    3: { status: WANT, at: at(1) },
  };
  const after = replaceStatusesFromImport(
    before,
    [
      { id: 1, status: COLLECTED },
      { id: 2, status: ORDERED },
      { id: 3, status: WANT },
    ],
    at(5),
  );
  assert.equal(after[1].status, COLLECTED);
  assert.equal(after[2].status, ORDERED);
  assert.equal(after[3].status, WANT);
});

test("replaceStatusesFromImport tombstones membership missing from the file", () => {
  const after = replaceStatusesFromImport(
    {
      1: { status: COLLECTED, at: at(1) },
      2: { status: WANT, at: at(1) },
    },
    [{ id: 1, status: COLLECTED }],
    at(5),
  );
  assert.equal(after[1].status, COLLECTED);
  assert.equal(after[2].status, NONE);
  assert.equal(after[2].at, at(5));
});

test("replaceCollectionStatuses tombstones dropped books and keeps wants", () => {
  const before = {
    1: { status: COLLECTED, at: at(1) },
    2: { status: ORDERED, at: at(1) },
    3: { status: WANT, at: at(1) },
  };
  const after = replaceCollectionStatuses(before, [1, 9], at(5));
  assert.equal(after[1].status, COLLECTED, "still imported");
  assert.equal(after[2].status, NONE, "dropped from the import");
  assert.equal(after[2].at, at(5), "removal is stamped so it survives a merge");
  assert.equal(after[3].status, WANT, "wants are left alone");
  assert.equal(after[9].status, COLLECTED, "new id joins the collection");
});

test("replaceCollectionStatuses lets an imported book override a want", () => {
  const after = replaceCollectionStatuses(
    { 3: { status: WANT, at: at(1) } },
    [3],
    at(5),
  );
  assert.equal(after[3].status, COLLECTED);
});

test("supersedeStatusMap restamps the replacement and tombstones the rest", () => {
  const merged = supersedeStatusMap(
    { 1: { status: COLLECTED, at: at(1) }, 2: { status: WANT, at: at(1) } },
    { 2: { status: ORDERED, at: at(1) }, 3: { status: COLLECTED, at: at(1) } },
    at(9),
  );
  assert.deepEqual(merged, {
    1: { status: NONE, at: at(9) },
    2: { status: ORDERED, at: at(9) },
    3: { status: COLLECTED, at: at(9) },
  });
});

test("restampStatusMap moves every stamp forward without changing status", () => {
  const restamped = restampStatusMap(
    { 1: { status: COLLECTED, at: at(1) }, 2: { status: NONE, at: at(2) } },
    at(9),
  );
  assert.deepEqual(restamped, {
    1: { status: COLLECTED, at: at(9) },
    2: { status: NONE, at: at(9) },
  });
});
