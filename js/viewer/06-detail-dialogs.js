/* Book detail overlay, settings, and attribution dialogs */

function detailPageUrl(bookId) {
  return `${detailPageBaseUrl()}#book/${bookId}`;
}

function detailPageBaseUrl() {
  return viewerFilterUrl.buildFilterUrl(
    viewerFilterUrl.currentFilterSnapshot({
      collectionFilterMode,
      wantFilterMode,
      mycroftFilterMode,
      hiddenOnly,
    }),
    window.location.search,
  );
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

function currentHistoryUrl() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function isOverlayHistoryView(view) {
  return history.state?.view === view;
}

function pushOverlayHistory(view, extra = {}) {
  history.pushState({ view, ...extra }, "", currentHistoryUrl());
}

function replaceOverlayHistory(view, extra = {}) {
  history.replaceState({ view, ...extra }, "", currentHistoryUrl());
}

function handleNavigationPopState() {
  const state = history.state;

  if (state?.view === "detail") {
    openBookDetail(state.bookId, { historyMode: "none" });
  } else if (!bookDetailDialog.hidden) {
    closeBookDetail({ fromPopState: true });
  }

  if (state?.view === "settings") {
    if (settingsDialog.hidden) {
      openSettingsDialog({ historyMode: "none" });
    }
  } else if (!settingsDialog.hidden) {
    closeSettingsDialog({ fromPopState: true });
  }

  if (state?.view === "attribution") {
    if (attributionDialog.hidden) {
      openAttributionDialog({ historyMode: "none" });
    }
  } else if (!attributionDialog.hidden) {
    closeAttributionDialog({ fromPopState: true });
  }
}

/** @deprecated Use handleNavigationPopState */
function handleDetailPopState() {
  handleNavigationPopState();
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

  syncEditTagsVisibility();
  updateSortControlVisibility();
  refreshDetailToolbarIfOpen();
  if (!bookDetailDialog.hidden && detailBookId) {
    openBookDetail(detailBookId, { historyMode: "none" });
  }
}

function openRandomVisibleBook() {
  const book = viewerFilters.pickRandomBook(getVisibleBooks());
  if (book) {
    openBookDetail(book.id);
  }
}

function openBookDetail(bookId, options = {}) {
  let { historyMode = "push" } = options;
  const book = books.find((entry) => entry.id === bookId);
  if (!book || isDeleted(book)) {
    return;
  }

  detailBookId = bookId;

  refreshDetailToolbar(book);

  bookDetailCover.innerHTML = renderCover(book, book.coverCacheKey, "detail");
  const hiddenBadge = book.hidden
    ? `<span class="hidden-badge">Hidden</span>`
    : "";
  const linkButtons = [
    viewerCardHtml.renderWikiButton(book.wikipediaUrl, "book-detail-wiki-btn"),
    viewerCardHtml.renderGoodreadsButton(
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

  const metaHtml = viewerCardHtml.renderBookDetailMetaHtml(book);
  const tagsHtml = renderBookTagsHtml(book);
  const description = getBookDescription(book);
  const descriptionHtml = description?.trim()
    ? `<div class="book-detail-description">${viewerCardHtml.escapeHtml(description)}</div>`
    : `<div class="book-detail-description book-detail-description--empty" aria-hidden="true"></div>`;

  const detailDateHtml = book.publicationDate
    ? `<span class="date"> (${viewerCardHtml.escapeHtml(book.publicationDate)})</span>`
    : "";
  bookDetailBody.innerHTML = `
  ${hiddenBadge}
  <h2 class="title" id="book-detail-title">${viewerCardHtml.escapeHtml(book.title || "Untitled")}${detailDateHtml}</h2>
  <div class="book-detail-scroll-block">
    <div class="book-detail-meta">${metaHtml}</div>
    ${tagsHtml}
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
  closeCoverLightbox();
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

function isMobileCoverLightboxViewport() {
  return window.matchMedia("(max-width: 640px)").matches;
}

function updateCoverLightboxImage(book) {
  if (!coverLightbox || !coverLightboxImg || !book) {
    return false;
  }
  const coverPath = viewerCovers.getCoverPath(book, "lightbox");
  if (!coverPath) {
    return false;
  }

  coverLightboxImg.src = viewerCovers.appendCoverCacheKey(
    coverPath,
    book.coverCacheKey,
  );
  coverLightboxImg.alt = `Cover of ${book.title || "book"}`;
  return true;
}

function openCoverLightbox(book) {
  if (!updateCoverLightboxImage(book)) {
    return;
  }
  coverLightbox.hidden = false;
  document.body.classList.add("cover-lightbox-open");
}

function navigateCoverLightbox(direction) {
  if (!coverLightbox || coverLightbox.hidden || detailBookId == null) {
    return;
  }

  const visible = getVisibleBooks();
  const index = visible.findIndex((book) => book.id === detailBookId);
  if (index < 0) {
    return;
  }

  const step = direction < 0 ? -1 : 1;
  for (let i = index + step; i >= 0 && i < visible.length; i += step) {
    const book = visible[i];
    if (!viewerCovers.getCoverPath(book, "lightbox")) {
      continue;
    }
    openBookDetail(book.id, { historyMode: "replace" });
    updateCoverLightboxImage(book);
    return;
  }
}

function closeCoverLightbox() {
  if (!coverLightbox || !coverLightboxImg) {
    return;
  }
  coverLightbox.hidden = true;
  document.body.classList.remove("cover-lightbox-open");
  coverLightboxImg.removeAttribute("src");
}

function handleCoverZoomTrigger(event) {
  const trigger = event.target.closest(".cover-zoom-trigger");
  if (!trigger) {
    return false;
  }
  event.preventDefault();
  event.stopPropagation();
  const bookId = Number(trigger.dataset.bookId);
  const book = books.find((entry) => entry.id === bookId);
  if (book) {
    openCoverLightbox(book);
  }
  return true;
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
  syncEditTagsVisibility();
  renderEditTagsUi();
  if (editTagInput) {
    editTagInput.value = "";
  }
  hideEditTagSuggest();
  selectEditDialogTab("details");
  openListCoverPicker(book);
  editDialog.hidden = false;
  editTitleInput.focus();
}

function closeEditDialog() {
  hideEditTagSuggest();
  editingBookId = null;
  closeListCoverPicker();
  selectEditDialogTab("details");
  editDialog.hidden = true;
  editBookForm.reset();
}

function selectEditDialogTab(tab) {
  const detailsActive = tab === "details";
  editTabDetails.setAttribute(
    "aria-selected",
    detailsActive ? "true" : "false",
  );
  editTabListCrop.setAttribute(
    "aria-selected",
    detailsActive ? "false" : "true",
  );
  editTabDetails.tabIndex = detailsActive ? 0 : -1;
  editTabListCrop.tabIndex = detailsActive ? -1 : 0;
  editPanelDetails.hidden = !detailsActive;
  editPanelListCrop.hidden = detailsActive;
  if (!detailsActive) {
    updateListCoverOverlay();
  }
}

function selectSettingsTab(tab) {
  const aboutActive = tab === "about";
  settingsTabAbout.setAttribute("aria-selected", aboutActive ? "true" : "false");
  settingsTabSettings.setAttribute("aria-selected", aboutActive ? "false" : "true");
  settingsTabAbout.tabIndex = aboutActive ? 0 : -1;
  settingsTabSettings.tabIndex = aboutActive ? -1 : 0;
  settingsPanelAbout.hidden = !aboutActive;
  settingsPanelSettings.hidden = aboutActive;
  if (!aboutActive) {
    refreshGistBackupList();
  }
}

function openSettingsDialog(options = {}) {
  let { historyMode = "push" } = options;
  pendingGistSetup = false;
  syncSettingsStorageMode();
  selectSettingsTab("about");
  settingsDialog.hidden = false;
  settingsBtn.setAttribute("aria-expanded", "true");
  settingsCloseBtn.focus();
  refreshGistBackupList();

  if (historyMode === "push" && isOverlayHistoryView("settings")) {
    historyMode = "replace";
  }
  if (historyMode === "push") {
    pushOverlayHistory("settings");
  } else if (historyMode === "replace") {
    replaceOverlayHistory("settings");
  }
}

function closeSettingsDialogUI() {
  if (!viewerGistSync.isConnectedGistConfig(readGistSyncConfig())) {
    activateLocalStorageMode({ render: false });
  } else {
    pendingGistSetup = false;
    syncSettingsStorageMode();
  }
  settingsDialog.hidden = true;
  settingsBtn.setAttribute("aria-expanded", "false");
}

function closeSettingsDialog(options = {}) {
  const { fromPopState = false, programmatic = false } = options;

  if (fromPopState) {
    closeSettingsDialogUI();
    return;
  }

  if (programmatic) {
    closeSettingsDialogUI();
    return;
  }

  if (isOverlayHistoryView("settings")) {
    history.back();
    return;
  }

  closeSettingsDialogUI();
}

async function onStorageModeChange(next) {
  if (next !== "local") {
    return;
  }
  activateLocalStorageMode();
}

async function onGistSetupSelected() {
  if (viewerGistSync.isConnectedGistConfig(readGistSyncConfig())) {
    await activateGistStorageMode();
    return;
  }
  pendingGistSetup = true;
  syncSettingsStorageMode();
  if (gistTokenInput) {
    gistTokenInput.focus();
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
    refreshGistBackupList();
    updateGistSyncStatus("Connected to GitHub Gist sync.");
    render();
  } catch (error) {
    activateLocalStorageMode({ render: false });
    updateGistSyncStatus(
      error.message || "Could not connect to GitHub Gist.",
      true,
    );
  } finally {
    if (gistConnectBtn) {
      gistConnectBtn.disabled = false;
    }
  }
}

function onGistClearClick() {
  clearGistSyncConfig();
  activateLocalStorageMode();
}

let pendingBackupRestoreAt = null;

function formatSnapshotLabel(iso) {
  const time = Date.parse(iso || "");
  if (!Number.isFinite(time)) {
    return iso || "Unknown time";
  }
  return new Date(time).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function setGistBackupStatus(message, isError = false) {
  if (!gistBackupStatus) {
    return;
  }
  gistBackupStatus.textContent = message;
  gistBackupStatus.classList.toggle("settings-gist-status--error", Boolean(isError));
}

async function refreshGistBackupList() {
  if (!gistBackupSection || !gistBackupList) {
    return;
  }
  if (!isGistStorageActive()) {
    gistBackupSection.hidden = true;
    gistBackupList.innerHTML = "";
    setGistBackupStatus("");
    return;
  }
  gistBackupSection.hidden = false;
  gistBackupList.innerHTML =
    '<li class="gist-backup-empty">Loading snapshots…</li>';
  try {
    const snapshots = await listGistSnapshots();
    if (!snapshots.length) {
      gistBackupList.innerHTML =
        '<li class="gist-backup-empty">No snapshots yet. The first one is written after sync when the latest is more than a day old.</li>';
      setGistBackupStatus("");
      return;
    }
    gistBackupList.innerHTML = snapshots
      .slice()
      .reverse()
      .map((entry) => {
        const label = formatSnapshotLabel(entry.at);
        const safeLabel = viewerCardHtml.escapeHtml(label);
        return `<li class="gist-backup-item"><button type="button" class="gist-backup-restore-btn" data-backup-at="${entry.at}" data-backup-label="${safeLabel}">Restore ${safeLabel}</button></li>`;
      })
      .join("");
    setGistBackupStatus(
      `${snapshots.length} daily snapshot${snapshots.length === 1 ? "" : "s"} stored (max ${viewerGistBackup.MAX_SNAPSHOTS}).`,
    );
  } catch (_) {
    gistBackupList.innerHTML =
      '<li class="gist-backup-empty">Could not load snapshots.</li>';
    setGistBackupStatus("Could not reach the backup Gist.", true);
  }
}

function openBackupRestoreConfirm(at, label) {
  pendingBackupRestoreAt = at;
  if (backupRestoreMessage) {
    backupRestoreMessage.textContent = `Restore your collection from the snapshot taken ${label}? Your current collection and want list will be replaced and synced to GitHub.`;
  }
  if (backupRestoreDialog) {
    backupRestoreDialog.hidden = false;
  }
}

function closeBackupRestoreConfirm() {
  pendingBackupRestoreAt = null;
  if (backupRestoreDialog) {
    backupRestoreDialog.hidden = true;
  }
}

async function onConfirmBackupRestore() {
  const at = pendingBackupRestoreAt;
  closeBackupRestoreConfirm();
  if (!at) {
    return;
  }
  setGistBackupStatus("Restoring snapshot…");
  if (backupRestoreOk) {
    backupRestoreOk.disabled = true;
  }
  try {
    const result = await restoreGistSnapshot(at);
    if (!result.ok) {
      setGistBackupStatus(result.error, true);
      return;
    }
    closeSettingsDialog({ programmatic: true });
    render();
    if (!bookDetailDialog.hidden && detailBookId) {
      openBookDetail(detailBookId, { historyMode: "none" });
    }
  } finally {
    if (backupRestoreOk) {
      backupRestoreOk.disabled = false;
    }
  }
}

function onGistBackupListClick(event) {
  const button = event.target.closest(".gist-backup-restore-btn");
  if (!button) {
    return;
  }
  const at = button.dataset.backupAt;
  const label = button.dataset.backupLabel || formatSnapshotLabel(at);
  openBackupRestoreConfirm(at, label);
}

function escapeCsvField(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function collectionRowsForExport() {
  return viewerCollectionImport.buildCollectionExportRows(
    getActiveBooks(),
    bookStatuses,
    compareCanonical,
  );
}

function exportCollectionCsv() {
  const rows = collectionRowsForExport();
  if (!rows.length) {
    window.alert(
      "Nothing to export — your collection, on-order list, and want list are empty.",
    );
    return;
  }

  const csv = `${viewerCollectionImport.COLLECTION_CSV_HEADER}\n${rows
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
    if (isGistStorageActive() && !result.syncedToGist) {
      message += " GitHub Gist sync is unavailable.";
    } else if (result.syncedToGist) {
      message += " Synced to GitHub Gist.";
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

function openAttributionDialog(options = {}) {
  let { historyMode = "push" } = options;
  attributionDialog.hidden = false;
  attributionBtn.setAttribute("aria-expanded", "true");
  attributionCloseBtn.focus();

  if (historyMode === "push" && isOverlayHistoryView("attribution")) {
    historyMode = "replace";
  }
  if (historyMode === "push") {
    pushOverlayHistory("attribution");
  } else if (historyMode === "replace") {
    replaceOverlayHistory("attribution");
  }
}

function closeAttributionDialogUI() {
  attributionDialog.hidden = true;
  attributionBtn.setAttribute("aria-expanded", "false");
}

function closeAttributionDialog(options = {}) {
  const { fromPopState = false, programmatic = false } = options;

  if (fromPopState) {
    closeAttributionDialogUI();
    return;
  }

  if (programmatic) {
    closeAttributionDialogUI();
    return;
  }

  if (isOverlayHistoryView("attribution")) {
    history.back();
    return;
  }

  closeAttributionDialogUI();
}
