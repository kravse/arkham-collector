/* Generated from scripts/lib/viewer-book-status.js — run npm run bundle-viewer */

const viewerBookStatus = (function () {
  /**
   * Per-book collection status with a change stamp on every book.
   *
   * Want, ordered, and collected are mutually exclusive in the viewer: setting one
   * clears the others, so each book carries exactly one status. Stamping each book
   * individually (instead of relying on a single `updatedAt` for the whole payload)
   * is what lets two devices merge without a stale tab erasing books it never knew
   * about. Removals are recorded as NONE tombstones rather than inferred from
   * absence, so a delete still outranks an older positive status.
   */
  
  const COLLECTED = "collected";
  const ORDERED = "ordered";
  const WANT = "want";
  const NONE = "none";
  
  const STATUS_VALUES = new Set([COLLECTED, ORDERED, WANT, NONE]);
  
  /**
   * Ranking used when two stamps carry the same instant. Ties keep the book, and
   * the stronger claim on a book wins, so a merge never silently drops data just
   * because two devices wrote in the same millisecond.
   */
  const TIE_PRIORITY = {
    [COLLECTED]: 3,
    [ORDERED]: 2,
    [WANT]: 1,
    [NONE]: 0,
  };
  
  function normalizeBookId(raw) {
    if (raw == null || raw === "") {
      return null;
    }
    const id = Number(raw);
    return Number.isInteger(id) ? id : null;
  }
  
  function normalizeStatusValue(raw) {
    return STATUS_VALUES.has(raw) ? raw : null;
  }
  
  function normalizeStampTime(raw) {
    if (typeof raw !== "string") {
      return null;
    }
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
  }
  
  function normalizeStamp(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    const status = normalizeStatusValue(raw.status);
    const at = normalizeStampTime(raw.at);
    return status && at ? { status, at } : null;
  }
  
  function emptyStatusMap() {
    return {};
  }
  
  function normalizeStatusMap(raw) {
    if (raw == null || raw === "") {
      return emptyStatusMap();
    }
    let source = raw;
    if (typeof source === "string") {
      try {
        source = JSON.parse(source);
      } catch (_) {
        return emptyStatusMap();
      }
    }
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      return emptyStatusMap();
    }
  
    const map = emptyStatusMap();
    for (const [key, value] of Object.entries(source)) {
      const id = normalizeBookId(key);
      const stamp = normalizeStamp(value);
      if (id != null && stamp) {
        map[id] = stamp;
      }
    }
    return map;
  }
  
  function getBookStatus(map, id) {
    const bookId = normalizeBookId(id);
    if (bookId == null) {
      return NONE;
    }
    const stamp = normalizeStamp(map?.[bookId]);
    return stamp ? stamp.status : NONE;
  }
  
  /** Newest stamp wins; same instant falls back to TIE_PRIORITY. */
  function pickWinningStamp(a, b) {
    if (!a) {
      return b || null;
    }
    if (!b) {
      return a;
    }
    const aTime = Date.parse(a.at);
    const bTime = Date.parse(b.at);
    if (aTime !== bTime) {
      return aTime > bTime ? a : b;
    }
    return TIE_PRIORITY[b.status] > TIE_PRIORITY[a.status] ? b : a;
  }
  
  function mergeStatusMaps(localMap, remoteMap) {
    const local = normalizeStatusMap(localMap);
    const remote = normalizeStatusMap(remoteMap);
    const merged = emptyStatusMap();
    for (const id of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const winner = pickWinningStamp(local[id], remote[id]);
      if (winner) {
        merged[id] = winner;
      }
    }
    return merged;
  }
  
  function setBookStatus(map, id, status, atIso) {
    const normalized = normalizeStatusMap(map);
    const bookId = normalizeBookId(id);
    const nextStatus = normalizeStatusValue(status);
    const at = normalizeStampTime(atIso);
    if (bookId == null || !nextStatus || !at) {
      return normalized;
    }
    return { ...normalized, [bookId]: { status: nextStatus, at } };
  }
  
  /** Mirrors the viewer's collect button: collected → none, ordered → collected, anything else → ordered. */
  function cycleCollectionStatus(map, id, atIso) {
    const current = getBookStatus(map, id);
    if (current === COLLECTED) {
      return setBookStatus(map, id, NONE, atIso);
    }
    if (current === ORDERED) {
      return setBookStatus(map, id, COLLECTED, atIso);
    }
    return setBookStatus(map, id, ORDERED, atIso);
  }
  
  /** Turning want off only clears a book that is actually wanted, matching syncWantMembership. */
  function setWantStatus(map, id, wanted, atIso) {
    if (wanted) {
      return setBookStatus(map, id, WANT, atIso);
    }
    if (getBookStatus(map, id) !== WANT) {
      return normalizeStatusMap(map);
    }
    return setBookStatus(map, id, NONE, atIso);
  }
  
  function idsWithStatus(map, status) {
    const normalized = normalizeStatusMap(map);
    const ids = [];
    for (const [key, stamp] of Object.entries(normalized)) {
      if (stamp.status === status) {
        ids.push(Number(key));
      }
    }
    ids.sort((a, b) => a - b);
    return ids;
  }
  
  function deriveIdsByStatus(map) {
    const normalized = normalizeStatusMap(map);
    return {
      collectionIds: idsWithStatus(normalized, COLLECTED),
      orderedIds: idsWithStatus(normalized, ORDERED),
      wantIds: idsWithStatus(normalized, WANT),
    };
  }
  
  /**
   * Seed a status map from the flat v2 id arrays. Conflicting membership in legacy
   * data resolves by TIE_PRIORITY, and absent books get no tombstone: "unknown"
   * loses to any positive stamp, so migrating can never delete a book.
   */
  function statusMapFromIdArrays(arrays, atIso) {
    const at = normalizeStampTime(atIso);
    if (!at) {
      return emptyStatusMap();
    }
    const map = emptyStatusMap();
    const seed = [
      [WANT, arrays?.wantIds],
      [ORDERED, arrays?.orderedIds],
      [COLLECTED, arrays?.collectionIds],
    ];
    for (const [status, ids] of seed) {
      for (const raw of Array.isArray(ids) ? ids : []) {
        const id = normalizeBookId(raw);
        if (id == null) {
          continue;
        }
        const existing = map[id];
        if (!existing || TIE_PRIORITY[status] > TIE_PRIORITY[existing.status]) {
          map[id] = { status, at };
        }
      }
    }
    return map;
  }
  
  /**
   * Replace collected / ordered / want membership from a CSV import. Every book
   * listed in the file gets the imported status; anything previously in one of
   * those states but missing from the file is tombstoned so export → re-import
   * round-trips exactly.
   */
  function replaceStatusesFromImport(map, entries, atIso) {
    const normalized = normalizeStatusMap(map);
    const at = normalizeStampTime(atIso);
    if (!at) {
      return normalized;
    }
  
    const importedById = new Map();
    for (const entry of Array.isArray(entries) ? entries : []) {
      const id = normalizeBookId(entry?.id);
      const status = normalizeStatusValue(entry?.status);
      if (id != null && status && status !== NONE) {
        importedById.set(id, status);
      }
    }
  
    const next = { ...normalized };
    for (const [key, stamp] of Object.entries(normalized)) {
      const id = Number(key);
      const hadMembership =
        stamp.status === COLLECTED ||
        stamp.status === ORDERED ||
        stamp.status === WANT;
      if (hadMembership && !importedById.has(id)) {
        next[id] = { status: NONE, at };
      }
    }
    for (const [id, status] of importedById) {
      next[id] = { status, at };
    }
    return next;
  }
  
  /**
   * Legacy collected-only import: every matched id becomes collected; ordered
   * titles drop out; wants are left alone unless listed (then collected wins).
   */
  function replaceCollectionStatuses(map, ids, atIso) {
    const entries = (Array.isArray(ids) ? ids : []).map((raw) => ({
      id: raw,
      status: COLLECTED,
    }));
    const normalized = normalizeStatusMap(map);
    const at = normalizeStampTime(atIso);
    if (!at) {
      return normalized;
    }
  
    const imported = new Set(
      entries
        .map((entry) => normalizeBookId(entry.id))
        .filter((id) => id != null),
    );
  
    const next = emptyStatusMap();
    for (const [key, stamp] of Object.entries(normalized)) {
      const id = Number(key);
      if (imported.has(id)) {
        continue;
      }
      next[id] =
        stamp.status === COLLECTED || stamp.status === ORDERED
          ? { status: NONE, at }
          : stamp;
    }
    for (const id of imported) {
      next[id] = { status: COLLECTED, at };
    }
    return next;
  }
  
  /**
   * Replace `baseMap` wholesale with `nextMap`, stamped at one instant.
   *
   * Restoring a backup has to beat whatever is on the server, and a snapshot's own
   * stamps are by definition older. Books the snapshot does not mention get
   * tombstones so the restore stays faithful instead of quietly keeping books the
   * user restored away from.
   */
  function supersedeStatusMap(baseMap, nextMap, atIso) {
    const base = normalizeStatusMap(baseMap);
    const next = normalizeStatusMap(nextMap);
    const at = normalizeStampTime(atIso);
    if (!at) {
      return base;
    }
    const merged = emptyStatusMap();
    for (const key of Object.keys(base)) {
      merged[Number(key)] = { status: NONE, at };
    }
    for (const [key, stamp] of Object.entries(next)) {
      merged[Number(key)] = { status: stamp.status, at };
    }
    return merged;
  }
  
  /**
   * Re-stamp every book at one instant. Restoring a backup has to outrank whatever
   * is on the server, and the snapshot's original stamps are by definition older.
   */
  function restampStatusMap(map, atIso) {
    const normalized = normalizeStatusMap(map);
    const at = normalizeStampTime(atIso);
    if (!at) {
      return normalized;
    }
    const next = emptyStatusMap();
    for (const [key, stamp] of Object.entries(normalized)) {
      next[Number(key)] = { status: stamp.status, at };
    }
    return next;
  }
  return {
    COLLECTED,
    ORDERED,
    WANT,
    NONE,
    normalizeBookId,
    normalizeStampTime,
    emptyStatusMap,
    normalizeStatusMap,
    getBookStatus,
    mergeStatusMaps,
    setBookStatus,
    cycleCollectionStatus,
    setWantStatus,
    deriveIdsByStatus,
    statusMapFromIdArrays,
    replaceStatusesFromImport,
    replaceCollectionStatuses,
    supersedeStatusMap,
    restampStatusMap,
  };
})();
