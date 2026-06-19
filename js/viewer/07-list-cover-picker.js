/* List cover crop picker in the edit dialog (serve only) */

let editListCoverFocusX = viewerListCrop.LIST_FOCAL_X;
let editListCoverFocusY = viewerListCrop.LIST_FOCAL_Y;
let listCoverFocusSaveTimer = null;

function isCoverDerivativePath(relativePath) {
  return (
    typeof relativePath === "string" &&
    (relativePath.endsWith(".card.webp") ||
      relativePath.endsWith(".detail.webp") ||
      relativePath.endsWith(".list.webp"))
  );
}

function resolveMasterCoverPath(book) {
  const coverPath = viewerCovers.getCoverPath(book, "card");
  if (!coverPath || isCoverDerivativePath(coverPath)) {
    return null;
  }
  return coverPath;
}

function applyListCoverFocusToEditingBook() {
  const book = books.find((entry) => entry.id === editingBookId);
  if (!book) {
    return;
  }
  book.listCoverFocusX = editListCoverFocusX;
  book.listCoverFocusY = editListCoverFocusY;
}

function updateListCoverOverlay() {
  const img = editListCoverImage;
  if (!img?.naturalWidth || editPanelListCrop.hidden) {
    return;
  }
  const crop = viewerListCrop.computeListCoverCrop(
    img.naturalWidth,
    img.naturalHeight,
    viewerListCrop.LIST_WIDTH,
    viewerListCrop.LIST_HEIGHT,
    editListCoverFocusX,
    editListCoverFocusY,
  );
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  editListCoverOverlay.style.left = `${(crop.left / w) * 100}%`;
  editListCoverOverlay.style.top = `${(crop.top / h) * 100}%`;
  editListCoverOverlay.style.width = `${(crop.width / w) * 100}%`;
  editListCoverOverlay.style.height = `${(crop.height / h) * 100}%`;
  editListCoverFocalMarker.style.left = `${editListCoverFocusX * 100}%`;
  editListCoverFocalMarker.style.top = `${editListCoverFocusY * 100}%`;
}

async function persistListCoverFocus() {
  if (!editingBookId || !serveEnabled) {
    return;
  }
  const book = books.find((entry) => entry.id === editingBookId);
  if (!book || !resolveMasterCoverPath(book)) {
    return;
  }

  const title =
    sanitizeSingleLineText(editTitleInput.value) || book.title || "";
  if (!title) {
    return;
  }

  try {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("listCoverFocusX", String(editListCoverFocusX));
    formData.append("listCoverFocusY", String(editListCoverFocusY));
    const response = await fetch(`/api/books/${editingBookId}`, {
      method: "PATCH",
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not save list crop");
    }
    applyEditResponseToBook(editingBookId, payload);
    render();
  } catch (error) {
    console.error(error);
  }
}

function scheduleListCoverFocusSave() {
  if (listCoverFocusSaveTimer) {
    clearTimeout(listCoverFocusSaveTimer);
  }
  listCoverFocusSaveTimer = setTimeout(() => {
    listCoverFocusSaveTimer = null;
    persistListCoverFocus();
  }, 400);
}

function onListCoverImageClick(event) {
  const img = editListCoverImage;
  const rect = img.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return;
  }
  editListCoverFocusX = Math.max(
    0,
    Math.min(1, (event.clientX - rect.left) / rect.width),
  );
  editListCoverFocusY = Math.max(
    0,
    Math.min(1, (event.clientY - rect.top) / rect.height),
  );
  applyListCoverFocusToEditingBook();
  updateListCoverOverlay();
  render();
  scheduleListCoverFocusSave();
}

function resetListCoverFocus() {
  editListCoverFocusX = viewerListCrop.LIST_FOCAL_X;
  editListCoverFocusY = viewerListCrop.LIST_FOCAL_Y;
  applyListCoverFocusToEditingBook();
  updateListCoverOverlay();
  render();
  scheduleListCoverFocusSave();
}

function openListCoverPicker(book) {
  const coverPath = resolveMasterCoverPath(book);
  if (!coverPath) {
    editTabListCrop.hidden = true;
    return;
  }

  const focus = viewerListCrop.resolveListCoverFocus(book);
  editListCoverFocusX = focus.x;
  editListCoverFocusY = focus.y;
  editTabListCrop.hidden = false;
  editListCoverImage.src = viewerCovers.appendCoverCacheKey(
    coverPath,
    book.coverCacheKey,
  );
}

function closeListCoverPicker() {
  if (listCoverFocusSaveTimer) {
    clearTimeout(listCoverFocusSaveTimer);
    listCoverFocusSaveTimer = null;
  }
  editListCoverFocusX = viewerListCrop.LIST_FOCAL_X;
  editListCoverFocusY = viewerListCrop.LIST_FOCAL_Y;
  editTabListCrop.hidden = true;
  editListCoverImage.removeAttribute("src");
}

function appendListCoverFocusToFormData(formData) {
  if (!editingBookId) {
    return;
  }
  const book = books.find((entry) => entry.id === editingBookId);
  if (!book || !resolveMasterCoverPath(book)) {
    return;
  }
  formData.append("listCoverFocusX", String(editListCoverFocusX));
  formData.append("listCoverFocusY", String(editListCoverFocusY));
}

function initListCoverPicker() {
  editListCoverImage.addEventListener("load", updateListCoverOverlay);
  editListCoverImage.addEventListener("click", onListCoverImageClick);
  editListCoverResetBtn.addEventListener("click", resetListCoverFocus);
}
