const {
  normalizeWantIdList,
  normalizeWantMembership,
  normalizeWantOrderIds,
} = require("./viewer-want-order-normalize");

function compareWantOrderTiebreak(a, b, bookOrderIndex) {
  const indexA = bookOrderIndex.has(a.id) ? bookOrderIndex.get(a.id) : a.id;
  const indexB = bookOrderIndex.has(b.id) ? bookOrderIndex.get(b.id) : b.id;
  if (indexA !== indexB) {
    return indexA - indexB;
  }
  return a.id - b.id;
}

function buildWantOrderIndex(wantOrderIds) {
  return new Map(wantOrderIds.map((id, index) => [Number(id), index]));
}

function sortBooksByWantOrder(books, wantOrderIds, bookOrderIndex) {
  const wantOrderIndex = buildWantOrderIndex(wantOrderIds);
  const copy = [...books];
  return copy.sort((a, b) => {
    const indexA = wantOrderIndex.has(a.id)
      ? wantOrderIndex.get(a.id)
      : Number.MAX_SAFE_INTEGER;
    const indexB = wantOrderIndex.has(b.id)
      ? wantOrderIndex.get(b.id)
      : Number.MAX_SAFE_INTEGER;
    if (indexA !== indexB) {
      return indexA - indexB;
    }
    return compareWantOrderTiebreak(a, b, bookOrderIndex);
  });
}

function wouldMoveWantToIndex(wantOrderIds, dragId, targetIndex) {
  const from = wantOrderIds.indexOf(dragId);
  if (
    from < 0 ||
    targetIndex < 0 ||
    targetIndex >= wantOrderIds.length ||
    from === targetIndex
  ) {
    return false;
  }
  return true;
}

function reorderWantOrderIds(wantOrderIds, dragId, targetId) {
  const from = wantOrderIds.indexOf(dragId);
  const to = wantOrderIds.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) {
    return wantOrderIds;
  }

  const next = [...wantOrderIds];
  next.splice(from, 1);
  next.splice(to, 0, dragId);
  return next;
}

function orderRowIdsByWantOrder(presentRowIds, wantOrderIds) {
  const present = new Set(presentRowIds.map((id) => Number(id)));
  return wantOrderIds.filter((id) => present.has(Number(id)));
}

module.exports = {
  normalizeWantIdList,
  normalizeWantMembership,
  normalizeWantOrderIds,
  buildWantOrderIndex,
  sortBooksByWantOrder,
  wouldMoveWantToIndex,
  reorderWantOrderIds,
  orderRowIdsByWantOrder,
};
