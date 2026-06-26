/* Want list priority drag reorder (list view, ranked mode) */

let wantRankDragId = null;
let wantRankPointerDrag = null;
let wantRankDragStartOrder = null;
let wantRankLastTargetId = null;
let wantRankLastGlowRow = null;
let wantRankDragDirty = false;

const WANT_RANK_ROW_GAP_SLOP = 20;

function isWantRankDragActive() {
  return wantRankPointerDrag != null;
}

function canReorderWantRank() {
  return isWantRankedFilterActive() && !hasActiveSearch();
}

function findWantRankRowAtPoint(clientX, clientY) {
  return viewerPointerReorder.findNearestRowAtPoint({
    root: grid,
    clientX,
    clientY,
    rowSelector: ".want-rank-row",
    excludeRow: null,
    gapSlop: WANT_RANK_ROW_GAP_SLOP,
    elementsFromPoint: document.elementsFromPoint.bind(document),
  });
}

function reorderWantToTarget(dragId, targetId) {
  const next = viewerWantOrder.reorderWantOrderIds(
    wantOrderIds,
    dragId,
    targetId,
  );
  if (next === wantOrderIds) {
    return false;
  }
  setWantOrderIds(next);
  return true;
}

function getWantRankRowBookId(row) {
  const card = row?.querySelector(".card");
  const bookId = Number(card?.dataset.bookId);
  return Number.isInteger(bookId) ? bookId : null;
}

function syncWantRankRowDomOrder() {
  const rows = [...grid.querySelectorAll(".want-rank-row")];
  if (!rows.length) {
    return;
  }

  const presentIds = rows
    .map((row) => getWantRankRowBookId(row))
    .filter((id) => id != null);
  const orderedIds = viewerWantOrder.orderRowIdsByWantOrder(
    presentIds,
    wantOrderIds,
  );
  const rowById = new Map(
    rows
      .map((row) => [getWantRankRowBookId(row), row])
      .filter(([id]) => id != null),
  );

  for (const id of orderedIds) {
    const row = rowById.get(id);
    if (row) {
      grid.appendChild(row);
    }
  }
}

function updateWantRankHandleLabels() {
  const rankById = new Map(
    wantOrderIds.map((id, index) => [Number(id), index + 1]),
  );

  grid.querySelectorAll(".want-rank-row").forEach((row) => {
    const bookId = getWantRankRowBookId(row);
    const rank = bookId == null ? null : rankById.get(bookId);
    const handle = row.querySelector(".want-rank-drag-handle");
    if (!handle || rank == null) {
      return;
    }
    handle.textContent = String(rank);
    handle.setAttribute("aria-label", `Drag to reorder — rank ${rank}`);
  });
}

function clearWantRankDragState() {
  wantRankDragId = null;
  wantRankPointerDrag = null;
  wantRankDragStartOrder = null;
  wantRankLastTargetId = null;
  wantRankLastGlowRow = null;
  wantRankDragDirty = false;
  document.body.classList.remove("want-rank-drag-active");
  grid
    .querySelectorAll(
      ".card-want-rank-dragging, .want-rank-drop-target",
    )
    .forEach((element) => {
      element.classList.remove(
        "card-want-rank-dragging",
        "want-rank-drop-target",
      );
    });
}

function updateWantRankDropTarget(row) {
  if (row) {
    wantRankLastGlowRow = row;
  }

  const glowRow = wantRankLastGlowRow;
  grid.querySelectorAll(".want-rank-drop-target").forEach((element) => {
    if (element !== glowRow) {
      element.classList.remove("want-rank-drop-target");
    }
  });

  if (!glowRow || !wantRankDragId) {
    return;
  }

  glowRow.classList.add("want-rank-drop-target");
}

function tryLiveWantRankReorder(targetCard) {
  if (!targetCard || !wantRankDragId || targetCard === wantRankPointerDrag?.card) {
    return;
  }

  const targetId = Number(targetCard.dataset.bookId);
  if (!Number.isInteger(targetId) || targetId === wantRankLastTargetId) {
    return;
  }

  wantRankLastTargetId = targetId;
  const targetIndex = wantOrderIds.indexOf(targetId);
  if (
    !viewerWantOrder.wouldMoveWantToIndex(
      wantOrderIds,
      wantRankDragId,
      targetIndex,
    )
  ) {
    return;
  }

  if (!reorderWantToTarget(wantRankDragId, targetId)) {
    return;
  }

  wantRankDragDirty = true;
  syncWantRankRowDomOrder();
  updateWantRankHandleLabels();
  wantRankPointerDrag.card.classList.add("card-want-rank-dragging");
}

function onWantRankPointerDown(event) {
  if (!canReorderWantRank() || event.button !== 0) {
    return;
  }

  const handle = event.target.closest(".want-rank-drag-handle");
  if (!handle) {
    return;
  }

  const row = handle.closest(".want-rank-row");
  const card = row?.querySelector(".card");
  if (!card) {
    return;
  }

  const bookId = Number(card.dataset.bookId);
  if (!Number.isInteger(bookId)) {
    return;
  }

  event.preventDefault();
  handle.setPointerCapture(event.pointerId);

  wantRankDragId = bookId;
  wantRankDragStartOrder = [...wantOrderIds];
  wantRankLastTargetId = null;
  wantRankLastGlowRow = null;
  wantRankDragDirty = false;
  wantRankPointerDrag = {
    card,
    pointerId: event.pointerId,
  };
  document.body.classList.add("want-rank-drag-active");
  card.classList.add("card-want-rank-dragging");
}

function onWantRankPointerMove(event) {
  if (
    !wantRankPointerDrag ||
    wantRankPointerDrag.pointerId !== event.pointerId ||
    !canReorderWantRank()
  ) {
    return;
  }

  event.preventDefault();
  const row = findWantRankRowAtPoint(event.clientX, event.clientY);
  const card = row?.querySelector(".card") ?? null;
  tryLiveWantRankReorder(card);
  updateWantRankDropTarget(row);
}

function finishWantRankPointerDrag(event) {
  if (
    !wantRankPointerDrag ||
    wantRankPointerDrag.pointerId !== event.pointerId
  ) {
    return;
  }

  if (canReorderWantRank() && wantRankDragId) {
    const row = findWantRankRowAtPoint(event.clientX, event.clientY);
    const card = row?.querySelector(".card") ?? null;
    if (card && card !== wantRankPointerDrag.card) {
      tryLiveWantRankReorder(card);
    }

    if (event.type === "pointercancel" && wantRankDragStartOrder) {
      setWantOrderIds(wantRankDragStartOrder);
      syncWantRankRowDomOrder();
      updateWantRankHandleLabels();
    } else if (wantRankDragDirty) {
      saveUserState();
    }
  }

  clearWantRankDragState();
}

grid.addEventListener("pointerdown", onWantRankPointerDown);
grid.addEventListener("pointermove", onWantRankPointerMove);
grid.addEventListener("pointerup", finishWantRankPointerDrag);
grid.addEventListener("pointercancel", finishWantRankPointerDrag);
