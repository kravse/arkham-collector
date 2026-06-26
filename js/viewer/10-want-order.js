/* Want list priority drag reorder (list view, ranked mode) */

let wantRankDragId = null;
let wantRankPointerDrag = null;

function canReorderWantRank() {
  return isWantRankedFilterActive() && !hasActiveSearch();
}

function findWantRankCardAtPoint(clientX, clientY, excludeCard) {
  const excludeRow = excludeCard?.closest(".want-rank-row");
  const elements = document.elementsFromPoint(clientX, clientY);
  if (!Array.isArray(elements)) {
    return null;
  }

  for (const element of elements) {
    if (!element || typeof element.closest !== "function") {
      continue;
    }

    const rankRow = element.closest(".want-rank-row");
    if (rankRow && rankRow !== excludeRow && grid.contains(rankRow)) {
      const card = rankRow.querySelector(".card");
      if (card && card !== excludeCard) {
        return card;
      }
    }

    const card = element.closest(".card");
    if (card && card !== excludeCard && grid.contains(card)) {
      return card;
    }
  }

  return null;
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

function clearWantRankDragState() {
  wantRankDragId = null;
  wantRankPointerDrag = null;
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

function updateWantRankDropTarget(card) {
  grid.querySelectorAll(".want-rank-drop-target").forEach((row) => {
    const rowCard = row.querySelector(".card");
    if (!card || rowCard !== card) {
      row.classList.remove("want-rank-drop-target");
    }
  });

  if (!card || !wantRankDragId) {
    return;
  }

  const row = card.closest(".want-rank-row");
  if (!row) {
    return;
  }

  const targetId = Number(card.dataset.bookId);
  const targetIndex = wantOrderIds.indexOf(targetId);
  if (
    viewerWantOrder.wouldMoveWantToIndex(
      wantOrderIds,
      wantRankDragId,
      targetIndex,
    )
  ) {
    row.classList.add("want-rank-drop-target");
  } else {
    row.classList.remove("want-rank-drop-target");
  }
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
  wantRankPointerDrag = {
    card,
    pointerId: event.pointerId,
  };
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
  const card = findWantRankCardAtPoint(
    event.clientX,
    event.clientY,
    wantRankPointerDrag.card,
  );
  updateWantRankDropTarget(card);
}

function finishWantRankPointerDrag(event) {
  if (
    !wantRankPointerDrag ||
    wantRankPointerDrag.pointerId !== event.pointerId
  ) {
    return;
  }

  if (canReorderWantRank() && wantRankDragId) {
    const card = findWantRankCardAtPoint(
      event.clientX,
      event.clientY,
      wantRankPointerDrag.card,
    );
    if (card) {
      const targetId = Number(card.dataset.bookId);
      if (reorderWantToTarget(wantRankDragId, targetId)) {
        saveUserState();
        render();
      }
    }
  }

  clearWantRankDragState();
}

grid.addEventListener("pointerdown", onWantRankPointerDown);
grid.addEventListener("pointermove", onWantRankPointerMove);
grid.addEventListener("pointerup", finishWantRankPointerDrag);
grid.addEventListener("pointercancel", finishWantRankPointerDrag);
