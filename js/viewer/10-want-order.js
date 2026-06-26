/* Want list drag reorder (list and card view, shared lift-and-drop) */

let wantRankDragId = null;
let wantRankPointerDrag = null;
let wantRankTargetEl = null;
let wantRankTargetId = null;
let wantRankSuppressClick = false;

const WANT_LIST_ROW_SELECTOR = ".want-rank-row:not(.want-rank-row--card)";

function isWantRankDragActive() {
  return wantRankPointerDrag != null;
}

function consumeWantRankClickSuppress() {
  if (!wantRankSuppressClick) {
    return false;
  }
  wantRankSuppressClick = false;
  return true;
}

function canReorderWantRank() {
  return viewerWantView.canReorderWantList(
    wantFilterMode,
    gridViewMode,
    hasActiveSearch(),
  );
}

function getWantRankRowBookId(row) {
  const card = row?.querySelector(".card");
  const bookId = Number(card?.dataset.bookId);
  return Number.isInteger(bookId) ? bookId : null;
}

/* In list view we lift the whole row; in card view we lift just the card. The
   targeting, highlight, and commit logic is identical for both. */
function getWantLiftConfig() {
  if (gridViewMode === "list") {
    return {
      liftSelector: ".want-rank-row",
      targetSelector: WANT_LIST_ROW_SELECTOR,
      floatingClass: "want-rank-row-floating",
      getId: getWantRankRowBookId,
    };
  }
  return {
    liftSelector: ".card",
    targetSelector: ".want-rank-row--card .card",
    floatingClass: "want-rank-card-floating",
    getId: (el) => Number(el.dataset.bookId),
  };
}

function collectWantTargetRects(config) {
  return [...grid.querySelectorAll(config.targetSelector)]
    .map((el) => ({
      id: config.getId(el),
      el,
      rect: el.getBoundingClientRect(),
    }))
    .filter((item) => Number.isInteger(item.id));
}

function currentFloatingRect(clientX, clientY) {
  const drag = wantRankPointerDrag;
  const left = clientX - drag.offsetX;
  const top = clientY - drag.offsetY;
  return {
    left,
    top,
    width: drag.width,
    height: drag.height,
    right: left + drag.width,
    bottom: top + drag.height,
  };
}

function highlightWantTarget(targetId, rects) {
  if (targetId === wantRankTargetId) {
    return;
  }
  if (wantRankTargetEl) {
    wantRankTargetEl.classList.remove("want-rank-drop-target");
  }
  wantRankTargetId = targetId;
  wantRankTargetEl =
    targetId == null
      ? null
      : rects.find((item) => item.id === targetId)?.el ?? null;
  if (wantRankTargetEl) {
    wantRankTargetEl.classList.add("want-rank-drop-target");
  }
}

function teardownWantLift() {
  const drag = wantRankPointerDrag;
  if (drag?.clone) {
    drag.clone.remove();
  }
  if (drag?.liftEl) {
    drag.liftEl.classList.remove("want-rank-card-lift-source");
  }
  if (wantRankTargetEl) {
    wantRankTargetEl.classList.remove("want-rank-drop-target");
  }
  wantRankTargetEl = null;
  wantRankTargetId = null;
}

function clearWantRankDragState() {
  teardownWantLift();
  wantRankDragId = null;
  wantRankPointerDrag = null;
  document.body.classList.remove("want-rank-drag-active");
  grid
    .querySelectorAll(".want-rank-drop-target, .want-rank-card-lift-source")
    .forEach((element) => {
      element.classList.remove(
        "want-rank-drop-target",
        "want-rank-card-lift-source",
      );
    });
}

function onWantRankPointerMoveDrag(clientX, clientY) {
  const drag = wantRankPointerDrag;
  drag.clone.style.left = `${clientX - drag.offsetX}px`;
  drag.clone.style.top = `${clientY - drag.offsetY}px`;

  const floatingRect = currentFloatingRect(clientX, clientY);
  const rects = collectWantTargetRects(drag.config);
  const targetId = viewerWantOrder.pickOverlapTargetId(
    floatingRect,
    rects,
    wantRankDragId,
  );
  highlightWantTarget(targetId, rects);
}

function commitWantDrop(clientX, clientY) {
  const drag = wantRankPointerDrag;
  const floatingRect = currentFloatingRect(clientX, clientY);
  const rects = collectWantTargetRects(drag.config);
  let targetId = viewerWantOrder.pickOverlapTargetId(
    floatingRect,
    rects,
    wantRankDragId,
  );
  // Fall back to the highlighted target from the last pointermove — release
  // coords can differ slightly from where the user saw the glow.
  if (targetId == null && wantRankTargetId != null) {
    targetId = wantRankTargetId;
  }
  if (targetId == null) {
    return wantOrderIds;
  }

  return viewerWantOrder.reorderWantOrderIds(
    wantOrderIds,
    wantRankDragId,
    targetId,
  );
}

function finishWantDrag(event) {
  const cancelled = event.type === "pointercancel";
  let next = wantOrderIds;
  if (!cancelled && canReorderWantRank() && wantRankDragId) {
    next = commitWantDrop(event.clientX, event.clientY);
  }

  teardownWantLift();

  if (next === wantOrderIds) {
    return false;
  }

  setWantOrderIds(next);
  wantRankSuppressClick = true;
  saveUserState();
  return true;
}

function onWantRankPointerDownDrag(event, handle) {
  const config = getWantLiftConfig();
  const liftEl = handle.closest(config.liftSelector);
  if (!liftEl) {
    return false;
  }

  const id = config.getId(liftEl);
  if (!Number.isInteger(id)) {
    return false;
  }

  const rect = liftEl.getBoundingClientRect();
  const clone = liftEl.cloneNode(true);
  clone.classList.add(config.floatingClass);
  clone.classList.remove("want-rank-drop-target");
  clone.style.position = "fixed";
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.margin = "0";
  clone.style.pointerEvents = "none";
  document.body.appendChild(clone);

  liftEl.classList.add("want-rank-card-lift-source");

  wantRankDragId = id;
  wantRankTargetEl = null;
  wantRankTargetId = null;
  wantRankPointerDrag = {
    config,
    liftEl,
    pointerId: event.pointerId,
    clone,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    width: rect.width,
    height: rect.height,
  };
  document.body.classList.add("want-rank-drag-active");
  return true;
}

/* --- Shared pointer handlers --- */

function onWantRankPointerDown(event) {
  if (!canReorderWantRank() || event.button !== 0) {
    return;
  }

  const handle = event.target.closest(".want-rank-drag-handle");
  if (!handle) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  handle.setPointerCapture(event.pointerId);

  if (!onWantRankPointerDownDrag(event, handle)) {
    handle.releasePointerCapture(event.pointerId);
  }
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
  onWantRankPointerMoveDrag(event.clientX, event.clientY);
}

function finishWantRankPointerDrag(event) {
  if (
    !wantRankPointerDrag ||
    wantRankPointerDrag.pointerId !== event.pointerId
  ) {
    return;
  }

  const shouldRender = finishWantDrag(event);

  clearWantRankDragState();

  if (shouldRender) {
    render();
  }
}

grid.addEventListener("pointerdown", onWantRankPointerDown);
grid.addEventListener("pointermove", onWantRankPointerMove);
grid.addEventListener("pointerup", finishWantRankPointerDrag);
grid.addEventListener("pointercancel", finishWantRankPointerDrag);
