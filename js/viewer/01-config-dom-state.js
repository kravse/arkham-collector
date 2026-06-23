(function () {
  "use strict";

/* Configuration, DOM references, and mutable state */

const books = applyBookTags(
  applyBookEdits(window.BOOKS || [], window.BOOK_EDITS || {}),
  window.BOOK_TAGS || {},
);
const grid = document.getElementById("grid");
const stats = document.getElementById("stats");
const searchInput = document.getElementById("search");
const searchCombobox = document.getElementById("search-combobox");
const searchChips = document.getElementById("search-chips");
const searchTagSuggest = document.getElementById("search-tag-suggest");
const searchClearBtn = document.getElementById("search-clear");
const viewModeToggle = document.getElementById("view-mode-toggle");
const sortSelect = document.getElementById("sort");
const sortControlWrap = document.getElementById("sort-control-wrap");
const bookOrderBtn = document.getElementById("book-order-btn");
const bookOrderDialog = document.getElementById("book-order-dialog");
const bookOrderCloseBtn = document.getElementById("book-order-close");
const bookOrderCancelBtn = document.getElementById("book-order-cancel");
const bookOrderSaveBtn = document.getElementById("book-order-save");
const bookOrderList = document.getElementById("book-order-list");
const editDialog = document.getElementById("edit-dialog");
const editBookForm = document.getElementById("edit-book-form");
const editCancelBtn = document.getElementById("edit-cancel");
const editDeleteBtn = document.getElementById("edit-delete");
const editSaveBtn = document.getElementById("edit-save");
const editTitleInput = document.getElementById("edit-title");
const editAuthorInput = document.getElementById("edit-author");
const editCoverArtistInput = document.getElementById("edit-cover-artist");
const editPublicationDateInput = document.getElementById(
  "edit-publication-date",
);
const editWikipediaUrlInput =
  document.getElementById("edit-wikipedia-url");
const editGoodreadsUrlInput =
  document.getElementById("edit-goodreads-url");
const editDescriptionInput = document.getElementById("edit-description");
const editTagsField = document.getElementById("edit-tags-field");
const editTagsCurrent = document.getElementById("edit-tags-current");
const editTagInput = document.getElementById("edit-tag-input");
const editTagSuggest = document.getElementById("edit-tag-suggest");
const editTagAddBtn = document.getElementById("edit-tag-add");
const editTagsPool = document.getElementById("edit-tags-pool");
const editTagsPoolList = document.getElementById("edit-tags-pool-list");
const editCoverFileInput = document.getElementById("edit-cover-file");
const editTabDetails = document.getElementById("edit-tab-details");
const editTabListCrop = document.getElementById("edit-tab-list-crop");
const editPanelDetails = document.getElementById("edit-panel-details");
const editPanelListCrop = document.getElementById("edit-panel-list-crop");
const editListCoverPicker = document.getElementById("edit-list-cover-picker");
const editListCoverImage = document.getElementById("edit-list-cover-image");
const editListCoverOverlay = document.getElementById("edit-list-cover-overlay");
const editListCoverFocalMarker = document.getElementById("edit-list-cover-focal");
const editListCoverResetBtn = document.getElementById("edit-list-cover-reset");
const bookDetailDialog = document.getElementById("book-detail-dialog");
const bookDetailCloseBtn = document.getElementById("book-detail-close");
const bookDetailPrevBtn = document.getElementById("book-detail-prev");
const bookDetailNextBtn = document.getElementById("book-detail-next");
const bookDetailCover = document.getElementById("book-detail-cover");
const bookDetailBody = document.getElementById("book-detail-body");
const bookDetailActions = document.getElementById("book-detail-actions");
const bookDetailScroll = document.getElementById("book-detail-scroll");
const bookDetailToolbarStart = document.getElementById(
  "book-detail-toolbar-start",
);
const bookDetailImprint = document.getElementById("book-detail-imprint");
const coverLightbox = document.getElementById("cover-lightbox");
const coverLightboxImg = document.getElementById("cover-lightbox-img");
const settingsBtn = document.getElementById("settings-btn");
const settingsDialog = document.getElementById("settings-dialog");
const settingsCloseBtn = document.getElementById("settings-close");
const settingsTabAbout = document.getElementById("settings-tab-about");
const settingsTabSettings = document.getElementById("settings-tab-settings");
const settingsPanelAbout = document.getElementById("settings-panel-about");
const settingsPanelSettings = document.getElementById("settings-panel-settings");
const storageModeLocalInput = document.getElementById("storage-mode-local");
const storageModeGistInput = document.getElementById("storage-mode-gist");
const gistSyncPanel = document.getElementById("gist-sync-panel");
const gistSyncSaved = document.getElementById("gist-sync-saved");
const gistConnectForm = document.getElementById("gist-sync-connect-form");
const gistTokenInput = document.getElementById("gist-token-input");
const gistConnectBtn = document.getElementById("gist-connect-btn");
const gistClearBtn = document.getElementById("gist-clear-btn");
const gistSyncStatus = document.getElementById("gist-sync-status");
const exportCollectionBtn = document.getElementById("export-collection-btn");
const importCollectionBtn = document.getElementById("import-collection-btn");
const importCollectionInput = document.getElementById("import-collection-input");
const importCollectionStatus = document.getElementById("import-collection-status");
const highlightWantsInput = document.getElementById("highlight-wants");
const highlightCollectionInput = document.getElementById("highlight-collection");
const showMagazinesInput = document.getElementById("show-magazines");
const showMagazinesOption = document.getElementById("show-magazines-option");
const attributionBtn = document.getElementById("attribution-btn");
const attributionDialog = document.getElementById("attribution-dialog");
const attributionCloseBtn = document.getElementById("attribution-close");
const showHiddenWrap = document.getElementById("show-hidden-wrap");
const showHiddenInput = document.getElementById("show-hidden");
const pageSubtitle = document.getElementById("page-subtitle");
const pageTitle = document.getElementById("page-title");
const headerLogo = document.getElementById("header-logo");
const headerFiltersToggle = document.getElementById("header-filters-toggle");
const readOnly = window.READ_ONLY === true;
const LOGO_ARKHAM = "images/arkham-house.jpg";
const LOGO_MYCROFT = "images/Mycroft_moran.png";
const SORT_MODES = new Set([
  "date-desc",
  "date-asc",
  "title-asc",
  "title-desc",
]);
let serveEnabled = false;
let serveEditDeltas = false;
let editingBookId = null;
let collectionFilterMode = null;
let hiddenOnly = false;
let mycroftFilterMode = null;
let wantOnly = false;
let wantIds = new Set();
let collectionIds = new Set();
let orderedIds = new Set();
let storageMode = "local";
let pendingGistSetup = false;
let headerFiltersExpanded = true;
let gridViewMode = "cards";
let highlightWants = true;
let highlightCollection = true;
let showMagazines = false;
let detailBookId = null;
let bookOrderIds = Array.isArray(window.BOOK_ORDER)
  ? window.BOOK_ORDER.map((id) => Number(id))
  : [];
let bookOrderIndex = new Map();
let workingBookOrder = [];
let bookOrderDirty = false;

function rebuildBookOrderIndex() {
  bookOrderIndex = new Map(bookOrderIds.map((id, index) => [id, index]));
}

function setBookOrderIds(next) {
  bookOrderIds = next.map((id) => Number(id));
  rebuildBookOrderIndex();
  invalidateSortedCache();
}

rebuildBookOrderIndex();

function updateSortControlVisibility() {
  if (bookOrderBtn) {
    bookOrderBtn.hidden = !viewerMode.shouldShowBookOrderButton(serveEnabled);
  }
}

function activeCollectionIds() {
  return collectionIds;
}

function syncSettingsHighlightCheckboxes() {
  if (highlightWantsInput) {
    highlightWantsInput.checked = highlightWants;
  }
  if (highlightCollectionInput) {
    highlightCollectionInput.checked = highlightCollection;
  }
  if (showMagazinesInput) {
    showMagazinesInput.checked = showMagazines;
  }
  if (showMagazinesOption) {
    showMagazinesOption.hidden = !hasVisibleMagazineIssues();
  }
}

function shouldHighlightWantsOnCards() {
  return highlightWants || wantOnly;
}

function shouldHighlightCollectionOnCards() {
  return highlightCollection || collectionFilterMode != null;
}

function isGistStorageActive() {
  return (
    storageMode === "gist" &&
    viewerGistSync.isConnectedGistConfig(readGistSyncConfig())
  );
}

function gistSettingsPanelVisible() {
  return isGistStorageActive() || pendingGistSetup;
}

function syncSettingsStorageMode() {
  if (storageModeLocalInput) {
    storageModeLocalInput.checked = storageMode === "local" && !pendingGistSetup;
  }
  if (storageModeGistInput) {
    storageModeGistInput.checked = storageMode === "gist" || pendingGistSetup;
  }
  if (gistSyncPanel) {
    gistSyncPanel.hidden = !gistSettingsPanelVisible();
  }
  syncSettingsHighlightCheckboxes();
  syncGistConnectUi();
  refreshGistSyncStatus();
}

function hasSavedGistCredentials() {
  return viewerGistSync.isConnectedGistConfig(readGistSyncConfig());
}

function syncGistConnectUi() {
  const connected = isGistStorageActive();
  if (gistSyncSaved) {
    gistSyncSaved.hidden = !connected;
  }
  if (gistConnectForm) {
    gistConnectForm.hidden = connected;
  }
}

function refreshGistSyncStatus() {
  if (!gistSyncStatus) {
    return;
  }
  if (!gistSettingsPanelVisible()) {
    gistSyncStatus.textContent = "";
    gistSyncStatus.classList.remove("settings-gist-status--error");
    return;
  }
  if (isGistStorageActive()) {
    gistSyncStatus.textContent = "";
    gistSyncStatus.classList.remove("settings-gist-status--error");
    return;
  }
  gistSyncStatus.textContent =
    "Paste a GitHub token and click Connect.";
  gistSyncStatus.classList.remove("settings-gist-status--error");
}

function updateGistSyncStatus(message, isError) {
  if (!gistSyncStatus) {
    return;
  }
  gistSyncStatus.textContent = message;
  gistSyncStatus.classList.toggle("settings-gist-status--error", Boolean(isError));
}

function updateImportCollectionStatus(message, isError) {
  if (!importCollectionStatus) {
    return;
  }
  importCollectionStatus.hidden = !message;
  importCollectionStatus.textContent = message;
  importCollectionStatus.classList.toggle(
    "settings-gist-status--error",
    Boolean(isError),
  );
}
