/* Generated from scripts/lib/viewer-gist-backup.js — run npm run bundle-viewer */

const viewerGistBackup = (function () {
  /**
   * Gist snapshot backups: one private gist, one JSON file, up to five immutable
   * state entries appended over time.
   */
  
  const BACKUP_GIST_DESCRIPTION = "Arkham Collector backups";
  const BACKUP_FILENAME = "arkham-collector-backups.json";
  const BACKUP_PAYLOAD_VERSION = 1;
  const MAX_SNAPSHOTS = 5;
  const SNAPSHOT_INTERVAL_MS = 24 * 60 * 60 * 1000;
  
  function emptyBackupPayload() {
    return { version: BACKUP_PAYLOAD_VERSION, snapshots: [] };
  }
  
  function normalizeAtStamp(value) {
    const time = Date.parse(String(value || ""));
    if (!Number.isFinite(time)) {
      return null;
    }
    return new Date(time).toISOString();
  }
  
  function normalizeSnapshotEntry(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const at = normalizeAtStamp(entry.at);
    const state = entry.state;
    if (!at || !state || typeof state !== "object") {
      return null;
    }
    return { at, state };
  }
  
  function parseBackupPayload(json) {
    if (json == null || json === "") {
      return emptyBackupPayload();
    }
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      if (!parsed || typeof parsed !== "object") {
        return emptyBackupPayload();
      }
      const snapshots = Array.isArray(parsed.snapshots)
        ? parsed.snapshots.map(normalizeSnapshotEntry).filter(Boolean)
        : [];
      snapshots.sort((a, b) => a.at.localeCompare(b.at));
      return {
        version: BACKUP_PAYLOAD_VERSION,
        snapshots,
      };
    } catch (_) {
      return emptyBackupPayload();
    }
  }
  
  function serializeBackupPayload(payload) {
    const snapshots = Array.isArray(payload?.snapshots)
      ? payload.snapshots.map(normalizeSnapshotEntry).filter(Boolean)
      : [];
    snapshots.sort((a, b) => a.at.localeCompare(b.at));
    return JSON.stringify(
      {
        version: BACKUP_PAYLOAD_VERSION,
        snapshots,
      },
      null,
      2,
    );
  }
  
  function snapshotListEntries(payload) {
    return (payload?.snapshots || []).map((entry) => ({ at: entry.at }));
  }
  
  function shouldCreateSnapshot(snapshots, nowMs, intervalMs = SNAPSHOT_INTERVAL_MS) {
    if (!snapshots?.length) {
      return true;
    }
    const latestAt = Date.parse(snapshots[snapshots.length - 1]?.at || "");
    if (!Number.isFinite(latestAt)) {
      return true;
    }
    return nowMs - latestAt >= intervalMs;
  }
  
  function appendSnapshot(payload, state, at, maxSnapshots = MAX_SNAPSHOTS) {
    const atIso = normalizeAtStamp(at);
    if (!atIso || !state || typeof state !== "object") {
      return payload || emptyBackupPayload();
    }
    const previous = (payload?.snapshots || [])
      .map(normalizeSnapshotEntry)
      .filter(Boolean);
    const next = [...previous, { at: atIso, state }];
    const trimmed =
      next.length > maxSnapshots ? next.slice(next.length - maxSnapshots) : next;
    return {
      version: BACKUP_PAYLOAD_VERSION,
      snapshots: trimmed,
    };
  }
  
  function findSnapshotByAt(payload, at) {
    const needle = normalizeAtStamp(at);
    if (!needle) {
      return null;
    }
    return (payload?.snapshots || []).find((entry) => entry.at === needle) || null;
  }
  
  function findBackupGistId(gists, syncGistId) {
    if (!Array.isArray(gists)) {
      return null;
    }
    let byDescription = null;
    for (const gist of gists) {
      if (!gist?.id || gist.id === syncGistId) {
        continue;
      }
      const files = gist.files || {};
      if (files[BACKUP_FILENAME]) {
        return gist.id;
      }
      if (gist.description === BACKUP_GIST_DESCRIPTION && !byDescription) {
        byDescription = gist.id;
      }
    }
    return byDescription;
  }
  
  function buildBackupGistCreatePayload(contentJson) {
    return {
      description: BACKUP_GIST_DESCRIPTION,
      public: false,
      files: { [BACKUP_FILENAME]: { content: contentJson } },
    };
  }
  
  function buildBackupGistUpdatePayload(contentJson) {
    return {
      files: { [BACKUP_FILENAME]: { content: contentJson } },
    };
  }
  
  function extractBackupContent(body) {
    if (!body?.files || typeof body.files !== "object") {
      return null;
    }
    const content = body.files[BACKUP_FILENAME]?.content;
    return typeof content === "string" ? content : null;
  }
  return {
    BACKUP_GIST_DESCRIPTION,
    BACKUP_FILENAME,
    BACKUP_PAYLOAD_VERSION,
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
  };
})();
