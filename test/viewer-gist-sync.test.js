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
  resolveGistConnectState,
} = require("../scripts/lib/viewer-gist-sync");
const {
  normalizeCollections,
  normalizeCollectionSlot,
  emptyCollectionSlot,
  defaultUserState,
  adoptRemoteGistState,
  buildNewGistConnectState,
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

test("findArkhamGistId picks arkham sync filename and legacy state.json", () => {
  assert.equal(
    findArkhamGistId([
      { id: "a", files: { "notes.txt": {} } },
      { id: "b", files: { "state.json": { content: "{}" } } },
    ]),
    "b",
  );
  assert.equal(
    findArkhamGistId([
      { id: "legacy", files: { "state.json": { content: "{}" } } },
      { id: "current", files: { [GIST_STATE_FILENAME]: { content: "{}" } } },
    ]),
    "current",
  );
  assert.equal(findArkhamGistId([]), null);
});

test("extractStateJsonFromGistResponse reads arkham sync file content", () => {
  const json = extractStateJsonFromGistResponse({
    files: {
      [GIST_STATE_FILENAME]: { content: '{"version":2}' },
    },
  });
  assert.equal(json, '{"version":2}');
});

test("extractStateJsonFromGistResponse falls back to legacy state.json", () => {
  const json = extractStateJsonFromGistResponse({
    files: {
      "state.json": { content: '{"version":2}' },
    },
  });
  assert.equal(json, '{"version":2}');
});

test("gist payload builders wrap arkham sync filename", () => {
  const content = '{"version":2}';
  assert.deepEqual(buildGistCreatePayload(content).files[GIST_STATE_FILENAME], {
    content,
  });
  assert.deepEqual(
    buildGistUpdatePayload(content, "state.json").files["state.json"],
    { content },
  );
});

test("parseGistSyncConfig requires token and stores backup gist id", () => {
  assert.equal(parseGistSyncConfig(null), null);
  assert.deepEqual(parseGistSyncConfig('{"token":"abc","gistId":"123"}'), {
    token: "abc",
    gistId: "123",
    backupGistId: "",
    stateFilename: "",
  });
  assert.deepEqual(
    parseGistSyncConfig(
      '{"token":"abc","gistId":"123","backupGistId":"backup","stateFilename":"state.json"}',
    ),
    {
      token: "abc",
      gistId: "123",
      backupGistId: "backup",
      stateFilename: "state.json",
    },
  );
  assert.equal(isConnectedGistConfig({ token: "abc", gistId: "" }), false);
  assert.equal(isConnectedGistConfig({ token: "abc", gistId: "123" }), true);
});

const connectHelpers = {
  adoptRemoteGistState,
  buildNewGistConnectState,
};

test("resolveGistConnectState adopts existing gist without creating empty state", () => {
  const remote = {
    version: 2,
    updatedAt: "2026-06-02T00:00:00.000Z",
    storageMode: "gist",
    collectionIds: [5, 6],
    orderedIds: [7],
    wantIds: [8],
    preferences: defaultUserState().preferences,
    collections: {
      local: { collectionIds: [], orderedIds: [] },
      gist: { collectionIds: [5, 6], orderedIds: [7] },
    },
  };
  const resolved = resolveGistConnectState({
    gistId: "abc123",
    remoteState: remote,
    localPersisted: {
      collections: {
        local: { collectionIds: [1], orderedIds: [] },
      },
    },
    ...connectHelpers,
  });
  assert.equal(resolved.ok, true);
  assert.equal(resolved.action, "adopt");
  assert.deepEqual(resolved.nextState.collections.gist.collectionIds, [5, 6]);
});

test("resolveGistConnectState refuses to overwrite when existing gist is unreadable", () => {
  const missing = resolveGistConnectState({
    gistId: "abc123",
    remoteState: null,
    localPersisted: {},
    ...connectHelpers,
  });
  assert.equal(missing.ok, false);
  assert.match(missing.error, /not changed/i);

  const invalid = resolveGistConnectState({
    gistId: "abc123",
    remoteState: { version: 999 },
    localPersisted: {},
    ...connectHelpers,
  });
  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /invalid/i);
});

test("resolveGistConnectState creates new gist state from local collection", () => {
  const resolved = resolveGistConnectState({
    gistId: "",
    remoteState: null,
    localPersisted: {
      storageMode: "local",
      collectionIds: [2, 3],
      orderedIds: [],
      collections: {
        local: { collectionIds: [2, 3], orderedIds: [] },
      },
    },
    ...connectHelpers,
  });
  assert.equal(resolved.ok, true);
  assert.equal(resolved.action, "create");
  assert.deepEqual(resolved.nextState.collections.gist.collectionIds, [2, 3]);
});
