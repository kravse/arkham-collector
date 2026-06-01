/* Admin book order dialog */

let bookOrderDragId = null;

function getBookById(bookId) {
  return books.find((entry) => entry.id === bookId) || null;
}

function canMoveBookInOrder(order, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= order.length) {
    return false;
  }

  const bookA = getBookById(order[index]);
  const bookB = getBookById(order[target]);
  if (!bookA || !bookB) {
    return false;
  }

  const keyA = parseSortYear(bookA.publicationDate);
  const keyB = parseSortYear(bookB.publicationDate);
  if (keyA == null || keyB == null) {
    return keyA === keyB;
  }
  return keyA === keyB;
}

function getBookSortKeyForOrder(bookId) {
  const book = getBookById(bookId);
  if (!book) {
    return null;
  }
  return parseSortYear(book.publicationDate);
}

function canDropBookOnTarget(dragId, targetId) {
  if (!Number.isInteger(dragId) || !Number.isInteger(targetId) || dragId === targetId) {
    return false;
  }

  const dragKey = getBookSortKeyForOrder(dragId);
  const targetKey = getBookSortKeyForOrder(targetId);
  if (dragKey == null || targetKey == null) {
    return dragKey === targetKey;
  }
  return dragKey === targetKey;
}

function getOrderDialogIds() {
  const showHidden = showHiddenInput.checked;
  return workingBookOrder.filter((id) => {
    const book = getBookById(id);
    return book && (showHidden || !book.hidden);
  });
}

function renderBookOrderList() {
  if (!bookOrderList) {
    return;
  }

  const ids = getOrderDialogIds();
  if (!ids.length) {
    bookOrderList.innerHTML =
      '<p class="order-dialog-empty">No books to reorder.</p>';
    return;
  }

  bookOrderList.innerHTML = ids
    .map((id) => {
      const book = getBookById(id);
      if (!book) {
        return "";
      }

      const index = workingBookOrder.indexOf(id);
      const canMoveUp = canMoveBookInOrder(workingBookOrder, index, -1);
      const canMoveDown = canMoveBookInOrder(workingBookOrder, index, 1);
      const dateLabel = book.publicationDate || "—";
      const title = escapeHtml(book.title || book.listTitle || "Untitled");

      return `
        <div class="order-dialog-row" data-book-id="${id}">
          <span
            class="order-dialog-drag-handle"
            draggable="true"
            aria-label="Drag to reorder"
            role="button"
            tabindex="0"
          >⠿</span>
          <div class="order-dialog-row-text">
            <span class="order-dialog-row-title">${title}</span>
            <span class="order-dialog-row-date">${escapeHtml(dateLabel)}</span>
          </div>
          <div class="order-dialog-row-actions">
            <button
              type="button"
              class="order-dialog-move"
              data-move="-1"
              aria-label="Move up"
              ${canMoveUp ? "" : "disabled"}
            >↑</button>
            <button
              type="button"
              class="order-dialog-move"
              data-move="1"
              aria-label="Move down"
              ${canMoveDown ? "" : "disabled"}
            >↓</button>
          </div>
        </div>
      `;
    })
    .join("");
}

async function openBookOrderDialog() {
  if (!bookOrderDialog || !serveEnabled) {
    return;
  }

  try {
    const response = await fetch("/api/book-order");
    if (!response.ok) {
      throw new Error("Could not load book order");
    }
    const payload = await response.json();
    workingBookOrder = Array.isArray(payload.order)
      ? payload.order.map((id) => Number(id))
      : [];
    bookOrderDirty = false;
    renderBookOrderList();
    bookOrderDialog.hidden = false;
    if (bookOrderBtn) {
      bookOrderBtn.setAttribute("aria-expanded", "true");
    }
    bookOrderCloseBtn?.focus();
  } catch (error) {
    window.alert(error.message || "Could not load book order.");
  }
}

function closeBookOrderDialog() {
  if (!bookOrderDialog) {
    return;
  }
  bookOrderDialog.hidden = true;
  workingBookOrder = [];
  bookOrderDirty = false;
  if (bookOrderBtn) {
    bookOrderBtn.setAttribute("aria-expanded", "false");
  }
}

async function saveBookOrderDialog() {
  if (!serveEnabled || !bookOrderDirty) {
    closeBookOrderDialog();
    return;
  }

  try {
    const response = await fetch("/api/book-order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: workingBookOrder }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Could not save book order");
    }

    setBookOrderIds(payload.order || workingBookOrder);
    window.BOOK_ORDER = [...bookOrderIds];
    closeBookOrderDialog();
    render();
  } catch (error) {
    window.alert(error.message || "Could not save book order.");
  }
}

function moveBookInWorkingOrder(bookId, delta) {
  const index = workingBookOrder.indexOf(bookId);
  if (index < 0 || !canMoveBookInOrder(workingBookOrder, index, delta)) {
    return;
  }

  const target = index + delta;
  const next = [...workingBookOrder];
  [next[index], next[target]] = [next[target], next[index]];
  workingBookOrder = next;
  bookOrderDirty = true;
  renderBookOrderList();
}

function reorderBookToTarget(dragId, targetId) {
  const from = workingBookOrder.indexOf(dragId);
  let to = workingBookOrder.indexOf(targetId);
  if (from < 0 || to < 0 || from === to || !canDropBookOnTarget(dragId, targetId)) {
    return;
  }

  const next = [...workingBookOrder];
  next.splice(from, 1);
  if (from < to) {
    to -= 1;
  }
  next.splice(to, 0, dragId);
  workingBookOrder = next;
  bookOrderDirty = true;
  renderBookOrderList();
}

function clearBookOrderDragState() {
  bookOrderDragId = null;
  if (!bookOrderList) {
    return;
  }
  bookOrderList
    .querySelectorAll(".order-dialog-row-dragging, .order-dialog-row-drop-target")
    .forEach((element) => {
      element.classList.remove("order-dialog-row-dragging", "order-dialog-row-drop-target");
    });
}

function onBookOrderDragStart(event) {
  const handle = event.target.closest(".order-dialog-drag-handle");
  if (!handle) {
    return;
  }

  const row = handle.closest(".order-dialog-row");
  if (!row) {
    return;
  }

  const bookId = Number(row.dataset.bookId);
  if (!Number.isInteger(bookId)) {
    return;
  }

  bookOrderDragId = bookId;
  row.classList.add("order-dialog-row-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(bookId));
}

function onBookOrderDragOver(event) {
  if (!bookOrderDragId) {
    return;
  }

  const row = event.target.closest(".order-dialog-row");
  if (!row) {
    return;
  }

  const targetId = Number(row.dataset.bookId);
  bookOrderList
    .querySelectorAll(".order-dialog-row-drop-target")
    .forEach((element) => {
      if (element !== row) {
        element.classList.remove("order-dialog-row-drop-target");
      }
    });

  if (!canDropBookOnTarget(bookOrderDragId, targetId)) {
    event.dataTransfer.dropEffect = "none";
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  row.classList.add("order-dialog-row-drop-target");
}

function onBookOrderDragLeave(event) {
  const row = event.target.closest(".order-dialog-row");
  if (row) {
    row.classList.remove("order-dialog-row-drop-target");
  }
}

function onBookOrderDrop(event) {
  event.preventDefault();
  const row = event.target.closest(".order-dialog-row");
  if (!row || !bookOrderDragId) {
    clearBookOrderDragState();
    return;
  }

  const targetId = Number(row.dataset.bookId);
  reorderBookToTarget(bookOrderDragId, targetId);
  clearBookOrderDragState();
}

function onBookOrderDragEnd() {
  clearBookOrderDragState();
}

function onBookOrderListClick(event) {
  const moveButton = event.target.closest(".order-dialog-move");
  if (!moveButton || moveButton.disabled) {
    return;
  }

  const row = moveButton.closest(".order-dialog-row");
  if (!row) {
    return;
  }

  const bookId = Number(row.dataset.bookId);
  const delta = Number(moveButton.dataset.move);
  if (!Number.isInteger(bookId) || !delta) {
    return;
  }

  moveBookInWorkingOrder(bookId, delta);
}

function refreshBookOrderDialogIfOpen() {
  if (bookOrderDialog && !bookOrderDialog.hidden) {
    renderBookOrderList();
  }
}
