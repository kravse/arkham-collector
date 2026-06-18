/* Book detail overlay, settings, and attribution dialogs */

function detailPageUrl(bookId) {
  return `${window.location.pathname}${window.location.search}#book/${bookId}`;
}

function detailPageBaseUrl() {
  return `${window.location.pathname}${window.location.search}`;
}

function parseDetailBookIdFromHash() {
  const match = window.location.hash.match(/^#book\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function isDetailHistoryActive() {
  return history.state?.view === "detail";
}

function pushDetailHistory(bookId) {
  history.pushState({ view: "detail", bookId }, "", detailPageUrl(bookId));
}

function replaceDetailHistory(bookId) {
  history.replaceState({ view: "detail", bookId }, "", detailPageUrl(bookId));
}

function clearDetailHistory() {
  history.replaceState(null, "", detailPageBaseUrl());
}

function openBookDetailFromLocation() {
  const bookId = parseDetailBookIdFromHash();
  if (bookId) {
    openBookDetail(bookId, { historyMode: "replace" });
  }
}

function handleDetailPopState() {
  const state = history.state;
  if (state?.view === "detail") {
    openBookDetail(state.bookId, { historyMode: "none" });
    return;
  }
  if (!bookDetailDialog.hidden) {
    closeBookDetail({ fromPopState: true });
  }
}
function getDetailNavigation() {
  const visible = getVisibleBooks();
  const index = visible.findIndex((book) => book.id === detailBookId);
  return {
    index,
    prevId: index > 0 ? visible[index - 1].id : null,
    nextId:
      index >= 0 && index < visible.length - 1
        ? visible[index + 1].id
        : null,
  };
}

function updateDetailNav() {
  const book = books.find((entry) => entry.id === detailBookId);
  if (!book || isDeleted(book)) {
    closeBookDetail({ programmatic: true });
    return;
  }

  const { prevId, nextId } = getDetailNavigation();
  if (bookDetailPrevBtn) {
    bookDetailPrevBtn.hidden = !prevId;
  }
  if (bookDetailNextBtn) {
    bookDetailNextBtn.hidden = !nextId;
  }
}

function navigateDetail(direction) {
  const { prevId, nextId } = getDetailNavigation();
  const targetId = direction < 0 ? prevId : nextId;
  if (targetId) {
    openBookDetail(targetId, { historyMode: "replace" });
  }
}

async function checkServeSupport() {
  if (readOnly) {
    serveEnabled = false;
    hiddenOnly = false;
    showHiddenWrap.hidden = true;
    updateSortControlVisibility();
    return;
  }

  try {
    const response = await fetch("/api/health");
    serveEnabled = viewerMode.resolveServeEnabled({
      readOnly,
      healthCheckOk: response.ok,
    });
    if (serveEnabled) {
      const payload = await response.json();
      serveEditDeltas = payload.editDeltas === true;
    } else {
      serveEditDeltas = false;
    }
  } catch (_) {
    serveEnabled = false;
    serveEditDeltas = false;
  }

  if (!serveEnabled) {
    hiddenOnly = false;
  }

  showHiddenWrap.hidden = !viewerMode.shouldShowShowHiddenToggle(serveEnabled);
  updateSortControlVisibility();
  refreshDetailToolbarIfOpen();
}

function openBookDetail(bookId, options = {}) {
  let { historyMode = "push" } = options;
  const book = books.find((entry) => entry.id === bookId);
  if (!book || isDeleted(book)) {
    return;
  }

  detailBookId = bookId;

  refreshDetailToolbar(book);

  bookDetailCover.innerHTML = renderCover(book, book.coverCacheKey);
  const hiddenBadge = book.hidden
    ? `<span class="hidden-badge">Hidden</span>`
    : "";
  const linkButtons = [
    renderWikiButton(book.wikipediaUrl, "book-detail-wiki-btn"),
    renderGoodreadsButton(
      getGoodreadsLinkForBook(book),
      "book-detail-goodreads-btn",
    ),
  ]
    .filter(Boolean)
    .join("");
  const wantButton = renderWantButton(book);
  const collectionControl = renderCollectionButton(book);
  const bottomRow = renderCardBottomRow(
    "",
    wantButton,
    linkButtons,
    collectionControl,
  );

  const metaHtml = renderBookMetaHtml(book);
  const description = getBookDescription(book);
  const descriptionHtml = description?.trim()
    ? `<div class="book-detail-description">${escapeHtml(description)}</div>`
    : `<div class="book-detail-description book-detail-description--empty" aria-hidden="true"></div>`;

  const detailDateHtml = book.publicationDate
    ? `<span class="date"> (${escapeHtml(book.publicationDate)})</span>`
    : "";
  bookDetailBody.innerHTML = `
  ${hiddenBadge}
  <h2 class="title" id="book-detail-title">${escapeHtml(book.title || "Untitled")}${detailDateHtml}</h2>
  <div class="book-detail-scroll-block">
    <div class="book-detail-meta">${metaHtml}</div>
    ${descriptionHtml}
  </div>
`;
  if (bookDetailActions) {
    bookDetailActions.innerHTML = bottomRow;
  }

  bookDetailDialog.hidden = false;
  document.body.classList.add("book-detail-open");
  if (bookDetailScroll) {
    bookDetailScroll.scrollTop = 0;
  }
  const detailScrollBlock = bookDetailBody.querySelector(
    ".book-detail-scroll-block",
  );
  if (detailScrollBlock) {
    detailScrollBlock.scrollTop = 0;
  }
  updateDetailNav();

  if (historyMode === "push" && isDetailHistoryActive()) {
    historyMode = "replace";
  }
  if (historyMode === "push") {
    pushDetailHistory(bookId);
  } else if (historyMode === "replace") {
    replaceDetailHistory(bookId);
  }
}

function closeBookDetailUI() {
  detailBookId = null;
  bookDetailDialog.hidden = true;
  bookDetailCover.innerHTML = "";
  bookDetailBody.innerHTML = "";
  if (bookDetailImprint) {
    bookDetailImprint.innerHTML = "";
  }
  if (bookDetailToolbarStart) {
    bookDetailToolbarStart
      .querySelectorAll(".book-detail-edit-btn")
      .forEach((element) => element.remove());
  }
  if (bookDetailActions) {
    bookDetailActions.innerHTML = "";
  }
  if (bookDetailPrevBtn) {
    bookDetailPrevBtn.hidden = true;
  }
  if (bookDetailNextBtn) {
    bookDetailNextBtn.hidden = true;
  }
  document.body.classList.remove("book-detail-open");
}

function closeBookDetail(options = {}) {
  const { fromPopState = false, programmatic = false } = options;

  if (fromPopState) {
    closeBookDetailUI();
    return;
  }

  if (programmatic) {
    closeBookDetailUI();
    if (isDetailHistoryActive() || parseDetailBookIdFromHash() != null) {
      clearDetailHistory();
    }
    return;
  }

  if (isDetailHistoryActive()) {
    history.back();
    return;
  }

  closeBookDetailUI();
}

function openEditDialog(bookId) {
  const book = books.find((entry) => entry.id === bookId);
  if (!book || isDeleted(book)) {
    return;
  }

  editingBookId = bookId;
  editTitleInput.value = book.title || "";
  editAuthorInput.value = book.author || "";
  editCoverArtistInput.value = book.coverArtist || "";
  editPublicationDateInput.value = book.publicationDate || "";
  editWikipediaUrlInput.value = book.wikipediaUrl || "";
  editGoodreadsUrlInput.value = resolveGoodreadsUrl(book) || "";
  editDescriptionInput.value = getBookDescription(book) || "";
  editCoverFileInput.value = "";
  editDialog.hidden = false;
  editTitleInput.focus();
}

function closeEditDialog() {
  editingBookId = null;
  editDialog.hidden = true;
  editBookForm.reset();
}

function selectSettingsTab(tab) {
  const aboutActive = tab === "about";
  settingsTabAbout.setAttribute("aria-selected", aboutActive ? "true" : "false");
  settingsTabSettings.setAttribute("aria-selected", aboutActive ? "false" : "true");
  settingsTabAbout.tabIndex = aboutActive ? 0 : -1;
  settingsTabSettings.tabIndex = aboutActive ? -1 : 0;
  settingsPanelAbout.hidden = !aboutActive;
  settingsPanelSettings.hidden = aboutActive;
}

function openSettingsDialog() {
  syncSettingsStorageMode();
  selectSettingsTab("about");
  settingsDialog.hidden = false;
  settingsBtn.setAttribute("aria-expanded", "true");
  settingsCloseBtn.focus();
}

function closeSettingsDialog() {
  settingsDialog.hidden = true;
  settingsBtn.setAttribute("aria-expanded", "false");
}

async function onStorageModeChange(next) {
  if (next !== "local" && next !== "gist") {
    return;
  }
  if (storageMode === next) {
    syncSettingsStorageMode();
    return;
  }

  const collections = swapCollectionForStorageMode(next);
  storageMode = next;
  persistUserState(
    viewerUserState.buildUserStateFromRuntime(collectRuntimeSnapshot(), {
      existingCollections: collections,
    }),
  );
  syncSettingsStorageMode();

  if (storageMode === "gist") {
    const config = readGistSyncConfig();
    if (viewerGistSync.isConnectedGistConfig(config)) {
      await pullGistStateIfConfigured();
    }
  }

  render();
  if (!bookDetailDialog.hidden && detailBookId) {
    openBookDetail(detailBookId, { historyMode: "none" });
  }
}

async function onGistConnectClick() {
  if (!gistTokenInput) {
    return;
  }
  try {
    gistConnectBtn.disabled = true;
    await connectGistSync(gistTokenInput.value);
    gistTokenInput.value = "";
    syncGistConnectUi();
    updateGistSyncStatus("Syncing to your private gist.");
    render();
  } catch (error) {
    updateGistSyncStatus(error.message || "Could not connect to gist.", true);
  } finally {
    if (gistConnectBtn) {
      gistConnectBtn.disabled = false;
    }
  }
}

function onGistClearClick() {
  clearGistSyncConfig();
}

function escapeCsvField(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function collectionRowsForExport() {
  const ids = exportableCollectionIds();
  return getActiveBooks()
    .filter((book) => ids.has(book.id))
    .sort(compareCanonical)
    .map((book) => [
      book.title || book.listTitle || "Untitled",
      book.author || "",
      parseYear(book.publicationDate) || "",
    ]);
}

function exportCollectionCsv() {
  const rows = collectionRowsForExport();
  if (!rows.length) {
    window.alert("Your collection is empty — nothing to export.");
    return;
  }

  const csv = `${rows
    .map((cols) => cols.map(escapeCsvField).join(","))
    .join("\n")}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "my_collection.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function onImportCollectionFileSelected(input) {
  const file = input?.files?.[0];
  if (!file) {
    return;
  }

  try {
    if (importCollectionBtn) {
      importCollectionBtn.disabled = true;
    }
    const result = await importCollectionFromCsvText(await file.text());
    let message = `Imported ${result.matchedCount} of ${result.rowCount} titles.`;
    if (result.unmatchedCount) {
      message += ` ${result.unmatchedCount} row(s) could not be matched.`;
    }
    if (storageMode === "gist" && !result.syncedToGist) {
      message += " Connect gist sync to upload.";
    } else if (result.syncedToGist) {
      message += " Synced to gist.";
    }
    updateImportCollectionStatus(message, false);
    render();
  } catch (error) {
    updateImportCollectionStatus(
      error.message || "Could not import collection CSV.",
      true,
    );
  } finally {
    if (importCollectionBtn) {
      importCollectionBtn.disabled = false;
    }
    input.value = "";
  }
}

function openAttributionDialog() {
  attributionDialog.hidden = false;
  attributionBtn.setAttribute("aria-expanded", "true");
  attributionCloseBtn.focus();
}

function closeAttributionDialog() {
  attributionDialog.hidden = true;
  attributionBtn.setAttribute("aria-expanded", "false");
}
