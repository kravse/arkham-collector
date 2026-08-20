const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  BACKUP_FILENAME,
  MAX_SNAPSHOTS,
  SNAPSHOT_INTERVAL_MS,
  emptyBackupPayload,
  parseBackupPayload,
  serializeBackupPayload,
  snapshotListEntries,
  shouldCreateSnapshot,
  appendSnapshot,
  findSnapshotByAt,
  findBackupGistId,
  buildBackupGistCreatePayload,
  buildBackupGistUpdatePayload,
  extractBackupContent,
  BACKUP_GIST_DESCRIPTION,
} = require("../scripts/lib/viewer-gist-backup");

const stateA = { version: 2, collectionIds: [1], wantIds: [] };
const stateB = { version: 2, collectionIds: [1, 2], wantIds: [3] };

test("parseBackupPayload and serializeBackupPayload round-trip", () => {
  const payload = {
    version: 1,
    snapshots: [{ at: "2026-08-19T12:00:00.000Z", state: stateA }],
  };
  const parsed = parseBackupPayload(serializeBackupPayload(payload));
  assert.equal(parsed.snapshots.length, 1);
  assert.equal(parsed.snapshots[0].at, "2026-08-19T12:00:00.000Z");
  assert.deepEqual(parsed.snapshots[0].state, stateA);
});

test("shouldCreateSnapshot requires an empty list or a one-day gap", () => {
  const now = Date.parse("2026-08-21T12:00:00.000Z");
  assert.equal(shouldCreateSnapshot([], now), true);
  assert.equal(
    shouldCreateSnapshot([{ at: "2026-08-21T08:00:00.000Z", state: stateA }], now),
    false,
  );
  assert.equal(
    shouldCreateSnapshot(
      [{ at: "2026-08-20T11:00:00.000Z", state: stateA }],
      now,
      SNAPSHOT_INTERVAL_MS,
    ),
    true,
  );
});

test("appendSnapshot keeps prior entries unchanged and drops the oldest", () => {
  let next = appendSnapshot(emptyBackupPayload(), stateA, "2026-08-19T12:00:00.000Z");
  next = appendSnapshot(next, stateB, "2026-08-19T12:30:00.000Z");
  assert.equal(next.snapshots.length, 2);
  assert.deepEqual(next.snapshots[0].state, stateA);

  for (let i = 0; i < 4; i += 1) {
    next = appendSnapshot(next, stateB, `2026-08-19T1${i + 3}:00:00.000Z`);
  }
  assert.equal(next.snapshots.length, MAX_SNAPSHOTS);
  assert.equal(next.snapshots[0].at, "2026-08-19T12:30:00.000Z");
});

test("findBackupGistId prefers the predictable backup filename", () => {
  const gists = [
    {
      id: "sync",
      description: "Arkham Collector sync",
      files: { "arkham-collector-state.json": {} },
    },
    {
      id: "backup",
      description: BACKUP_GIST_DESCRIPTION,
      files: { [BACKUP_FILENAME]: {} },
    },
  ];
  assert.equal(findBackupGistId(gists, "sync"), "backup");
});

test("findBackupGistId ignores moviecollector backup gists", () => {
  const gists = [
    { id: "sync", files: { "arkham-collector-state.json": {} } },
    {
      id: "movie-backup",
      description: "Movie collector backups",
      files: { "moviecollector-backups.json": {} },
    },
  ];
  assert.equal(findBackupGistId(gists, "sync"), null);
});

test("backup gist payloads use one private file", () => {
  const content = serializeBackupPayload(emptyBackupPayload());
  const create = buildBackupGistCreatePayload(content);
  assert.equal(create.public, false);
  assert.equal(create.description, BACKUP_GIST_DESCRIPTION);
  assert.deepEqual(Object.keys(create.files), [BACKUP_FILENAME]);

  const update = buildBackupGistUpdatePayload(content);
  assert.deepEqual(Object.keys(update.files), [BACKUP_FILENAME]);
});

test("snapshotListEntries and findSnapshotByAt expose restore metadata", () => {
  const payload = appendSnapshot(emptyBackupPayload(), stateA, "2026-08-19T12:00:00.000Z");
  assert.deepEqual(snapshotListEntries(payload), [
    { at: "2026-08-19T12:00:00.000Z" },
  ]);
  assert.deepEqual(
    findSnapshotByAt(payload, "2026-08-19T12:00:00.000Z")?.state,
    stateA,
  );
});

test("extractBackupContent reads the backup file from a gist body", () => {
  const body = {
    files: {
      [BACKUP_FILENAME]: { content: '{"version":1,"snapshots":[]}' },
    },
  };
  assert.equal(
    extractBackupContent(body),
    '{"version":1,"snapshots":[]}',
  );
  assert.equal(extractBackupContent({ files: {} }), null);
});
