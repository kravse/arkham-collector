(function () {
  "use strict";

/* Configuration, DOM references, and mutable state */

const books = applyBookEdits(window.BOOKS || [], window.BOOK_EDITS || {});
const grid = document.getElementById("grid");
const stats = document.getElementById("stats");
const searchInput = document.getElementById("search");
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
const editCoverFileInput = document.getElementById("edit-cover-file");
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
const settingsBtn = document.getElementById("settings-btn");
const settingsDialog = document.getElementById("settings-dialog");
const settingsCloseBtn = document.getElementById("settings-close");
const settingsTabAbout = document.getElementById("settings-tab-about");
const settingsTabSettings = document.getElementById("settings-tab-settings");
const settingsPanelAbout = document.getElementById("settings-panel-about");
const settingsPanelSettings = document.getElementById("settings-panel-settings");
const collectionSourceSampleInput = document.getElementById(
  "collection-source-sample",
);
const collectionSourceOwnInput =
  document.getElementById("collection-source-own");
const exportCollectionBtn = document.getElementById("export-collection-btn");
const resetSampleCollectionBtn = document.getElementById(
  "reset-sample-collection-btn",
);
const resetSampleConfirmPanel = document.getElementById(
  "reset-sample-confirm",
);
const resetSampleCancelBtn = document.getElementById(
  "reset-sample-cancel-btn",
);
const resetSampleConfirmBtn = document.getElementById(
  "reset-sample-confirm-btn",
);
const settingsCollectionHintSample = document.getElementById(
  "settings-collection-hint-sample",
);
const settingsCollectionHintOwn = document.getElementById(
  "settings-collection-hint-own",
);
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
let collection = [];
let serveEnabled = false;
let serveEditDeltas = false;
let editingBookId = null;
let collectionFilterMode = null;
let hiddenOnly = false;
let mycroftFilterMode = null;
let wantOnly = false;
let wantIds = new Set();
let ownCollectionIds = new Set();
let orderedIds = new Set();
let sampleCollectionIds = new Set();
let collectionSource = "sample";
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

function useOwnCollection() {
  return collectionSource === "own";
}

function activeCollectionIds() {
  return useOwnCollection() ? ownCollectionIds : sampleCollectionIds;
}

function defaultCollectionSource() {
  const fromBuild = window.DEFAULT_COLLECTION_SOURCE;
  if (fromBuild === "own" || fromBuild === "sample") {
    return fromBuild;
  }
  return readOnly ? "own" : "sample";
}

function syncSettingsCollectionHint() {
  const inConfirm =
    resetSampleConfirmPanel && !resetSampleConfirmPanel.hidden;
  const showSampleHint =
    !inConfirm &&
    collectionSource === "sample" &&
    resetSampleCollectionBtn &&
    !resetSampleCollectionBtn.hidden;

  if (settingsCollectionHintSample) {
    settingsCollectionHintSample.hidden = !showSampleHint;
  }
  if (settingsCollectionHintOwn) {
    settingsCollectionHintOwn.hidden = showSampleHint;
  }
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

function syncSettingsCollectionRadios() {
  if (collectionSourceSampleInput) {
    collectionSourceSampleInput.checked = collectionSource === "sample";
  }
  if (collectionSourceOwnInput) {
    collectionSourceOwnInput.checked = collectionSource === "own";
  }
  if (resetSampleCollectionBtn) {
    resetSampleCollectionBtn.hidden = collectionSource !== "sample";
  }
  hideResetSampleConfirm();
  syncSettingsCollectionHint();
  syncSettingsHighlightCheckboxes();
}

function showResetSampleConfirm() {
  if (!resetSampleConfirmPanel || !resetSampleCollectionBtn) {
    return;
  }
  resetSampleCollectionBtn.hidden = true;
  resetSampleConfirmPanel.hidden = false;
  syncSettingsCollectionHint();
}

function hideResetSampleConfirm() {
  if (resetSampleConfirmPanel) {
    resetSampleConfirmPanel.hidden = true;
  }
  if (resetSampleCollectionBtn && collectionSource === "sample") {
    resetSampleCollectionBtn.hidden = false;
  }
  syncSettingsCollectionHint();
}
