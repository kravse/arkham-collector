const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  GIST_STATE_FILENAME,
  mergeUserStateByUpdatedAt,
  mergeGistUserState,
  extractStateJsonFromGistResponse,
  findArkhamGistId,
  buildGistCreatePayload,
  buildGistUpdatePayload,
  parseGistSyncConfig,
  isConnectedGistConfig,
} = require("../scripts/lib/viewer-gist-sync");
const {
  normalizeCollections,
  normalizeCollectionSlot,
  emptyCollectionSlot,
} = require("../scripts/lib/viewer-user-state");

const localState = {
  version: 2,
  updatedAt: "2026-06-01T12:00:00.000Z",
  storageMode: "gist",
  collectionIds: [1],
  orderedIds: [],
  wantIds: [],
  preferences: {},
};

const remoteState = {
  version: 2,
  updatedAt: "2026-06-02T12:00:00.000Z",
  storageMode: "gist",
  collectionIds: [2],
  orderedIds: [],
  wantIds: [],
  preferences: {},
};

test("mergeUserStateByUpdatedAt prefers newer updatedAt", () => {
  assert.deepEqual(
    mergeUserStateByUpdatedAt(localState, remoteState).collectionIds,
    [2],
  );
  assert.deepEqual(
    mergeUserStateByUpdatedAt(remoteState, localState).collectionIds,
    [2],
  );
});

test("mergeUserStateByUpdatedAt keeps local when remote missing", () => {
  assert.deepEqual(mergeUserStateByUpdatedAt(localState, null), localState);
});

test("mergeGistUserState preserves local collection when remote wins", () => {
  const local = {
    ...localState,
    collections: {
      local: { collectionIds: [10], orderedIds: [] },
      gist: { collectionIds: [1], orderedIds: [] },
    },
  };
  const remote = {
    ...remoteState,
    collections: {
      local: { collectionIds: [99], orderedIds: [] },
      gist: { collectionIds: [2], orderedIds: [] },
    },
  };
  const merged = mergeGistUserState(local, remote, {
    normalizeCollections,
    normalizeCollectionSlot,
    emptyCollectionSlot,
  });
  assert.deepEqual(merged.collections.local.collectionIds, [10]);
  assert.deepEqual(merged.collections.gist.collectionIds, [2]);
});

test("findArkhamGistId picks gist with state.json", () => {
  assert.equal(
    findArkhamGistId([
      { id: "a", files: { "notes.txt": {} } },
      { id: "b", files: { "state.json": { content: "{}" } } },
    ]),
    "b",
  );
  assert.equal(findArkhamGistId([]), null);
});

test("extractStateJsonFromGistResponse reads state.json content", () => {
  const json = extractStateJsonFromGistResponse({
    files: {
      [GIST_STATE_FILENAME]: { content: '{"version":2}' },
    },
  });
  assert.equal(json, '{"version":2}');
});

test("gist payload builders wrap state.json", () => {
  const content = '{"version":2}';
  assert.deepEqual(buildGistCreatePayload(content).files[GIST_STATE_FILENAME], {
    content,
  });
  assert.deepEqual(buildGistUpdatePayload(content).files[GIST_STATE_FILENAME], {
    content,
  });
});

test("parseGistSyncConfig requires token", () => {
  assert.equal(parseGistSyncConfig(null), null);
  assert.deepEqual(parseGistSyncConfig('{"token":"abc","gistId":"123"}'), {
    token: "abc",
    gistId: "123",
  });
  assert.equal(isConnectedGistConfig({ token: "abc", gistId: "" }), false);
  assert.equal(isConnectedGistConfig({ token: "abc", gistId: "123" }), true);
});
