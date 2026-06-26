/* Generated from scripts/lib/viewer-want-order.js — run npm run bundle-viewer */

const viewerWantOrder = (function () {
  const {
    normalizeWantIdList,
    normalizeWantMembership,
    normalizeWantOrderIds,
  } = viewerWantOrderNormalize;
  
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
  
  function normalizeRect(rect) {
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right != null ? rect.right : rect.left + rect.width,
      bottom: rect.bottom != null ? rect.bottom : rect.top + rect.height,
    };
  }
  
  function rectOverlapArea(a, b) {
    const ra = normalizeRect(a);
    const rb = normalizeRect(b);
    const width = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left));
    const height = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
    return width * height;
  }
  
  /**
   * Pick the card the floating (lifted) card overlaps most. `cardRects`
   * includes the dragged card's own slot, so "still mostly over my own
   * slot" resolves to the drag id and we return null (no target). Returns
   * null when there is no overlap at all (released outside the grid).
   */
  function pickOverlapTargetId(floatingRect, cardRects, dragId) {
    const drag = Number(dragId);
    let bestId = null;
    let bestArea = 0;
    for (const item of cardRects) {
      const area = rectOverlapArea(floatingRect, item.rect);
      if (area > bestArea) {
        bestArea = area;
        bestId = Number(item.id);
      }
    }
    if (bestArea <= 0) {
      return null;
    }
    return bestId === drag ? null : bestId;
  }
  
  function buildWantDisplayRankById(wantOrderIds, visibleIds) {
    const visible = new Set(
      (visibleIds instanceof Set ? [...visibleIds] : visibleIds).map(Number),
    );
    const rankById = new Map();
    let rank = 0;
    for (const id of wantOrderIds) {
      const numericId = Number(id);
      if (!visible.has(numericId)) {
        continue;
      }
      rank += 1;
      rankById.set(numericId, rank);
    }
    return rankById;
  }
  return {
    normalizeWantOrderIds,
    buildWantOrderIndex,
    sortBooksByWantOrder,
    wouldMoveWantToIndex,
    reorderWantOrderIds,
    rectOverlapArea,
    pickOverlapTargetId,
    orderRowIdsByWantOrder,
    buildWantDisplayRankById,
  };
})();
