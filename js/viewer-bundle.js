(function () {
  "use strict";

/* Configuration, DOM references, and mutable state */

const books = applyBookTags(
  applyBookEdits(window.BOOKS || [], window.BOOK_EDITS || {}),
  window.BOOK_TAGS || {},
);
try {
  delete window.BOOKS;
} catch {
  window.BOOKS = undefined;
}
const grid = document.getElementById("grid");
const stats = document.getElementById("stats");
const searchInput = document.getElementById("search");
const searchCombobox = document.getElementById("search-combobox");
const searchChips = document.getElementById("search-chips");
const searchFieldSuggest = document.getElementById("search-field-suggest");
const searchClearBtn = document.getElementById("search-clear");
const viewModeToggle = document.getElementById("view-mode-toggle");
const sortSelect = document.getElementById("sort");
const sortReverseBtn = document.getElementById("sort-reverse");
const sortWantBadge = document.getElementById("sort-want-badge");
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
const gistBackupSection = document.getElementById("gist-backup-section");
const gistBackupList = document.getElementById("gist-backup-list");
const gistBackupStatus = document.getElementById("gist-backup-status");
const backupRestoreDialog = document.getElementById("backup-restore-dialog");
const backupRestoreMessage = document.getElementById("backup-restore-message");
const backupRestoreOk = document.getElementById("backup-restore-ok");
const backupRestoreCancel = document.getElementById("backup-restore-cancel");
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
const pageSubtitle = document.getElementById("page-subtitle");
const pageTitle = document.getElementById("page-title");
const headerLogoBtn = document.getElementById("header-logo-btn");
const headerLogo = document.getElementById("header-logo");
const headerFiltersToggle = document.getElementById("header-filters-toggle");
const readOnly = window.READ_ONLY === true;
const LOGO_ARKHAM = "images/arkham-house.jpg";
const LOGO_MYCROFT = "images/Mycroft_moran.png";
let serveEnabled = false;
let serveEditDeltas = false;
let editingBookId = null;
let collectionFilterMode = null;
let hiddenOnly = false;
let mycroftFilterMode = null;
let wantFilterMode = null;
let wantIds = new Set();
let wantOrderIds = [];
let collectionIds = new Set();
let orderedIds = new Set();
// Source of truth for membership: one stamped status per book. The Sets above are
// derived views kept for the render and filter code that reads them everywhere.
// Declared as a literal because this partial is bundled before the generated
// viewerBookStatus module.
let bookStatuses = {};
let storageMode = "local";
let pendingGistSetup = false;
let headerFiltersExpanded = true;
let gridViewMode = "cards";
let highlightWants = true;
let highlightCollection = true;
let showMagazines = false;
let catalogSortMode = "date-asc";
let wantOrderLocked = false;
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

function setWantOrderIds(next) {
  wantOrderIds = viewerWantOrderNormalize.normalizeWantOrderIds(next, [...wantIds]);
  invalidateSortedCache();
}

/** Rebuild the derived membership Sets after the status map changes. */
function applyBookStatuses(nextStatuses, options = {}) {
  bookStatuses = viewerBookStatus.normalizeStatusMap(nextStatuses);
  const derived = viewerBookStatus.deriveIdsByStatus(bookStatuses);
  collectionIds = new Set(derived.collectionIds);
  orderedIds = new Set(derived.orderedIds);
  wantIds = new Set(derived.wantIds);
  wantOrderIds = viewerWantOrderNormalize.normalizeWantOrderIds(
    options.wantOrderIds !== undefined ? options.wantOrderIds : wantOrderIds,
    derived.wantIds,
  );
  invalidateSortedCache();
}

function syncWantMembership(bookId, wanted) {
  const id = Number(bookId);
  if (!Number.isFinite(id)) {
    return;
  }
  const current = viewerBookStatus.getBookStatus(bookStatuses, id);
  if (wanted === (current === viewerBookStatus.WANT)) {
    return;
  }
  // normalizeWantOrderIds backfills a newly wanted book at the end of the
  // ranking and drops one that is no longer wanted, so no explicit edit is needed.
  applyBookStatuses(
    viewerBookStatus.setWantStatus(
      bookStatuses,
      id,
      wanted,
      new Date().toISOString(),
    ),
  );
}

function isWantFilterActive() {
  return viewerWantView.isWantFilterActive(wantFilterMode);
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

let lastSettingsHighlightSignature = null;

function buildSettingsHighlightSignature() {
  return [
    highlightWants ? 1 : 0,
    highlightCollection ? 1 : 0,
    showMagazines ? 1 : 0,
    hasVisibleMagazineIssues() ? 1 : 0,
  ].join(":");
}

function syncSettingsHighlightCheckboxes() {
  const signature = buildSettingsHighlightSignature();
  if (signature === lastSettingsHighlightSignature) {
    return;
  }
  lastSettingsHighlightSignature = signature;

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
  return highlightWants || isWantFilterActive();
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


/* Generated from scripts/lib/viewer-person-names.js — run npm run bundle-viewer */

const viewerPersonNames = (function () {
  function normalizeForMatch(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[''""]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }
  
  const QUALIFYING_PAREN_RE =
    /inspired by|notes by|fragments by|edited by|\bEd\.?\b|\bvol\.\s*\d/i;
  
  const COVER_ROLE_SUFFIX_RE =
    /,\s*(?:lettering and )?design by\b.*$|,\s*photograph by\b.*$/i;
  
  const COVER_ROLE_PREFIX_RE =
    /^(?:photograph|lettering and design|design)\s+by\s+(.+)$/i;
  
  const COLLECTIVE_AUTHOR_CREDIT_RE =
    /\s*(?:&|\band\b)\s*(divers\s+hands|others)\s*$/i;
  
  const COLLECTIVE_AUTHOR_KEYS = new Set(["divers hands", "others"]);
  
  const GENERATIONAL_SUFFIX_RE = /^(?:jr\.?|sr\.?|ii|iii|iv)$/i;
  
  const PERSON_LIST_SPLIT_RE =
    /\s*,\s*(?!\s*(?:Jr|Sr|II|III|IV)\.?)|\s+and\s+/i;
  
  function stripCollectiveAuthorCredit(text) {
    return String(text || "")
      .replace(COLLECTIVE_AUTHOR_CREDIT_RE, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  
  function parseAuthorCollectiveSuffix(raw) {
    const text = parseEditedByPrefix(stripQualifyingParentheticals(raw));
    const match = text.match(COLLECTIVE_AUTHOR_CREDIT_RE);
    if (!match) {
      return null;
    }
    const key = normalizePersonKey(match[1]);
    if (key === "divers hands") {
      return "and divers hands";
    }
    if (key === "others") {
      return "and others";
    }
    return null;
  }
  
  function normalizePersonKey(name) {
    return normalizeForMatch(name);
  }
  
  function stripQualifyingParentheticals(text) {
    let result = String(text || "").trim();
    if (!result) {
      return "";
    }
  
    result = result.replace(/\s*\(([^)]*)\)/g, (match, inner) => {
      if (QUALIFYING_PAREN_RE.test(inner)) {
        return "";
      }
      return match;
    });
  
    return result.replace(/\s{2,}/g, " ").trim();
  }
  
  function mergeGenerationalSuffixParts(parts) {
    const merged = [];
    for (const part of parts || []) {
      const trimmed = String(part || "").trim();
      if (!trimmed) {
        continue;
      }
      if (merged.length && GENERATIONAL_SUFFIX_RE.test(trimmed)) {
        merged[merged.length - 1] = `${merged[merged.length - 1]}, ${trimmed}`;
        continue;
      }
      merged.push(trimmed);
    }
    return merged;
  }
  
  function splitPersonList(text) {
    const raw = String(text || "").trim();
    if (!raw) {
      return [];
    }
  
    return mergeGenerationalSuffixParts(
      raw
        .split(PERSON_LIST_SPLIT_RE)
        .map((part) => part.trim())
        .filter(Boolean),
    );
  }
  
  function dedupePersonNames(names) {
    const seen = new Set();
    const result = [];
    for (const name of names || []) {
      const trimmed = String(name || "").trim();
      if (!trimmed) {
        continue;
      }
      const key = normalizePersonKey(trimmed);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(trimmed);
    }
    return result;
  }
  
  function parseEditedByPrefix(text) {
    const trimmed = String(text || "").trim();
    const editedMatch = trimmed.match(/^edited by\s+(.+)$/i);
    if (editedMatch) {
      return editedMatch[1].trim();
    }
    return trimmed;
  }
  
  function parseAuthorNames(raw) {
    const text = stripCollectiveAuthorCredit(
      parseEditedByPrefix(stripQualifyingParentheticals(raw)),
    );
    if (!text) {
      return [];
    }
    return dedupePersonNames(
      splitPersonList(text).filter(
        (name) => !COLLECTIVE_AUTHOR_KEYS.has(normalizePersonKey(name)),
      ),
    );
  }
  
  function stripCoverRoleSuffix(text) {
    return String(text || "")
      .trim()
      .replace(COVER_ROLE_SUFFIX_RE, "")
      .trim();
  }
  
  function parseCoverArtistNames(raw) {
    let text = stripCoverRoleSuffix(String(raw || "").trim());
    if (!text) {
      return [];
    }
  
    const roleMatch = text.match(COVER_ROLE_PREFIX_RE);
    if (roleMatch) {
      text = roleMatch[1].trim();
    }
  
    return dedupePersonNames(splitPersonList(text));
  }
  
  function getDisplayAuthorRaw(book) {
    if (book?.author) {
      return String(book.author).trim();
    }
  
    const line = String(book?.listAuthor || "").trim();
    if (!line) {
      return "";
    }
  
    const withoutYear = line.replace(/\s*\(\d{4}\)\s*$/, "").trim();
    const editedMatch = withoutYear.match(/edited by\s+(.+)$/i);
    if (editedMatch) {
      return editedMatch[1].trim();
    }
  
    const byMatch = withoutYear.match(/(?:^|,\s*)by\s+(.+)$/i);
    if (byMatch) {
      return byMatch[1].split(/\s+vol\.\s+/i)[0].trim() || "";
    }
  
    return "";
  }
  
  function resolveOverrideNames(value) {
    if (!Array.isArray(value)) {
      return null;
    }
    const names = value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    return names.length ? dedupePersonNames(names) : null;
  }
  
  function resolveBookAuthors(book) {
    const override = resolveOverrideNames(book?.authors);
    if (override) {
      return override;
    }
    const raw = getDisplayAuthorRaw(book);
    return parseAuthorNames(raw);
  }
  
  function resolveBookAuthorCollectiveSuffix(book) {
    if (resolveOverrideNames(book?.authors)) {
      return null;
    }
    return parseAuthorCollectiveSuffix(getDisplayAuthorRaw(book));
  }
  
  function resolveBookCoverArtists(book) {
    const override = resolveOverrideNames(book?.coverArtists);
    if (override) {
      return override;
    }
    return parseCoverArtistNames(book?.coverArtist);
  }
  
  function formatPersonList(names) {
    return (names || []).join(", ");
  }
  
  function formatAuthorDisplay(names, collectiveSuffix) {
    const base = formatPersonList(names);
    if (!base) {
      return collectiveSuffix || "";
    }
    return collectiveSuffix ? `${base} ${collectiveSuffix}` : base;
  }
  return {
    normalizePersonKey,
    stripQualifyingParentheticals,
    splitPersonList,
    parseAuthorNames,
    parseAuthorCollectiveSuffix,
    parseCoverArtistNames,
    getDisplayAuthorRaw,
    resolveBookAuthors,
    resolveBookAuthorCollectiveSuffix,
    resolveBookCoverArtists,
    formatPersonList,
    formatAuthorDisplay,
  };
})();


/* Generated from scripts/lib/viewer-card-html.js — run npm run bundle-viewer */

const viewerCardHtml = (function () {
  function getPersonNames() {
    if (typeof viewerPersonNames !== "undefined") {
      return viewerPersonNames;
    }
    throw new Error("viewerPersonNames is not available");
  }
  
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  
  function getDisplayAuthor(book) {
    const authors = getPersonNames().resolveBookAuthors(book);
    if (authors.length) {
      return authors[0];
    }
    return null;
  }
  
  function getAuthorLastName(book) {
    const author = getDisplayAuthor(book);
    if (!author) {
      return null;
    }
    const suffixes = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv"]);
    const parts = author.trim().split(/\s+/);
    while (parts.length > 1 && suffixes.has(parts[parts.length - 1].toLowerCase())) {
      parts.pop();
    }
    return parts.length
      ? parts[parts.length - 1].replace(/[,.]+$/, "")
      : null;
  }
  
  function getGoodreadsSearchUrl(book) {
    const query = [(book.title || book.listTitle || "").trim(), getAuthorLastName(book)]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (!query) {
      return null;
    }
    const params = new URLSearchParams({
      utf8: "✓",
      q: query,
      search_type: "books",
    });
    return `https://www.goodreads.com/search?${params}`;
  }
  
  function renderWikiButton(url, className = "card-wiki-btn") {
    if (!url) {
      return "";
    }
  
    return `
    <a
      class="${className}"
      href="${url}"
      target="_blank"
      rel="noopener"
      aria-label="Open on Wikipedia"
      title="Wikipedia"
    >W</a>
  `;
  }
  
  function renderGoodreadsButton(link, className = "card-goodreads-btn") {
    if (!link?.url) {
      return "";
    }
  
    const searchClass = link.search ? ` ${className}--search` : "";
    const label = link.search ? "Search on Goodreads" : "Open on Goodreads";
    const title = link.search ? "Search Goodreads" : "Goodreads";
  
    return `
    <a
      class="${className}${searchClass}"
      href="${link.url}"
      target="_blank"
      rel="noopener"
      aria-label="${label}"
      title="${title}"
    >G</a>
  `;
  }
  
  function renderDetailFieldChip(fieldKey, label) {
    const safe = escapeHtml(label);
    return `<button type="button" class="search-field-chip search-field-chip--${fieldKey} book-detail-field-chip" data-search-field="${fieldKey}">${safe}</button>`;
  }
  
  function renderBookMetaHtml(book) {
    const personNames = getPersonNames();
    const authors = personNames.resolveBookAuthors(book);
    const authorSuffix = personNames.resolveBookAuthorCollectiveSuffix(book);
    const coverArtists = personNames.resolveBookCoverArtists(book);
    const lines = [];
  
    if (authors.length || authorSuffix) {
      lines.push(
        `<p class="meta"><strong>Author:</strong> ${escapeHtml(personNames.formatAuthorDisplay(authors, authorSuffix))}</p>`,
      );
    }
  
    if (coverArtists.length) {
      lines.push(
        `<p class="meta"><strong>Cover:</strong> ${escapeHtml(personNames.formatPersonList(coverArtists))}</p>`,
      );
    }
  
    if (book.imprint === "mycroft_moran") {
      lines.push(`<p class="meta"><strong>Imprint:</strong> Mycroft &amp; Moran</p>`);
    }
  
    return lines.join("");
  }
  
  function renderBookDetailMetaHtml(book) {
    const personNames = getPersonNames();
    const authors = personNames.resolveBookAuthors(book);
    const authorSuffix = personNames.resolveBookAuthorCollectiveSuffix(book);
    const coverArtists = personNames.resolveBookCoverArtists(book);
    const lines = [];
  
    if (authors.length || authorSuffix) {
      const chips = authors
        .map((name) => renderDetailFieldChip("author", name))
        .join("");
      const suffixHtml = authorSuffix
        ? `<span class="book-detail-author-suffix">${escapeHtml(` ${authorSuffix}`)}</span>`
        : "";
      lines.push(
        `<p class="meta book-detail-meta-line"><strong>Author:</strong> ${chips}${suffixHtml}</p>`,
      );
    }
  
    if (coverArtists.length) {
      const chips = coverArtists
        .map((name) => renderDetailFieldChip("cover", name))
        .join("");
      lines.push(
        `<p class="meta book-detail-meta-line"><strong>Cover:</strong> ${chips}</p>`,
      );
    }
  
    if (book.imprint === "mycroft_moran") {
      lines.push(`<p class="meta"><strong>Imprint:</strong> Mycroft &amp; Moran</p>`);
    }
  
    return lines.join("");
  }
  
  function renderImprintBadge(book, placement = "cover") {
    const isMycroft = book.imprint === "mycroft_moran";
    const label = isMycroft ? "MM" : "AH";
    const title = isMycroft ? "Mycroft & Moran" : "Arkham House";
    const imprintClass = isMycroft ? "imprint-badge--mm" : "imprint-badge--ah";
  
    return `<span class="imprint-badge imprint-badge--${placement} ${imprintClass}" title="${title}" aria-label="${title}">${label}</span>`;
  }
  return {
    escapeHtml,
    getDisplayAuthor,
    getAuthorLastName,
    getGoodreadsSearchUrl,
    renderWikiButton,
    renderGoodreadsButton,
    renderBookMetaHtml,
    renderBookDetailMetaHtml,
    renderImprintBadge,
  };
})();


/* Generated from scripts/lib/viewer-want-order-normalize.js — run npm run bundle-viewer */

const viewerWantOrderNormalize = (function () {
  function normalizeWantIdList(raw) {
    if (raw == null || raw === "") {
      return [];
    }
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!Array.isArray(parsed)) {
        return [];
      }
      const ids = [];
      const seen = new Set();
      for (const entry of parsed) {
        if (entry == null || entry === "") {
          continue;
        }
        const id = Number(entry);
        if (!Number.isFinite(id) || !Number.isInteger(id) || seen.has(id)) {
          continue;
        }
        seen.add(id);
        ids.push(id);
      }
      return ids;
    } catch (_) {
      return [];
    }
  }
  
  function normalizeWantMembership(raw) {
    if (Array.isArray(raw)) {
      return normalizeWantIdList(raw);
    }
    if (raw && typeof raw === "object" && Array.isArray(raw.wantIds)) {
      return normalizeWantIdList(raw.wantIds);
    }
    return normalizeWantIdList(raw);
  }
  
  function normalizeWantOrderIds(raw, wantIds) {
    const membership = normalizeWantMembership(wantIds);
    const membershipSet = new Set(membership);
    const ordered = [];
    const seen = new Set();
  
    for (const id of normalizeWantIdList(raw)) {
      if (!membershipSet.has(id) || seen.has(id)) {
        continue;
      }
      seen.add(id);
      ordered.push(id);
    }
  
    for (const id of membership) {
      if (!seen.has(id)) {
        ordered.push(id);
      }
    }
  
    return ordered;
  }
  return {
    normalizeWantIdList,
    normalizeWantMembership,
    normalizeWantOrderIds,
  };
})();


/* Generated from scripts/lib/viewer-book-status.js — run npm run bundle-viewer */

const viewerBookStatus = (function () {
  /**
   * Per-book collection status with a change stamp on every book.
   *
   * Want, ordered, and collected are mutually exclusive in the viewer: setting one
   * clears the others, so each book carries exactly one status. Stamping each book
   * individually (instead of relying on a single `updatedAt` for the whole payload)
   * is what lets two devices merge without a stale tab erasing books it never knew
   * about. Removals are recorded as NONE tombstones rather than inferred from
   * absence, so a delete still outranks an older positive status.
   */
  
  const COLLECTED = "collected";
  const ORDERED = "ordered";
  const WANT = "want";
  const NONE = "none";
  
  const STATUS_VALUES = new Set([COLLECTED, ORDERED, WANT, NONE]);
  
  /**
   * Ranking used when two stamps carry the same instant. Ties keep the book, and
   * the stronger claim on a book wins, so a merge never silently drops data just
   * because two devices wrote in the same millisecond.
   */
  const TIE_PRIORITY = {
    [COLLECTED]: 3,
    [ORDERED]: 2,
    [WANT]: 1,
    [NONE]: 0,
  };
  
  function normalizeBookId(raw) {
    if (raw == null || raw === "") {
      return null;
    }
    const id = Number(raw);
    return Number.isInteger(id) ? id : null;
  }
  
  function normalizeStatusValue(raw) {
    return STATUS_VALUES.has(raw) ? raw : null;
  }
  
  function normalizeStampTime(raw) {
    if (typeof raw !== "string") {
      return null;
    }
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
  }
  
  function normalizeStamp(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    const status = normalizeStatusValue(raw.status);
    const at = normalizeStampTime(raw.at);
    return status && at ? { status, at } : null;
  }
  
  function emptyStatusMap() {
    return {};
  }
  
  function normalizeStatusMap(raw) {
    if (raw == null || raw === "") {
      return emptyStatusMap();
    }
    let source = raw;
    if (typeof source === "string") {
      try {
        source = JSON.parse(source);
      } catch (_) {
        return emptyStatusMap();
      }
    }
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      return emptyStatusMap();
    }
  
    const map = emptyStatusMap();
    for (const [key, value] of Object.entries(source)) {
      const id = normalizeBookId(key);
      const stamp = normalizeStamp(value);
      if (id != null && stamp) {
        map[id] = stamp;
      }
    }
    return map;
  }
  
  function getBookStatus(map, id) {
    const bookId = normalizeBookId(id);
    if (bookId == null) {
      return NONE;
    }
    const stamp = normalizeStamp(map?.[bookId]);
    return stamp ? stamp.status : NONE;
  }
  
  /** Newest stamp wins; same instant falls back to TIE_PRIORITY. */
  function pickWinningStamp(a, b) {
    if (!a) {
      return b || null;
    }
    if (!b) {
      return a;
    }
    const aTime = Date.parse(a.at);
    const bTime = Date.parse(b.at);
    if (aTime !== bTime) {
      return aTime > bTime ? a : b;
    }
    return TIE_PRIORITY[b.status] > TIE_PRIORITY[a.status] ? b : a;
  }
  
  function mergeStatusMaps(localMap, remoteMap) {
    const local = normalizeStatusMap(localMap);
    const remote = normalizeStatusMap(remoteMap);
    const merged = emptyStatusMap();
    for (const id of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const winner = pickWinningStamp(local[id], remote[id]);
      if (winner) {
        merged[id] = winner;
      }
    }
    return merged;
  }
  
  function setBookStatus(map, id, status, atIso) {
    const normalized = normalizeStatusMap(map);
    const bookId = normalizeBookId(id);
    const nextStatus = normalizeStatusValue(status);
    const at = normalizeStampTime(atIso);
    if (bookId == null || !nextStatus || !at) {
      return normalized;
    }
    return { ...normalized, [bookId]: { status: nextStatus, at } };
  }
  
  /** Mirrors the viewer's collect button: collected → none, ordered → collected, anything else → ordered. */
  function cycleCollectionStatus(map, id, atIso) {
    const current = getBookStatus(map, id);
    if (current === COLLECTED) {
      return setBookStatus(map, id, NONE, atIso);
    }
    if (current === ORDERED) {
      return setBookStatus(map, id, COLLECTED, atIso);
    }
    return setBookStatus(map, id, ORDERED, atIso);
  }
  
  /** Turning want off only clears a book that is actually wanted, matching syncWantMembership. */
  function setWantStatus(map, id, wanted, atIso) {
    if (wanted) {
      return setBookStatus(map, id, WANT, atIso);
    }
    if (getBookStatus(map, id) !== WANT) {
      return normalizeStatusMap(map);
    }
    return setBookStatus(map, id, NONE, atIso);
  }
  
  function idsWithStatus(map, status) {
    const normalized = normalizeStatusMap(map);
    const ids = [];
    for (const [key, stamp] of Object.entries(normalized)) {
      if (stamp.status === status) {
        ids.push(Number(key));
      }
    }
    ids.sort((a, b) => a - b);
    return ids;
  }
  
  function deriveIdsByStatus(map) {
    const normalized = normalizeStatusMap(map);
    return {
      collectionIds: idsWithStatus(normalized, COLLECTED),
      orderedIds: idsWithStatus(normalized, ORDERED),
      wantIds: idsWithStatus(normalized, WANT),
    };
  }
  
  /**
   * Seed a status map from the flat v2 id arrays. Conflicting membership in legacy
   * data resolves by TIE_PRIORITY, and absent books get no tombstone: "unknown"
   * loses to any positive stamp, so migrating can never delete a book.
   */
  function statusMapFromIdArrays(arrays, atIso) {
    const at = normalizeStampTime(atIso);
    if (!at) {
      return emptyStatusMap();
    }
    const map = emptyStatusMap();
    const seed = [
      [WANT, arrays?.wantIds],
      [ORDERED, arrays?.orderedIds],
      [COLLECTED, arrays?.collectionIds],
    ];
    for (const [status, ids] of seed) {
      for (const raw of Array.isArray(ids) ? ids : []) {
        const id = normalizeBookId(raw);
        if (id == null) {
          continue;
        }
        const existing = map[id];
        if (!existing || TIE_PRIORITY[status] > TIE_PRIORITY[existing.status]) {
          map[id] = { status, at };
        }
      }
    }
    return map;
  }
  
  /**
   * Replace collected / ordered / want membership from a CSV import. Every book
   * listed in the file gets the imported status; anything previously in one of
   * those states but missing from the file is tombstoned so export → re-import
   * round-trips exactly.
   */
  function replaceStatusesFromImport(map, entries, atIso) {
    const normalized = normalizeStatusMap(map);
    const at = normalizeStampTime(atIso);
    if (!at) {
      return normalized;
    }
  
    const importedById = new Map();
    for (const entry of Array.isArray(entries) ? entries : []) {
      const id = normalizeBookId(entry?.id);
      const status = normalizeStatusValue(entry?.status);
      if (id != null && status && status !== NONE) {
        importedById.set(id, status);
      }
    }
  
    const next = { ...normalized };
    for (const [key, stamp] of Object.entries(normalized)) {
      const id = Number(key);
      const hadMembership =
        stamp.status === COLLECTED ||
        stamp.status === ORDERED ||
        stamp.status === WANT;
      if (hadMembership && !importedById.has(id)) {
        next[id] = { status: NONE, at };
      }
    }
    for (const [id, status] of importedById) {
      next[id] = { status, at };
    }
    return next;
  }
  
  /**
   * Legacy collected-only import: every matched id becomes collected; ordered
   * titles drop out; wants are left alone unless listed (then collected wins).
   */
  function replaceCollectionStatuses(map, ids, atIso) {
    const entries = (Array.isArray(ids) ? ids : []).map((raw) => ({
      id: raw,
      status: COLLECTED,
    }));
    const normalized = normalizeStatusMap(map);
    const at = normalizeStampTime(atIso);
    if (!at) {
      return normalized;
    }
  
    const imported = new Set(
      entries
        .map((entry) => normalizeBookId(entry.id))
        .filter((id) => id != null),
    );
  
    const next = emptyStatusMap();
    for (const [key, stamp] of Object.entries(normalized)) {
      const id = Number(key);
      if (imported.has(id)) {
        continue;
      }
      next[id] =
        stamp.status === COLLECTED || stamp.status === ORDERED
          ? { status: NONE, at }
          : stamp;
    }
    for (const id of imported) {
      next[id] = { status: COLLECTED, at };
    }
    return next;
  }
  
  /**
   * Replace `baseMap` wholesale with `nextMap`, stamped at one instant.
   *
   * Restoring a backup has to beat whatever is on the server, and a snapshot's own
   * stamps are by definition older. Books the snapshot does not mention get
   * tombstones so the restore stays faithful instead of quietly keeping books the
   * user restored away from.
   */
  function supersedeStatusMap(baseMap, nextMap, atIso) {
    const base = normalizeStatusMap(baseMap);
    const next = normalizeStatusMap(nextMap);
    const at = normalizeStampTime(atIso);
    if (!at) {
      return base;
    }
    const merged = emptyStatusMap();
    for (const key of Object.keys(base)) {
      merged[Number(key)] = { status: NONE, at };
    }
    for (const [key, stamp] of Object.entries(next)) {
      merged[Number(key)] = { status: stamp.status, at };
    }
    return merged;
  }
  
  /**
   * Re-stamp every book at one instant. Restoring a backup has to outrank whatever
   * is on the server, and the snapshot's original stamps are by definition older.
   */
  function restampStatusMap(map, atIso) {
    const normalized = normalizeStatusMap(map);
    const at = normalizeStampTime(atIso);
    if (!at) {
      return normalized;
    }
    const next = emptyStatusMap();
    for (const [key, stamp] of Object.entries(normalized)) {
      next[Number(key)] = { status: stamp.status, at };
    }
    return next;
  }
  return {
    COLLECTED,
    ORDERED,
    WANT,
    NONE,
    normalizeBookId,
    normalizeStampTime,
    emptyStatusMap,
    normalizeStatusMap,
    getBookStatus,
    mergeStatusMaps,
    setBookStatus,
    cycleCollectionStatus,
    setWantStatus,
    deriveIdsByStatus,
    statusMapFromIdArrays,
    replaceStatusesFromImport,
    replaceCollectionStatuses,
    supersedeStatusMap,
    restampStatusMap,
  };
})();


/* Generated from scripts/lib/viewer-user-state.js — run npm run bundle-viewer */

const viewerUserState = (function () {
  const USER_STATE_KEY = "arkham-user-state";
  const USER_STATE_BACKUP_KEY = "arkham-user-state-backup";
  const USER_STATE_VERSION = 3;
  const USER_STATE_VERSION_V2 = 2;
  const USER_STATE_VERSION_V1 = 1;
  
  /**
   * Stamp used when a time has to be invented — pre-v3 data, or id arrays that
   * arrived without a status map. The epoch loses to every real edit, so upgrading
   * or re-reading old state can never outrank a live change on another device.
   */
  const FALLBACK_STAMP_AT = new Date(0).toISOString();
  
  const LEGACY_KEYS = {
    collection: "arkham-collection",
    sampleCollection: "arkham-sample-collection",
    ordered: "arkham-collection-ordered",
    want: "arkham-want-list",
    collectionSource: "arkham-collection-source",
    sort: "arkham-sort",
    viewMode: "arkham-view-mode",
    headerFiltersExpanded: "arkham-header-filters-expanded",
    highlightWants: "arkham-highlight-wants",
    highlightCollection: "arkham-highlight-collection",
    showMagazines: "arkham-show-magazines",
  };
  
  const SORT_MODES = new Set([
    "date-desc",
    "date-asc",
    "title-asc",
    "title-desc",
  ]);
  
  function defaultUserState() {
    return {
      version: USER_STATE_VERSION,
      updatedAt: null,
      storageMode: "local",
      collectionIds: [],
      orderedIds: [],
      wantIds: [],
      wantOrderIds: [],
      collections: defaultCollections(),
      preferences: {
        sort: "date-asc",
        viewMode: "cards",
        headerFiltersExpanded: true,
        highlightWants: true,
        highlightCollection: true,
        showMagazines: false,
        wantOrderLocked: false,
      },
    };
  }
  
  /**
   * A storage slot keeps `statuses` as the only source of truth. The id arrays are
   * derived mirrors, recomputed on every normalize so they can never drift out of
   * step with the stamps.
   */
  function buildCollectionSlot(statuses, wantOrderIdsRaw) {
    const normalized = viewerBookStatus.normalizeStatusMap(statuses);
    const derived = viewerBookStatus.deriveIdsByStatus(normalized);
    return {
      statuses: normalized,
      collectionIds: derived.collectionIds,
      orderedIds: derived.orderedIds,
      wantIds: derived.wantIds,
      wantOrderIds: viewerWantOrderNormalize.normalizeWantOrderIds(wantOrderIdsRaw, derived.wantIds),
    };
  }
  
  function emptyCollectionSlot() {
    return buildCollectionSlot({}, []);
  }
  
  function slotFromIdArrays(arrays, at, wantOrderIdsRaw) {
    return buildCollectionSlot(
      viewerBookStatus.statusMapFromIdArrays(
        {
          collectionIds: normalizeIdArray(arrays?.collectionIds),
          orderedIds: normalizeIdArray(arrays?.orderedIds),
          wantIds: normalizeIdArray(arrays?.wantIds),
        },
        at,
      ),
      wantOrderIdsRaw,
    );
  }
  
  function defaultCollections() {
    return { local: emptyCollectionSlot(), gist: emptyCollectionSlot() };
  }
  
  function resolveStampAt(raw) {
    return viewerBookStatus.normalizeStampTime(raw) || FALLBACK_STAMP_AT;
  }
  
  function normalizeCollectionSlot(raw, fallback = emptyCollectionSlot(), options = {}) {
    const source = raw && typeof raw === "object" ? raw : null;
    if (!source) {
      return buildCollectionSlot(fallback.statuses, fallback.wantOrderIds);
    }
  
    const statuses = viewerBookStatus.normalizeStatusMap(source.statuses);
    if (Object.keys(statuses).length) {
      return buildCollectionSlot(statuses, source.wantOrderIds);
    }
  
    // Pre-v3 slot: rebuild stamps from whatever id arrays it carried.
    return slotFromIdArrays(
      {
        collectionIds: source.collectionIds,
        orderedIds: source.orderedIds,
        wantIds: source.wantIds ?? fallback.wantIds,
      },
      resolveStampAt(options.at),
      source.wantOrderIds ?? fallback.wantOrderIds,
    );
  }
  
  function normalizeCollections(
    raw,
    topLevelIds = [],
    topLevelOrdered = [],
    options = {},
  ) {
    const at = resolveStampAt(options.at);
    const fallbackArrays = {
      collectionIds: topLevelIds,
      orderedIds: topLevelOrdered,
      wantIds: options.wantIds,
    };
    const fallback = slotFromIdArrays(fallbackArrays, at, options.wantOrderIds);
  
    if (!raw || typeof raw !== "object") {
      return {
        local: slotFromIdArrays(fallbackArrays, at, options.wantOrderIds),
        gist: slotFromIdArrays(fallbackArrays, at, options.wantOrderIds),
      };
    }
    return {
      local: normalizeCollectionSlot(raw.local, fallback, options),
      gist: normalizeCollectionSlot(raw.gist, fallback, options),
    };
  }
  
  function activeCollectionSlot(state) {
    const mode = normalizeStorageMode(state.storageMode);
    const collections = normalizeCollections(
      state.collections,
      state.collectionIds,
      state.orderedIds,
      {
        wantIds: state.wantIds,
        wantOrderIds: state.wantOrderIds,
        at: state.updatedAt,
      },
    );
    return collections[mode];
  }
  
  function localCollectionSlotFromPersisted(localPersisted) {
    return normalizeCollectionSlot(
      localPersisted?.collections?.local,
      slotFromIdArrays(
        {
          collectionIds: localPersisted?.collectionIds,
          orderedIds: localPersisted?.orderedIds,
          wantIds: localPersisted?.wantIds,
        },
        resolveStampAt(localPersisted?.updatedAt),
        localPersisted?.wantOrderIds,
      ),
      { at: localPersisted?.updatedAt },
    );
  }
  
  /** Shape the top-level mirrors from whichever slot the active storage mode uses. */
  function withActiveSlotMirrors(state, collections, storageMode) {
    const active = collections[storageMode] || collections.local;
    return {
      ...state,
      storageMode,
      collectionIds: active.collectionIds,
      orderedIds: active.orderedIds,
      wantIds: active.wantIds,
      wantOrderIds: active.wantOrderIds,
      collections,
    };
  }
  
  function buildNewGistConnectState(localPersisted) {
    const base = defaultUserState();
    const at = resolveStampAt(localPersisted?.updatedAt);
    const mode = normalizeStorageMode(localPersisted?.storageMode);
    const collections = normalizeCollections(
      localPersisted?.collections,
      localPersisted?.collectionIds,
      localPersisted?.orderedIds,
      {
        wantIds: localPersisted?.wantIds,
        wantOrderIds: localPersisted?.wantOrderIds,
        at,
      },
    );
    const activeSlot = collections[mode] || collections.local;
    const nextCollections = {
      local: collections.local,
      gist: buildCollectionSlot(activeSlot.statuses, activeSlot.wantOrderIds),
    };
    return withActiveSlotMirrors(
      {
        ...base,
        updatedAt: new Date().toISOString(),
        preferences: normalizePreferences(localPersisted?.preferences, base),
      },
      nextCollections,
      "gist",
    );
  }
  
  /** @deprecated Use buildNewGistConnectState */
  function buildEmptyGistConnectState(localPersisted) {
    return buildNewGistConnectState(localPersisted);
  }
  
  function adoptRemoteGistState(remoteState, localPersisted) {
    const parsed =
      typeof remoteState === "string"
        ? parseUserState(remoteState)
        : parseUserState(serializeUserState(remoteState));
    if (!parsed) {
      return null;
    }
    const collections = {
      local: localCollectionSlotFromPersisted(localPersisted),
      gist: parsed.collections.gist,
    };
    return withActiveSlotMirrors(parsed, collections, "gist");
  }
  
  function normalizeIdArray(raw) {
    if (raw == null || raw === "") {
      return [];
    }
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!Array.isArray(parsed)) {
        return [];
      }
      const ids = [
        ...new Set(
          parsed
            .filter((id) => id != null && id !== "")
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && Number.isInteger(id)),
        ),
      ];
      ids.sort((a, b) => a - b);
      return ids;
    } catch (_) {
      return [];
    }
  }
  
  function normalizeSort(raw, fallback = "date-asc") {
    return raw && SORT_MODES.has(raw) ? raw : fallback;
  }
  
  function normalizeBoolFlag(raw, defaultVal) {
    if (raw === "0") {
      return false;
    }
    if (raw === "1") {
      return true;
    }
    return defaultVal;
  }
  
  function normalizeStorageMode(raw) {
    return raw === "gist" ? "gist" : "local";
  }
  
  function normalizeViewMode(raw, fallback = "cards") {
    return raw === "list" ? "list" : fallback;
  }
  
  function normalizeWantOrderLocked(raw, fallback = false) {
    return typeof raw === "boolean" ? raw : fallback;
  }
  
  function normalizePreferences(raw, base) {
    return {
      sort: normalizeSort(raw?.sort, base.preferences.sort),
      viewMode: normalizeViewMode(raw?.viewMode, base.preferences.viewMode),
      headerFiltersExpanded:
        typeof raw?.headerFiltersExpanded === "boolean"
          ? raw.headerFiltersExpanded
          : base.preferences.headerFiltersExpanded,
      highlightWants:
        typeof raw?.highlightWants === "boolean"
          ? raw.highlightWants
          : base.preferences.highlightWants,
      highlightCollection:
        typeof raw?.highlightCollection === "boolean"
          ? raw.highlightCollection
          : base.preferences.highlightCollection,
      showMagazines:
        typeof raw?.showMagazines === "boolean"
          ? raw.showMagazines
          : base.preferences.showMagazines,
      wantOrderLocked: normalizeWantOrderLocked(
        raw?.wantOrderLocked,
        base.preferences.wantOrderLocked,
      ),
    };
  }
  
  function legacyStorageModeFromSource(sourceRaw) {
    return "local";
  }
  
  function legacyCollectionIds(snapshot) {
    return normalizeIdArray(snapshot[LEGACY_KEYS.collection]);
  }
  
  function migrateFromLegacy(legacy) {
    const base = defaultUserState();
    const snapshot = legacy || {};
    const arrays = {
      collectionIds: legacyCollectionIds(snapshot),
      orderedIds: normalizeIdArray(snapshot[LEGACY_KEYS.ordered]),
      wantIds: normalizeIdArray(snapshot[LEGACY_KEYS.want]),
    };
    const slot = slotFromIdArrays(arrays, FALLBACK_STAMP_AT, null);
  
    return withActiveSlotMirrors(
      {
        ...base,
        updatedAt: null,
        preferences: normalizePreferences(
          {
            sort: snapshot[LEGACY_KEYS.sort],
            viewMode: snapshot[LEGACY_KEYS.viewMode],
            headerFiltersExpanded: snapshot[LEGACY_KEYS.headerFiltersExpanded],
            highlightWants: snapshot[LEGACY_KEYS.highlightWants],
            highlightCollection: snapshot[LEGACY_KEYS.highlightCollection],
            showMagazines: snapshot[LEGACY_KEYS.showMagazines],
          },
          base,
        ),
      },
      {
        local: slot,
        gist: slotFromIdArrays(arrays, FALLBACK_STAMP_AT, null),
      },
      legacyStorageModeFromSource(snapshot[LEGACY_KEYS.collectionSource]),
    );
  }
  
  function hasLegacyUserData(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      return false;
    }
    return Object.values(snapshot).some(
      (value) => value != null && value !== "",
    );
  }
  
  /** v1 → v2: flat arrays only. v2 → v3 builds the stamped slots. */
  function migrateV1ToV2(v1) {
    const base = defaultUserState();
    const wantIds = normalizeIdArray(v1.wantIds);
    return {
      version: USER_STATE_VERSION_V2,
      updatedAt: v1.updatedAt || null,
      storageMode: "local",
      collectionIds: normalizeIdArray(v1.ownCollectionIds),
      orderedIds: normalizeIdArray(v1.orderedIds),
      wantIds,
      wantOrderIds: viewerWantOrderNormalize.normalizeWantOrderIds(null, wantIds),
      preferences: normalizePreferences(v1.preferences, base),
    };
  }
  
  /**
   * v2 kept one shared want list across both storage slots while collections were
   * per-slot. v3 gives each slot a single status per book, so the shared wants are
   * seeded into both slots — nothing is dropped, and the two only diverge if wants
   * are edited after the upgrade.
   */
  function migrateV2ToV3(v2) {
    const base = defaultUserState();
    const at = resolveStampAt(v2?.updatedAt);
    const wantIds = normalizeIdArray(v2?.wantIds);
    const wantOrderIds = viewerWantOrderNormalize.normalizeWantOrderIds(v2?.wantOrderIds, wantIds);
    const rawCollections =
      v2?.collections && typeof v2.collections === "object" ? v2.collections : null;
  
    const slotFor = (slotRaw) =>
      slotFromIdArrays(
        {
          collectionIds: slotRaw?.collectionIds ?? v2?.collectionIds,
          orderedIds: slotRaw?.orderedIds ?? v2?.orderedIds,
          wantIds,
        },
        at,
        wantOrderIds,
      );
  
    return withActiveSlotMirrors(
      {
        ...base,
        updatedAt: typeof v2?.updatedAt === "string" ? v2.updatedAt : null,
        preferences: normalizePreferences(v2?.preferences, base),
      },
      {
        local: slotFor(rawCollections?.local),
        gist: slotFor(rawCollections?.gist),
      },
      normalizeStorageMode(v2?.storageMode),
    );
  }
  
  function parseUserStateV1(json) {
    if (json == null || json === "") {
      return null;
    }
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      if (!parsed || parsed.version !== USER_STATE_VERSION_V1) {
        return null;
      }
  
      const base = defaultUserState();
      const sampleRaw = parsed.sampleCollectionIds;
      let sampleCollectionIds = null;
      if (sampleRaw !== null && sampleRaw !== undefined) {
        sampleCollectionIds = normalizeIdArray(sampleRaw);
      }
  
      return {
        version: USER_STATE_VERSION_V1,
        updatedAt:
          typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
        collectionSource:
          parsed.collectionSource === "own" || parsed.collectionSource === "sample"
            ? parsed.collectionSource
            : null,
        ownCollectionIds: normalizeIdArray(parsed.ownCollectionIds),
        sampleCollectionIds,
        orderedIds: normalizeIdArray(parsed.orderedIds),
        wantIds: normalizeIdArray(parsed.wantIds),
        preferences: normalizePreferences(parsed.preferences, base),
      };
    } catch (_) {
      return null;
    }
  }
  
  function parseUserStateV2(json) {
    if (json == null || json === "") {
      return null;
    }
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      if (!parsed || parsed.version !== USER_STATE_VERSION_V2) {
        return null;
      }
  
      const base = defaultUserState();
      const wantIds = normalizeIdArray(parsed.wantIds);
      return {
        version: USER_STATE_VERSION_V2,
        updatedAt:
          typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
        storageMode: normalizeStorageMode(parsed.storageMode),
        collectionIds: normalizeIdArray(parsed.collectionIds),
        orderedIds: normalizeIdArray(parsed.orderedIds),
        collections: parsed.collections,
        wantIds,
        wantOrderIds: viewerWantOrderNormalize.normalizeWantOrderIds(parsed.wantOrderIds, wantIds),
        preferences: normalizePreferences(parsed.preferences, base),
      };
    } catch (_) {
      return null;
    }
  }
  
  function parseUserStateV3(json) {
    if (json == null || json === "") {
      return null;
    }
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      if (!parsed || parsed.version !== USER_STATE_VERSION) {
        return null;
      }
  
      const base = defaultUserState();
      const collections = normalizeCollections(
        parsed.collections,
        parsed.collectionIds,
        parsed.orderedIds,
        {
          wantIds: parsed.wantIds,
          wantOrderIds: parsed.wantOrderIds,
          at: parsed.updatedAt,
        },
      );
      return withActiveSlotMirrors(
        {
          ...base,
          updatedAt:
            typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
          preferences: normalizePreferences(parsed.preferences, base),
        },
        collections,
        normalizeStorageMode(parsed.storageMode),
      );
    } catch (_) {
      return null;
    }
  }
  
  function parseUserState(json) {
    const v3 = parseUserStateV3(json);
    if (v3) {
      return v3;
    }
    const v2 = parseUserStateV2(json);
    if (v2) {
      return migrateV2ToV3(v2);
    }
    const v1 = parseUserStateV1(json);
    if (v1) {
      return migrateV2ToV3(migrateV1ToV2(v1));
    }
    return null;
  }
  
  /**
   * Build persistable state from the live viewer. `bookStatuses` is authoritative
   * when present; without it the id arrays are stamped at the epoch rather than
   * now, so an ordinary save never looks newer than a real edit elsewhere.
   */
  function buildUserStateFromRuntime(snapshot, options = {}) {
    const base = defaultUserState();
    const mode = normalizeStorageMode(snapshot.storageMode);
    const statuses = snapshot.bookStatuses
      ? viewerBookStatus.normalizeStatusMap(snapshot.bookStatuses)
      : viewerBookStatus.statusMapFromIdArrays(
          {
            collectionIds: normalizeIdArray(snapshot.collectionIds),
            orderedIds: normalizeIdArray(snapshot.orderedIds),
            wantIds: normalizeIdArray(snapshot.wantIds),
          },
          FALLBACK_STAMP_AT,
        );
  
    const collections = normalizeCollections(options.existingCollections, [], [], {
      at: FALLBACK_STAMP_AT,
    });
    collections[mode] = buildCollectionSlot(statuses, snapshot.wantOrderIds);
  
    return withActiveSlotMirrors(
      {
        ...base,
        updatedAt: new Date().toISOString(),
        preferences: {
          sort: normalizeSort(snapshot.sort),
          viewMode: normalizeViewMode(snapshot.viewMode),
          headerFiltersExpanded: Boolean(snapshot.headerFiltersExpanded),
          highlightWants: Boolean(snapshot.highlightWants),
          highlightCollection: Boolean(snapshot.highlightCollection),
          showMagazines: Boolean(snapshot.showMagazines),
          wantOrderLocked: normalizeWantOrderLocked(snapshot.wantOrderLocked),
        },
      },
      collections,
      mode,
    );
  }
  
  function applyUserStateToRuntime(state) {
    const parsed = parseUserState(state) || migrateFromLegacy(null);
    const active = activeCollectionSlot(parsed);
    return {
      storageMode: parsed.storageMode,
      bookStatuses: active.statuses,
      collectionIds: active.collectionIds,
      orderedIds: active.orderedIds,
      wantIds: active.wantIds,
      wantOrderIds: active.wantOrderIds,
      sort: parsed.preferences.sort,
      viewMode: parsed.preferences.viewMode,
      headerFiltersExpanded: parsed.preferences.headerFiltersExpanded,
      highlightWants: parsed.preferences.highlightWants,
      highlightCollection: parsed.preferences.highlightCollection,
      showMagazines: parsed.preferences.showMagazines,
      wantOrderLocked: parsed.preferences.wantOrderLocked,
    };
  }
  
  function serializeUserState(state) {
    return JSON.stringify(state);
  }
  
  /** Accepts a JSON string, a v3 object, or an older payload, and returns v3 or null. */
  function normalizeStateForMerge(state) {
    if (state == null) {
      return null;
    }
    return parseUserState(
      typeof state === "string" ? state : serializeUserState(state),
    );
  }
  
  function stateUpdatedAtMs(state) {
    const parsed = Date.parse(state?.updatedAt || "");
    return Number.isFinite(parsed) ? parsed : null;
  }
  
  /** Ties favour the local payload, which is the one the user is looking at. */
  function pickNewerState(local, remote) {
    const localMs = stateUpdatedAtMs(local);
    const remoteMs = stateUpdatedAtMs(remote);
    if (localMs == null && remoteMs != null) {
      return remote;
    }
    if (remoteMs == null) {
      return local;
    }
    return remoteMs > localMs ? remote : local;
  }
  
  /**
   * Merge two payloads book by book.
   *
   * Each book's own stamp decides its fate, so a device that never saw a book
   * cannot delete it — which is the whole reason v3 exists. Only the gist slot
   * merges: the local slot never leaves the device, so the local copy wins
   * outright. Preferences and want order have no per-item history, so they follow
   * the newer payload, and want order is re-normalized against merged membership.
   *
   * Older payloads are migrated on the way in, so a device still writing v2 can be
   * merged safely: its books arrive stamped at the epoch and lose to any real edit
   * without ever being dropped.
   */
  function mergeUserState(localState, remoteState) {
    const local = normalizeStateForMerge(localState);
    const remote = normalizeStateForMerge(remoteState);
    if (!local) {
      return remote;
    }
    if (!remote) {
      return local;
    }
  
    const newer = pickNewerState(local, remote);
    const collections = {
      local: local.collections.local,
      gist: buildCollectionSlot(
        viewerBookStatus.mergeStatusMaps(
          local.collections.gist.statuses,
          remote.collections.gist.statuses,
        ),
        newer.collections.gist.wantOrderIds,
      ),
    };
    const localMs = stateUpdatedAtMs(local);
    const remoteMs = stateUpdatedAtMs(remote);
    const updatedAt =
      localMs != null && remoteMs != null && localMs > remoteMs
        ? local.updatedAt
        : remote.updatedAt || local.updatedAt;
  
    return withActiveSlotMirrors(
      { ...newer, updatedAt },
      collections,
      normalizeStorageMode(newer.storageMode),
    );
  }
  return {
    USER_STATE_KEY,
    USER_STATE_BACKUP_KEY,
    USER_STATE_VERSION,
    FALLBACK_STAMP_AT,
    LEGACY_KEYS,
    defaultUserState,
    buildCollectionSlot,
    emptyCollectionSlot,
    normalizeCollections,
    normalizeCollectionSlot,
    activeCollectionSlot,
    localCollectionSlotFromPersisted,
    withActiveSlotMirrors,
    buildEmptyGistConnectState,
    buildNewGistConnectState,
    adoptRemoteGistState,
    normalizeIdArray,
    normalizeStorageMode,
    migrateFromLegacy,
    migrateV1ToV2,
    migrateV2ToV3,
    parseUserState,
    buildUserStateFromRuntime,
    applyUserStateToRuntime,
    serializeUserState,
    mergeUserState,
  };
})();


/* Generated from scripts/lib/viewer-gist-backup.js — run npm run bundle-viewer */

const viewerGistBackup = (function () {
  /**
   * Gist snapshot backups: one private gist, one JSON file, up to five immutable
   * state entries appended over time.
   */
  
  const BACKUP_GIST_DESCRIPTION = "Arkham Collector backups";
  const BACKUP_FILENAME = "arkham-collector-backups.json";
  const BACKUP_PAYLOAD_VERSION = 1;
  const MAX_SNAPSHOTS = 5;
  const SNAPSHOT_INTERVAL_MS = 24 * 60 * 60 * 1000;
  
  function emptyBackupPayload() {
    return { version: BACKUP_PAYLOAD_VERSION, snapshots: [] };
  }
  
  function normalizeAtStamp(value) {
    const time = Date.parse(String(value || ""));
    if (!Number.isFinite(time)) {
      return null;
    }
    return new Date(time).toISOString();
  }
  
  function normalizeSnapshotEntry(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const at = normalizeAtStamp(entry.at);
    const state = entry.state;
    if (!at || !state || typeof state !== "object") {
      return null;
    }
    return { at, state };
  }
  
  function parseBackupPayload(json) {
    if (json == null || json === "") {
      return emptyBackupPayload();
    }
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      if (!parsed || typeof parsed !== "object") {
        return emptyBackupPayload();
      }
      const snapshots = Array.isArray(parsed.snapshots)
        ? parsed.snapshots.map(normalizeSnapshotEntry).filter(Boolean)
        : [];
      snapshots.sort((a, b) => a.at.localeCompare(b.at));
      return {
        version: BACKUP_PAYLOAD_VERSION,
        snapshots,
      };
    } catch (_) {
      return emptyBackupPayload();
    }
  }
  
  function serializeBackupPayload(payload) {
    const snapshots = Array.isArray(payload?.snapshots)
      ? payload.snapshots.map(normalizeSnapshotEntry).filter(Boolean)
      : [];
    snapshots.sort((a, b) => a.at.localeCompare(b.at));
    return JSON.stringify(
      {
        version: BACKUP_PAYLOAD_VERSION,
        snapshots,
      },
      null,
      2,
    );
  }
  
  function snapshotListEntries(payload) {
    return (payload?.snapshots || []).map((entry) => ({ at: entry.at }));
  }
  
  function shouldCreateSnapshot(snapshots, nowMs, intervalMs = SNAPSHOT_INTERVAL_MS) {
    if (!snapshots?.length) {
      return true;
    }
    const latestAt = Date.parse(snapshots[snapshots.length - 1]?.at || "");
    if (!Number.isFinite(latestAt)) {
      return true;
    }
    return nowMs - latestAt >= intervalMs;
  }
  
  function appendSnapshot(payload, state, at, maxSnapshots = MAX_SNAPSHOTS) {
    const atIso = normalizeAtStamp(at);
    if (!atIso || !state || typeof state !== "object") {
      return payload || emptyBackupPayload();
    }
    const previous = (payload?.snapshots || [])
      .map(normalizeSnapshotEntry)
      .filter(Boolean);
    const next = [...previous, { at: atIso, state }];
    const trimmed =
      next.length > maxSnapshots ? next.slice(next.length - maxSnapshots) : next;
    return {
      version: BACKUP_PAYLOAD_VERSION,
      snapshots: trimmed,
    };
  }
  
  function findSnapshotByAt(payload, at) {
    const needle = normalizeAtStamp(at);
    if (!needle) {
      return null;
    }
    return (payload?.snapshots || []).find((entry) => entry.at === needle) || null;
  }
  
  function findBackupGistId(gists, syncGistId) {
    if (!Array.isArray(gists)) {
      return null;
    }
    let byDescription = null;
    for (const gist of gists) {
      if (!gist?.id || gist.id === syncGistId) {
        continue;
      }
      const files = gist.files || {};
      if (files[BACKUP_FILENAME]) {
        return gist.id;
      }
      if (gist.description === BACKUP_GIST_DESCRIPTION && !byDescription) {
        byDescription = gist.id;
      }
    }
    return byDescription;
  }
  
  function buildBackupGistCreatePayload(contentJson) {
    return {
      description: BACKUP_GIST_DESCRIPTION,
      public: false,
      files: { [BACKUP_FILENAME]: { content: contentJson } },
    };
  }
  
  function buildBackupGistUpdatePayload(contentJson) {
    return {
      files: { [BACKUP_FILENAME]: { content: contentJson } },
    };
  }
  
  function extractBackupContent(body) {
    if (!body?.files || typeof body.files !== "object") {
      return null;
    }
    const content = body.files[BACKUP_FILENAME]?.content;
    return typeof content === "string" ? content : null;
  }
  return {
    BACKUP_GIST_DESCRIPTION,
    BACKUP_FILENAME,
    BACKUP_PAYLOAD_VERSION,
    MAX_SNAPSHOTS,
    SNAPSHOT_INTERVAL_MS,
    emptyBackupPayload,
    parseBackupPayload,
    serializeBackupPayload,
    snapshotListEntries,
    shouldCreateSnapshot,
    appendSnapshot,
    findSnapshotByAt,
    findBackupGistId,
    buildBackupGistCreatePayload,
    buildBackupGistUpdatePayload,
    extractBackupContent,
  };
})();


/* Generated from scripts/lib/viewer-gist-sync.js — run npm run bundle-viewer */

const viewerGistSync = (function () {
  const GIST_SYNC_KEY = "arkham-gist-sync";
  const GIST_STATE_FILENAME = "arkham-collector-state.json";
  const LEGACY_GIST_STATE_FILENAMES = ["state.json"];
  const GITHUB_API = "https://api.github.com";
  const GIST_DESCRIPTION = "Arkham Collector sync";
  
  function parseGistSyncConfig(json) {
    if (json == null || json === "") {
      return null;
    }
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      const token = typeof parsed.token === "string" ? parsed.token.trim() : "";
      const gistId = typeof parsed.gistId === "string" ? parsed.gistId.trim() : "";
      const backupGistId =
        typeof parsed.backupGistId === "string" ? parsed.backupGistId.trim() : "";
      const stateFilename =
        typeof parsed.stateFilename === "string" ? parsed.stateFilename.trim() : "";
      if (!token) {
        return null;
      }
      return { token, gistId, backupGistId, stateFilename };
    } catch (_) {
      return null;
    }
  }
  
  function serializeGistSyncConfig(config) {
    return JSON.stringify({
      token: config.token,
      gistId: config.gistId || "",
      backupGistId: config.backupGistId || "",
      stateFilename: config.stateFilename || "",
    });
  }
  
  function isConnectedGistConfig(config) {
    return Boolean(config?.token && config?.gistId);
  }
  
  function resolveGistStateFilename(body, preferredFilename) {
    if (preferredFilename && body?.files?.[preferredFilename]) {
      return preferredFilename;
    }
    if (body?.files?.[GIST_STATE_FILENAME]) {
      return GIST_STATE_FILENAME;
    }
    for (const legacy of LEGACY_GIST_STATE_FILENAMES) {
      if (body?.files?.[legacy]) {
        return legacy;
      }
    }
    return GIST_STATE_FILENAME;
  }
  
  function extractStateJsonFromGistResponse(body, stateFilename) {
    if (!body || typeof body !== "object") {
      return null;
    }
    const filename = resolveGistStateFilename(body, stateFilename);
    const file = body.files?.[filename];
    if (!file || typeof file.content !== "string") {
      return null;
    }
    return file.content;
  }
  
  function findArkhamGistId(gists) {
    if (!Array.isArray(gists)) {
      return null;
    }
    const filenames = [GIST_STATE_FILENAME, ...LEGACY_GIST_STATE_FILENAMES];
    for (const filename of filenames) {
      const match = gists.find((gist) => gist?.files && gist.files[filename]);
      if (match?.id) {
        return match.id;
      }
    }
    return null;
  }
  
  function findArkhamGistEntry(gists) {
    if (!Array.isArray(gists)) {
      return null;
    }
    const filenames = [GIST_STATE_FILENAME, ...LEGACY_GIST_STATE_FILENAMES];
    for (const filename of filenames) {
      const match = gists.find((gist) => gist?.files && gist.files[filename]);
      if (match?.id) {
        return { gistId: match.id, stateFilename: filename };
      }
    }
    return null;
  }
  
  function buildGistCreatePayload(stateJson) {
    return {
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [GIST_STATE_FILENAME]: {
          content: stateJson,
        },
      },
    };
  }
  
  function buildGistUpdatePayload(stateJson, stateFilename = GIST_STATE_FILENAME) {
    return {
      files: {
        [stateFilename]: {
          content: stateJson,
        },
      },
    };
  }
  
  function resolveGistConnectState({
    gistId,
    remoteState,
    localPersisted,
    adoptRemoteGistState,
    buildNewGistConnectState,
  }) {
    if (gistId) {
      if (!remoteState) {
        return {
          ok: false,
          error:
            "Found an existing Arkham Gist but could not read state.json. Your Gist was not changed.",
        };
      }
      const nextState = adoptRemoteGistState(remoteState, localPersisted);
      if (!nextState) {
        return {
          ok: false,
          error:
            "Found an existing Arkham Gist but the sync file is invalid. Your Gist was not changed.",
        };
      }
      return { ok: true, action: "adopt", gistId, nextState };
    }
  
    return {
      ok: true,
      action: "create",
      gistId: "",
      nextState: buildNewGistConnectState(localPersisted),
    };
  }
  return {
    GIST_SYNC_KEY,
    GIST_STATE_FILENAME,
    LEGACY_GIST_STATE_FILENAMES,
    GIST_DESCRIPTION,
    GITHUB_API,
    parseGistSyncConfig,
    serializeGistSyncConfig,
    isConnectedGistConfig,
    resolveGistStateFilename,
    extractStateJsonFromGistResponse,
    findArkhamGistId,
    findArkhamGistEntry,
    buildGistCreatePayload,
    buildGistUpdatePayload,
    resolveGistConnectState,
  };
})();


/* Generated from scripts/lib/viewer-collection-import.js — run npm run bundle-viewer */

const viewerCollectionImport = (function () {
  const COLLECTION_CSV_HEADER = "title,author,year,status";
  
  function parseYear(value) {
    if (!value) {
      return null;
    }
    const match = String(value).match(/\d{4}/);
    return match ? match[0] : null;
  }
  
  function parseCsvLine(line) {
    const values = [];
    let current = "";
    let inQuotes = false;
  
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  
    values.push(current);
    return values;
  }
  
  function normalizeForMatch(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[''""]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }
  
  function titlesMatch(a, b) {
    const left = normalizeForMatch(a);
    const right = normalizeForMatch(b);
    if (!left || !right) {
      return false;
    }
    return left === right || left.includes(right) || right.includes(left);
  }
  
  /** Maps CSV status text to a book status; blank means collected for legacy 3-column files. */
  function normalizeImportStatus(raw) {
    const value = String(raw || "").trim().toLowerCase();
    if (value === "ordered" || value === "order") {
      return viewerBookStatus.ORDERED;
    }
    if (value === "want" || value === "wanted") {
      return viewerBookStatus.WANT;
    }
    return viewerBookStatus.COLLECTED;
  }
  
  function isCollectionCsvHeaderRow(row) {
    return String(row?.title || "").trim().toLowerCase() === "title";
  }
  
  function parseCollectionCsv(csvText) {
    return csvText
      .trim()
      .split(/\r?\n/)
      .map(parseCsvLine)
      .filter((cols) => cols.length >= 3)
      .map((cols) => ({
        title: cols[0].trim(),
        author: cols[1]?.trim() || "",
        year: parseYear(cols[2]),
        status: cols[3]?.trim() || "",
      }))
      .filter((item) => {
        if (!item.title || !item.year) {
          return false;
        }
        if (isCollectionCsvHeaderRow(item)) {
          return false;
        }
        if (item.title.toUpperCase() === "ARKHAM HOUSE") {
          return false;
        }
        if (/^\d+ on order/i.test(item.title)) {
          return false;
        }
        return true;
      });
  }
  
  function bookTitleCandidates(book) {
    return [book.title, book.listTitle].filter(Boolean);
  }
  
  function rowMatchesBook(row, book) {
    const titles = bookTitleCandidates(book);
    if (!titles.some((candidate) => titlesMatch(candidate, row.title))) {
      return false;
    }
    if (row.year) {
      const bookYear = parseYear(book.publicationDate);
      if (bookYear && bookYear !== row.year) {
        return false;
      }
    }
    return true;
  }
  
  function matchBookIdForRow(books, row) {
    const matches = books.filter((book) => rowMatchesBook(row, book));
    if (matches.length === 1) {
      return matches[0].id;
    }
    if (row.year && matches.length > 1) {
      const exact = matches.filter(
        (book) => parseYear(book.publicationDate) === row.year,
      );
      if (exact.length === 1) {
        return exact[0].id;
      }
    }
    return null;
  }
  
  function matchCollectionImportEntries(books, rows) {
    const entries = [];
    const unmatchedRows = [];
    const seen = new Set();
  
    for (const row of rows) {
      const id = matchBookIdForRow(books, row);
      if (id == null) {
        unmatchedRows.push(row);
      } else if (!seen.has(id)) {
        seen.add(id);
        entries.push({ id, status: normalizeImportStatus(row.status) });
      }
    }
  
    return { entries, unmatchedRows };
  }
  
  /** @deprecated Use matchCollectionImportEntries */
  function matchCollectionImportRows(books, rows) {
    const { entries, unmatchedRows } = matchCollectionImportEntries(books, rows);
    return {
      matchedIds: entries.map((entry) => entry.id),
      unmatchedRows,
    };
  }
  
  /**
   * Build export rows for every book with a collection status (collected, ordered,
   * or want). Caller supplies sort order; rows are title, author, year, status.
   */
  function buildCollectionExportRows(books, statusMap, compareFn) {
    const rows = [];
    for (const book of books) {
      const status = viewerBookStatus.getBookStatus(statusMap, book.id);
      if (status === viewerBookStatus.NONE) {
        continue;
      }
      rows.push({
        book,
        cols: [
          book.title || book.listTitle || "Untitled",
          book.author || "",
          parseYear(book.publicationDate) || "",
          status,
        ],
      });
    }
    if (typeof compareFn === "function") {
      rows.sort((a, b) => compareFn(a.book, b.book));
    }
    return rows.map((entry) => entry.cols);
  }
  return {
    COLLECTION_CSV_HEADER,
    parseCollectionCsv,
    normalizeImportStatus,
    matchCollectionImportEntries,
    matchCollectionImportRows,
    matchBookIdForRow,
    buildCollectionExportRows,
  };
})();


/* Generated from scripts/lib/viewer-covers.js — run npm run bundle-viewer */

const viewerCovers = (function () {
  function appendCoverCacheKey(url, cacheKey) {
    if (!cacheKey) {
      return url;
    }
    return `${url}?v=${encodeURIComponent(cacheKey)}`;
  }
  
  function getCoverPath(book, variant = "card") {
    if (!book) {
      return null;
    }
    if (variant === "lightbox") {
      return book.coverImageDetailFile || book.coverImageFile || null;
    }
    if (variant === "list") {
      return (
        book.coverImageListFile ||
        book.coverImageDetailFile ||
        book.coverImageFile ||
        null
      );
    }
    return book.coverImageFile || null;
  }
  return {
    appendCoverCacheKey,
    getCoverPath,
  };
})();


/* Generated from scripts/lib/cover-list-crop.js — run npm run bundle-viewer */

const viewerListCrop = (function () {
  
  const LIST_WIDTH = 1200;
  const LIST_HEIGHT = 80;
  const LIST_FOCAL_X = 0.5;
  const LIST_FOCAL_Y = 0.7;
  
  function isDefaultListCoverFocus(x, y) {
    return x === LIST_FOCAL_X && y === LIST_FOCAL_Y;
  }
  
  function resolveListCoverFocus(edit) {
    const x =
      typeof edit?.listCoverFocusX === "number" && Number.isFinite(edit.listCoverFocusX)
        ? edit.listCoverFocusX
        : LIST_FOCAL_X;
    const y =
      typeof edit?.listCoverFocusY === "number" && Number.isFinite(edit.listCoverFocusY)
        ? edit.listCoverFocusY
        : LIST_FOCAL_Y;
    return { x, y };
  }
  
  function getListCoverCacheKey(book) {
    const { x, y } = resolveListCoverFocus(book);
    return `${x.toFixed(4)}-${y.toFixed(4)}`;
  }
  
  function getListCoverImagePresentation(book) {
    if (book?.coverImageListFile) {
      return {
        className: "cover-list-strip",
        style: "",
      };
    }
    return {
      className: "cover-list-focal",
      style: "",
    };
  }
  
  function computeListCoverPreviewLayout(
    sourceWidth,
    sourceHeight,
    focalX,
    focalY,
    containerWidth,
    containerHeight,
    listWidth = LIST_WIDTH,
    listHeight = LIST_HEIGHT,
  ) {
    if (
      !sourceWidth ||
      !sourceHeight ||
      !containerWidth ||
      !containerHeight
    ) {
      return null;
    }
  
    const crop = computeListCoverCrop(
      sourceWidth,
      sourceHeight,
      listWidth,
      listHeight,
      focalX,
      focalY,
    );
    const scale = containerWidth / crop.width;
    const cropDisplayHeight = crop.height * scale;
  
    return {
      width: sourceWidth * scale,
      height: sourceHeight * scale,
      left: -crop.left * scale,
      top: -crop.top * scale + (containerHeight - cropDisplayHeight) / 2,
    };
  }
  
  function computeListCoverCrop(
    sourceWidth,
    sourceHeight,
    listWidth = LIST_WIDTH,
    listHeight = LIST_HEIGHT,
    focalX = LIST_FOCAL_X,
    focalY = LIST_FOCAL_Y,
  ) {
    const targetAspect = listWidth / listHeight;
    let cropWidth = sourceWidth;
    let cropHeight = Math.round(cropWidth / targetAspect);
    if (cropHeight > sourceHeight) {
      cropHeight = sourceHeight;
      cropWidth = Math.round(cropHeight * targetAspect);
    }
    const focalPxX = focalX * sourceWidth;
    const focalPxY = focalY * sourceHeight;
    let left = Math.round(focalPxX - cropWidth / 2);
    let top = Math.round(focalPxY - cropHeight / 2);
    left = Math.max(0, Math.min(sourceWidth - cropWidth, left));
    top = Math.max(0, Math.min(sourceHeight - cropHeight, top));
    return { left, top, width: cropWidth, height: cropHeight };
  }
  
  function applyListCoverFocusPatch(edit, field, value) {
    if (field !== "listCoverFocusX" && field !== "listCoverFocusY") {
      return false;
    }
    if (value === null || value === undefined) {
      delete edit[field];
    } else {
      edit[field] = value;
    }
    const { x, y } = resolveListCoverFocus(edit);
    if (isDefaultListCoverFocus(x, y)) {
      delete edit.listCoverFocusX;
      delete edit.listCoverFocusY;
    }
    return true;
  }
  return {
    LIST_WIDTH,
    LIST_HEIGHT,
    LIST_FOCAL_X,
    LIST_FOCAL_Y,
    isDefaultListCoverFocus,
    resolveListCoverFocus,
    getListCoverImagePresentation,
    getListCoverCacheKey,
    computeListCoverCrop,
    computeListCoverPreviewLayout,
  };
})();


/* Generated from scripts/lib/viewer-mode.js — run npm run bundle-viewer */

const viewerMode = (function () {
  const SERVE_ONLY_UI_KEYS = [
    "bookOrderButton",
    "hiddenStatFilter",
    "cardEditButton",
    "detailEditButton",
  ];
  
  function resolveServeEnabled({ readOnly, healthCheckOk = false }) {
    if (readOnly === true) {
      return false;
    }
    return healthCheckOk === true;
  }
  
  function shouldShowBookOrderButton(serveEnabled) {
    return serveEnabled === true;
  }
  
  function shouldShowHiddenStatFilter(serveEnabled, hiddenCount) {
    return serveEnabled === true && hiddenCount > 0;
  }
  
  function shouldRenderCardEditButton(serveEnabled) {
    return serveEnabled === true;
  }
  
  function shouldRenderDetailEditButton({ readOnly, protocol }) {
    return readOnly !== true && protocol !== "file:";
  }
  
  function serveOnlyUiVisibility(options = {}) {
    const {
      readOnly = false,
      serveEnabled = false,
      hiddenCount = 0,
      protocol = "https:",
    } = options;
    const effectiveServeEnabled = resolveServeEnabled({
      readOnly,
      healthCheckOk: serveEnabled,
    });
  
    return {
      bookOrderButton: shouldShowBookOrderButton(effectiveServeEnabled),
      hiddenStatFilter: shouldShowHiddenStatFilter(
        effectiveServeEnabled,
        hiddenCount,
      ),
      cardEditButton: shouldRenderCardEditButton(effectiveServeEnabled),
      detailEditButton: shouldRenderDetailEditButton({ readOnly, protocol }),
    };
  }
  
  function buildUiVisibility(options = {}) {
    return serveOnlyUiVisibility({
      readOnly: true,
      serveEnabled: false,
      ...options,
    });
  }
  
  function serveUiVisibility(options = {}) {
    return serveOnlyUiVisibility({
      readOnly: false,
      serveEnabled: true,
      ...options,
    });
  }
  return {
    resolveServeEnabled,
    shouldShowBookOrderButton,
    shouldShowHiddenStatFilter,
    shouldRenderCardEditButton,
    shouldRenderDetailEditButton,
    serveOnlyUiVisibility,
    buildUiVisibility,
    serveUiVisibility,
  };
})();


/* Generated from scripts/lib/tag-normalize.js — run npm run bundle-viewer */

const viewerTags = (function () {
  const MAX_TAG_LENGTH = 48;
  
  function tagKey(tag) {
    return String(tag || "")
      .trim()
      .toLowerCase();
  }
  
  function normalizeTag(value) {
    const text = String(value || "")
      .trim()
      .replace(/\s+/g, " ");
    if (!text || text.length > MAX_TAG_LENGTH) {
      return null;
    }
    return text.toUpperCase();
  }
  
  function formatTagLabel(tag) {
    return normalizeTag(tag) || String(tag || "").trim().toUpperCase();
  }
  
  function collectTagsFromBooks(books) {
    const seen = new Set();
    const tags = [];
    for (const book of books || []) {
      if (!Array.isArray(book?.tags)) {
        continue;
      }
      for (const tag of book.tags) {
        const label = formatTagLabel(tag);
        if (!label) {
          continue;
        }
        const key = tagKey(label);
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        tags.push(label);
      }
    }
    return tags.sort((a, b) => tagKey(a).localeCompare(tagKey(b)));
  }
  
  function collectAllKnownTags(tagsByBookId) {
    const books = Object.values(tagsByBookId || {}).map((bookTags) => ({
      tags: bookTags,
    }));
    return collectTagsFromBooks(books);
  }
  return {
    tagKey,
    normalizeTag,
    formatTagLabel,
    collectAllKnownTags,
    collectTagsFromBooks,
  };
})();


/* Generated from scripts/lib/viewer-search-fields.js — run npm run bundle-viewer */

const viewerSearchFields = (function () {
  function getPersonNames() {
    if (typeof viewerPersonNames !== "undefined") {
      return viewerPersonNames;
    }
    if (typeof global !== "undefined" && global.__viewerPersonNames) {
      return global.__viewerPersonNames;
    }
    throw new Error("viewerPersonNames is not available");
  }
  
  function getTagHelpers() {
    if (typeof viewerTags !== "undefined") {
      return viewerTags;
    }
    if (typeof global !== "undefined" && global.__viewerTagsForSearchFields) {
      return global.__viewerTagsForSearchFields;
    }
    throw new Error("viewerTags is not available");
  }
  
  function normalizeLabelKey(label) {
    return String(label || "")
      .trim()
      .toLowerCase();
  }
  
  function emptyFieldTerms() {
    return { tag: [], author: [], cover: [], decade: [] };
  }
  
  function emptySearchFilter() {
    return { fieldTerms: emptyFieldTerms(), textTerms: [] };
  }
  
  function searchFilterIsEmpty(filter) {
    if (!filter) {
      return true;
    }
    if ((filter.textTerms || []).length > 0) {
      return false;
    }
    const terms = filter.fieldTerms || emptyFieldTerms();
    return SEARCH_FIELD_TYPES.every((field) => !(terms[field.key] || []).length);
  }
  
  function filterBooksBySearch(books, searchFilter) {
    if (searchFilterIsEmpty(searchFilter)) {
      return books;
    }
    const match = prepareCompoundSearchMatcher(searchFilter);
    return (books || []).filter(match);
  }
  
  function formatFieldSearchQuery(prefix, label) {
    const text = String(label || "").trim();
    if (!text) {
      return "";
    }
    if (/\s/.test(text)) {
      return `${prefix}:"${text.replace(/"/g, "")}"`;
    }
    return `${prefix}:${text}`;
  }
  
  function buildFieldTokenRegex(prefix) {
    return new RegExp(`${prefix}:\\s*(?:"([^"]*)"|(\\S+))`, "gi");
  }
  
  function parseDecadeTrailingToken(input) {
    const text = String(input || "").trim();
    const digitMatch = text.match(/(?:^|\s)(\d{1,4}s?)$/i);
    if (!digitMatch) {
      return null;
    }
    return {
      partial: digitMatch[1],
      prefix: text.slice(0, digitMatch.index).trim(),
    };
  }
  
  function isDecadeFilterDraftPartial(partial) {
    const token = String(partial || "").trim();
    if (!token) {
      return false;
    }
    if (/^\d{4}$/.test(token)) {
      return false;
    }
    if (/^\d{4}s$/i.test(token)) {
      return false;
    }
    return /^\d{1,3}s?$/i.test(token);
  }
  
  function parseDecadeDraftInput(input) {
    const text = String(input || "").trim();
    if (!text) {
      return null;
    }
  
    const prefixEsc = "decade".replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const colonMatch = text.match(
      new RegExp(`(?:^|\\s)${prefixEsc}:\\s*(?:"([^"]*)"?|(\\S*))$`, "i"),
    );
    if (colonMatch) {
      const partial = String(colonMatch[1] ?? colonMatch[2] ?? "").trim();
      if (!isDecadeFilterDraftPartial(partial)) {
        return null;
      }
      return {
        fieldKey: "decade",
        partial,
        quoted: /"/.test(colonMatch[0]),
        prefix: text.slice(0, colonMatch.index).trim(),
      };
    }
  
    const token = parseDecadeTrailingToken(text);
    if (!token || !isDecadeFilterDraftPartial(token.partial)) {
      return null;
    }
  
    return {
      fieldKey: "decade",
      partial: token.partial,
      quoted: false,
      prefix: token.prefix,
    };
  }
  
  function getDecadeSuggestDraft(input) {
    const filterDraft = parseDecadeDraftInput(input);
    if (filterDraft) {
      return filterDraft;
    }
  
    const text = String(input || "").trim();
    const prefixEsc = "decade".replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const colonMatch = text.match(
      new RegExp(`(?:^|\\s)${prefixEsc}:\\s*(?:"([^"]*)"?|(\\S*))$`, "i"),
    );
    if (colonMatch) {
      return {
        fieldKey: "decade",
        partial: String(colonMatch[1] ?? colonMatch[2] ?? "").trim(),
        quoted: /"/.test(colonMatch[0]),
        prefix: text.slice(0, colonMatch.index).trim(),
      };
    }
  
    const token = parseDecadeTrailingToken(text);
    if (!token) {
      return null;
    }
  
    return {
      fieldKey: "decade",
      partial: token.partial,
      quoted: false,
      prefix: token.prefix,
    };
  }
  
  function parseFieldDraftInput(input, field) {
    if (field.key === "decade") {
      return parseDecadeDraftInput(input);
    }
  
    const text = String(input || "").trim();
    if (!text) {
      return null;
    }
  
    const prefix = field.prefix;
    const prefixEsc = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  
    const colonMatch = text.match(
      new RegExp(`(?:^|\\s)${prefixEsc}:\\s*(?:"([^"]*)"?|(\\S*))$`, "i"),
    );
    if (colonMatch) {
      return {
        fieldKey: field.key,
        partial: String(colonMatch[1] ?? colonMatch[2] ?? "").trim(),
        quoted: /"/.test(colonMatch[0]),
        prefix: text.slice(0, colonMatch.index).trim(),
      };
    }
  
    const shorthandMatch = text.match(
      new RegExp(
        `(?:^|\\s)${prefixEsc}(?:\\s+(?:"([^"]*)"?|(\\S*)))?$`,
        "i",
      ),
    );
    if (shorthandMatch) {
      return {
        fieldKey: field.key,
        partial: String(shorthandMatch[1] ?? shorthandMatch[2] ?? "").trim(),
        quoted: /"/.test(shorthandMatch[0]),
        prefix: text.slice(0, shorthandMatch.index).trim(),
      };
    }
  
    return null;
  }
  
  function getFieldByKey(key) {
    return SEARCH_FIELD_TYPES.find((field) => field.key === key) || null;
  }
  
  function getFieldByPrefix(prefix) {
    const lower = String(prefix || "").toLowerCase();
    return (
      SEARCH_FIELD_TYPES.find((field) => field.prefix.toLowerCase() === lower) ||
      null
    );
  }
  
  const TAG_FIELD = {
    key: "tag",
    prefix: "tag",
    suppressTextOnLiteralPrefix: true,
    chipAriaPrefix: "tag",
    labelKey(label) {
      return getTagHelpers().tagKey(label);
    },
    formatQuery(label) {
      return formatFieldSearchQuery("tag", label);
    },
    formatLabel(raw, knownValues) {
      const { tagKey, formatTagLabel } = getTagHelpers();
      const needle = tagKey(raw);
      if (!needle) {
        return null;
      }
      for (const label of knownValues || []) {
        if (tagKey(label) === needle) {
          return String(label).trim().toUpperCase();
        }
      }
      return formatTagLabel(raw);
    },
    matchBook(book, term) {
      if (!term) {
        return true;
      }
      const tags = Array.isArray(book.tags) ? book.tags : [];
      return tags.some((tag) => String(tag).toLowerCase().includes(term));
    },
    collectValues(books) {
      return getTagHelpers().collectTagsFromBooks(books);
    },
  };
  
  const AUTHOR_FIELD = {
    key: "author",
    prefix: "author",
    suppressTextOnLiteralPrefix: false,
    chipAriaPrefix: "author",
    labelKey(label) {
      return getPersonNames().normalizePersonKey(label);
    },
    formatQuery(label) {
      return formatFieldSearchQuery("author", label);
    },
    formatLabel(raw, knownValues) {
      const needle = this.labelKey(raw);
      if (!needle) {
        return null;
      }
      for (const label of knownValues || []) {
        if (this.labelKey(label) === needle) {
          return String(label).trim();
        }
      }
      return String(raw || "").trim() || null;
    },
    matchBook(book, term) {
      if (!term) {
        return true;
      }
      const needle = String(term || "").trim().toLowerCase();
      return getPersonNames()
        .resolveBookAuthors(book)
        .some((name) => this.labelKey(name).includes(needle));
    },
    collectValues(books) {
      const seen = new Set();
      const values = [];
      for (const book of books || []) {
        for (const label of getPersonNames().resolveBookAuthors(book)) {
          const key = this.labelKey(label);
          if (!key || seen.has(key)) {
            continue;
          }
          seen.add(key);
          values.push(label);
        }
      }
      return values.sort((a, b) => this.labelKey(a).localeCompare(this.labelKey(b)));
    },
  };
  
  const COVER_FIELD = {
    key: "cover",
    prefix: "cover",
    suppressTextOnLiteralPrefix: false,
    chipAriaPrefix: "cover artist",
    labelKey(label) {
      return getPersonNames().normalizePersonKey(label);
    },
    formatQuery(label) {
      return formatFieldSearchQuery("cover", label);
    },
    formatLabel(raw, knownValues) {
      const needle = this.labelKey(raw);
      if (!needle) {
        return null;
      }
      for (const label of knownValues || []) {
        if (this.labelKey(label) === needle) {
          return String(label).trim();
        }
      }
      return String(raw || "").trim() || null;
    },
    matchBook(book, term) {
      if (!term) {
        return true;
      }
      const needle = String(term || "").trim().toLowerCase();
      return getPersonNames()
        .resolveBookCoverArtists(book)
        .some((name) => this.labelKey(name).includes(needle));
    },
    collectValues(books) {
      const seen = new Set();
      const values = [];
      for (const book of books || []) {
        for (const label of getPersonNames().resolveBookCoverArtists(book)) {
          const key = this.labelKey(label);
          if (!key || seen.has(key)) {
            continue;
          }
          seen.add(key);
          values.push(label);
        }
      }
      return values.sort((a, b) => this.labelKey(a).localeCompare(this.labelKey(b)));
    },
  };
  
  function decadeSortKey(label) {
    const match = String(label || "").trim().match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : 0;
  }
  
  const DECADE_FIELD = {
    key: "decade",
    prefix: "decade",
    suppressTextOnLiteralPrefix: false,
    chipAriaPrefix: "decade",
    labelKey(label) {
      return String(label || "")
        .trim()
        .toLowerCase();
    },
    formatQuery(label) {
      return formatFieldSearchQuery("decade", label);
    },
    formatLabel(raw, knownValues) {
      const needle = this.labelKey(raw);
      if (!needle) {
        return null;
      }
      for (const label of knownValues || []) {
        if (this.labelKey(label) === needle) {
          return String(label).trim();
        }
      }
      return null;
    },
    matchesSuggestion(partial, label) {
      const needle = this.labelKey(partial);
      if (!needle) {
        return true;
      }
      return this.labelKey(label).startsWith(needle);
    },
    matchBook(book, term) {
      if (!term) {
        return true;
      }
      return this.labelKey(book.decade) === term;
    },
    collectValues(books) {
      const seen = new Set();
      const values = [];
      for (const book of books || []) {
        const label = String(book.decade || "").trim();
        if (!label) {
          continue;
        }
        const key = this.labelKey(label);
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        values.push(label);
      }
      return values.sort((a, b) => decadeSortKey(a) - decadeSortKey(b));
    },
  };
  
  function decadeStartYear(label) {
    const match = String(label || "")
      .trim()
      .match(/^(\d{4})s$/i);
    return match ? parseInt(match[1], 10) : null;
  }
  
  function yearInDecade(year, decadeLabel) {
    const start = decadeStartYear(decadeLabel);
    if (start == null || !Number.isFinite(year)) {
      return false;
    }
    return year >= start && year <= start + 9;
  }
  
  function bookPublicationYear(book) {
    if (!book) {
      return null;
    }
    const match = String(book.publicationDate || "").match(/\d{4}/);
    return match ? parseInt(match[0], 10) : null;
  }
  
  function bookMatchesDecadeTerm(book, term) {
    const normalizedTerm = normalizeLabelKey(term);
    if (!normalizedTerm) {
      return true;
    }
    if (DECADE_FIELD.labelKey(book.decade) === normalizedTerm) {
      return true;
    }
    const year = bookPublicationYear(book);
    return year != null && yearInDecade(year, term);
  }
  
  function splitYearDecadeTextTerms(textTerms) {
    const decadeTermsFromText = [];
    const yearTerms = [];
    const otherTextTerms = [];
    for (const term of textTerms || []) {
      if (/^\d{4}s$/i.test(term)) {
        decadeTermsFromText.push(normalizeLabelKey(term));
      } else if (/^\d{4}$/.test(term)) {
        yearTerms.push(parseInt(term, 10));
      } else {
        otherTextTerms.push(term);
      }
    }
    return { decadeTermsFromText, yearTerms, otherTextTerms };
  }
  
  function dedupeLowerTerms(terms) {
    const seen = new Set();
    const out = [];
    for (const term of terms) {
      const key = normalizeLabelKey(term);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(key);
    }
    return out;
  }
  
  function buildYearDecadeCriteria(decadeFieldTerms, textTerms) {
    const { decadeTermsFromText, yearTerms, otherTextTerms } =
      splitYearDecadeTextTerms(textTerms);
    const decades = dedupeLowerTerms([
      ...(decadeFieldTerms || []),
      ...decadeTermsFromText,
    ]);
    const years = yearTerms.filter(
      (year) => !decades.some((decade) => yearInDecade(year, decade)),
    );
    return { decades, years, otherTextTerms };
  }
  
  function bookMatchesYearDecadeCriteria(book, criteria) {
    const { decades, years } = criteria;
    if (decades.length === 0 && years.length === 0) {
      return true;
    }
    if (decades.some((term) => bookMatchesDecadeTerm(book, term))) {
      return true;
    }
    const bookYear = bookPublicationYear(book);
    if (bookYear != null && years.some((year) => bookYear === year)) {
      return true;
    }
    return false;
  }
  
  const SEARCH_FIELD_TYPES = [TAG_FIELD, AUTHOR_FIELD, COVER_FIELD, DECADE_FIELD];
  
  function getActiveDraftField(draftQuery) {
    const text = String(draftQuery || "").trim();
    if (!text) {
      return null;
    }
  
    let active = null;
    for (const field of SEARCH_FIELD_TYPES) {
      const draft = parseFieldDraftInput(text, field);
      if (draft) {
        active = field;
      }
    }
    return active;
  }
  
  function isFieldLiteralPrefixPending(draftQuery, field) {
    if (!field.suppressTextOnLiteralPrefix) {
      return false;
    }
    const text = String(draftQuery || "").trim();
    if (!text) {
      return false;
    }
    const lower = text.toLowerCase();
    const literal = field.prefix.toLowerCase();
    if (lower.length <= literal.length && literal.startsWith(lower)) {
      return true;
    }
    return false;
  }
  
  function isSearchDraftBlockingText(draftQuery) {
    for (const field of SEARCH_FIELD_TYPES) {
      if (isFieldLiteralPrefixPending(draftQuery, field)) {
        return true;
      }
    }
    return false;
  }
  
  function parseCompoundSearchQuery(query) {
    let remainder = String(query || "");
    const fieldTerms = emptyFieldTerms();
  
    for (const field of SEARCH_FIELD_TYPES) {
      const tokenRe = buildFieldTokenRegex(field.prefix);
      remainder = remainder.replace(tokenRe, (_, quoted, unquoted) => {
        const term = String(quoted ?? unquoted ?? "")
          .trim()
          .toLowerCase();
        if (term) {
          fieldTerms[field.key].push(term);
        }
        return " ";
      });
    }
  
    const textTerms = remainder
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => term.toLowerCase());
  
    return { fieldTerms, textTerms };
  }
  
  function mergeFieldTermsFromChips(chips, parsedFieldTerms) {
    const fieldTerms = emptyFieldTerms();
    const seen = {
      tag: new Set(),
      author: new Set(),
      cover: new Set(),
      decade: new Set(),
    };
  
    for (const chip of chips || []) {
      const field = getFieldByKey(chip?.type);
      if (!field) {
        continue;
      }
      const label = field.formatLabel(chip.label, [chip.label]);
      const term = field.labelKey(label);
      if (!term || seen[field.key].has(term)) {
        continue;
      }
      seen[field.key].add(term);
      fieldTerms[field.key].push(term);
    }
  
    for (const field of SEARCH_FIELD_TYPES) {
      for (const term of parsedFieldTerms[field.key] || []) {
        if (!seen[field.key].has(term)) {
          seen[field.key].add(term);
          fieldTerms[field.key].push(term);
        }
      }
    }
  
    return fieldTerms;
  }
  
  function buildSearchFilter(chips, draftQuery) {
    const trimmed = String(draftQuery || "").trim();
    const activeDraftField = getActiveDraftField(trimmed);
    let parsed;
  
    if (activeDraftField) {
      const draft = parseFieldDraftInput(trimmed, activeDraftField);
      parsed = draft?.prefix
        ? parseCompoundSearchQuery(draft.prefix)
        : emptySearchFilter();
    } else if (isSearchDraftBlockingText(trimmed)) {
      parsed = emptySearchFilter();
    } else {
      parsed = parseCompoundSearchQuery(trimmed);
    }
  
    return {
      fieldTerms: mergeFieldTermsFromChips(chips, parsed.fieldTerms),
      textTerms: parsed.textTerms,
    };
  }
  
  function resolveKnownFieldLabel(term, field, knownValues) {
    const needle = field.labelKey(term);
    if (!needle) {
      return null;
    }
    for (const label of knownValues || []) {
      if (field.labelKey(label) === needle) {
        return field.key === "tag"
          ? String(label).trim().toUpperCase()
          : String(label).trim();
      }
    }
    if (field.key === "decade" || field.key === "author" || field.key === "cover") {
      const matches = (knownValues || []).filter((label) => {
        if (field.matchesSuggestion) {
          return field.matchesSuggestion.call(field, needle, label);
        }
        return field.labelKey(label).includes(needle);
      });
      if (matches.length === 1) {
        return String(matches[0]).trim();
      }
    }
    return null;
  }
  
  function absorbFieldDraftInput(input, field, knownValues) {
    if (field.key === "decade") {
      return null;
    }
  
    const draft = parseFieldDraftInput(input, field);
    if (!draft) {
      return null;
    }
    const prefix = draft.prefix || "";
    if (!draft.partial) {
      return { fieldKey: field.key, chipLabel: null, remainder: prefix };
    }
    const chipLabel = resolveKnownFieldLabel(draft.partial, field, knownValues);
    if (chipLabel) {
      return { fieldKey: field.key, chipLabel, remainder: prefix };
    }
    return {
      fieldKey: field.key,
      chipLabel: null,
      remainder: prefix
        ? `${prefix} ${field.formatQuery(draft.partial)}`
        : field.formatQuery(draft.partial),
    };
  }
  
  function resolveFieldFilterLabel(term, field, knownValues) {
    return resolveKnownFieldLabel(term, field, knownValues);
  }
  
  function filterFieldSuggestions(partial, field, knownValues, options = {}) {
    const { exclude = [], limit } = options;
    const needle = String(partial || "").trim().toLowerCase();
    const excluded = new Set((exclude || []).map((label) => field.labelKey(label)));
  
    const matches = (knownValues || [])
      .filter((label) => !excluded.has(field.labelKey(label)))
      .filter((label) => {
        if (!needle) {
          return true;
        }
        if (field.matchesSuggestion) {
          return field.matchesSuggestion.call(field, needle, label);
        }
        return field.labelKey(label).includes(needle);
      });
  
    return typeof limit === "number" ? matches.slice(0, limit) : matches;
  }
  
  function normalizeSearchFilter(filter) {
    if (!filter) {
      return emptySearchFilter();
    }
    if (filter.fieldTerms) {
      return {
        fieldTerms: {
          tag: [...(filter.fieldTerms.tag || [])],
          author: [...(filter.fieldTerms.author || [])],
          cover: [...(filter.fieldTerms.cover || [])],
          decade: [...(filter.fieldTerms.decade || [])],
        },
        textTerms: [...(filter.textTerms || [])],
      };
    }
    return {
      fieldTerms: {
        tag: [...(filter.tagTerms || [])],
        author: [...(filter.authorTerms || [])],
        cover: [...(filter.coverTerms || [])],
        decade: [...(filter.decadeTerms || [])],
      },
      textTerms: [...(filter.textTerms || [])],
    };
  }
  
  function prepareCompoundSearchMatcher(filter) {
    const { fieldTerms, textTerms } = normalizeSearchFilter(filter);
    const yearDecadeCriteria = buildYearDecadeCriteria(
      fieldTerms.decade,
      textTerms,
    );
    const otherFieldTerms = SEARCH_FIELD_TYPES.filter(
      (field) => field.key !== "decade",
    ).map((field) => ({
      field,
      terms: fieldTerms[field.key] || [],
    }));
  
    return (book) => {
      for (const { field, terms } of otherFieldTerms) {
        for (const term of terms) {
          if (!field.matchBook(book, term)) {
            return false;
          }
        }
      }
  
      if (
        yearDecadeCriteria.decades.length > 0 ||
        yearDecadeCriteria.years.length > 0
      ) {
        if (!bookMatchesYearDecadeCriteria(book, yearDecadeCriteria)) {
          return false;
        }
      }
  
      const haystack = book._searchHaystack || "";
      for (const term of yearDecadeCriteria.otherTextTerms) {
        if (!haystack.includes(term)) {
          return false;
        }
      }
      return true;
    };
  }
  
  function matchesCompoundSearch(book, filter) {
    return prepareCompoundSearchMatcher(filter)(book);
  }
  
  function filterBooksMatchingFieldTerms(books, fieldTermsPartial) {
    const matchBook = prepareCompoundSearchMatcher({
      fieldTerms: fieldTermsPartial,
      textTerms: [],
    });
    return (books || []).filter(matchBook);
  }
  
  function chipsToFieldTermsPartial(chips, excludeFieldKey) {
    const partial = emptyFieldTerms();
    for (const chip of chips || []) {
      if (chip.type === excludeFieldKey) {
        continue;
      }
      const field = getFieldByKey(chip.type);
      if (!field) {
        continue;
      }
      const label = field.formatLabel(chip.label, [chip.label]);
      const term = field.labelKey(label);
      if (term) {
        partial[chip.type].push(term);
      }
    }
    return partial;
  }
  
  function serializeCompoundSearchQuery({ fieldTerms = emptyFieldTerms(), textTerms = [] }) {
    const parts = [];
    for (const field of SEARCH_FIELD_TYPES) {
      for (const term of fieldTerms[field.key] || []) {
        parts.push(field.formatQuery(term));
      }
    }
    parts.push(...textTerms);
    return parts.filter(Boolean).join(" ").trim();
  }
  
  function parseSearchQuery(query) {
    const text = String(query || "").trim();
    if (!text) {
      return { mode: "text", term: "" };
    }
  
    for (const field of SEARCH_FIELD_TYPES) {
      const tokenRe = new RegExp(
        `^${field.prefix}:\\s*(?:"([^"]*)"|(.+))$`,
        "i",
      );
      const match = text.match(tokenRe);
      if (match) {
        return {
          mode: field.key,
          term: String(match[1] ?? match[2] ?? "")
            .trim()
            .toLowerCase(),
        };
      }
    }
  
    return { mode: "text", term: text.toLowerCase() };
  }
  return {
    SEARCH_FIELD_TYPES,
    normalizeLabelKey,
    emptyFieldTerms,
    emptySearchFilter,
    searchFilterIsEmpty,
    filterBooksBySearch,
    getFieldByKey,
    getFieldByPrefix,
    parseDecadeDraftInput,
    getDecadeSuggestDraft,
    parseFieldDraftInput,
    getActiveDraftField,
    isFieldLiteralPrefixPending,
    isSearchDraftBlockingText,
    parseCompoundSearchQuery,
    buildSearchFilter,
    absorbFieldDraftInput,
    resolveKnownFieldLabel,
    resolveFieldFilterLabel,
    filterFieldSuggestions,
    normalizeSearchFilter,
    decadeStartYear,
    yearInDecade,
    bookPublicationYear,
    bookMatchesDecadeTerm,
    splitYearDecadeTextTerms,
    buildYearDecadeCriteria,
    bookMatchesYearDecadeCriteria,
    prepareCompoundSearchMatcher,
    matchesCompoundSearch,
    filterBooksMatchingFieldTerms,
    chipsToFieldTermsPartial,
    serializeCompoundSearchQuery,
    parseSearchQuery,
    formatFieldSearchQuery,
  };
})();


/* Generated from scripts/lib/viewer-filters.js — run npm run bundle-viewer */

const viewerFilters = (function () {
  function getSearchFields() {
    if (typeof viewerSearchFields !== "undefined") {
      return viewerSearchFields;
    }
    throw new Error("viewerSearchFields is not available");
  }
  
  function getTagHelpers() {
    if (typeof viewerTags !== "undefined") {
      return viewerTags;
    }
    throw new Error("viewerTags is not available");
  }
  
  const SAMPLER_ISSUE_TITLE_RE = /^The Arkham Sampler \(Vol\. [IV]+, No\. \d+\)$/;
  const COLLECTOR_ISSUE_TITLE_RE = /^The Arkham Collector \(No\. \d+\)$/;
  
  function getPersonNames() {
    if (typeof viewerPersonNames !== "undefined") {
      return viewerPersonNames;
    }
    if (typeof global !== "undefined" && global.__viewerPersonNames) {
      return global.__viewerPersonNames;
    }
    throw new Error("viewerPersonNames is not available");
  }
  
  function tagField() {
    return getSearchFields().getFieldByKey("tag");
  }
  
  function normalizeDecadeLabel(value) {
    const text = String(value || "").trim();
    if (!text) {
      return null;
    }
    const match = text.match(/^(\d{4})s?$/i);
    if (match) {
      const year = parseInt(match[1], 10);
      if (!year) {
        return null;
      }
      return `${Math.floor(year / 10) * 10}s`;
    }
    return text;
  }
  
  function prepareBookSearchIndex(book) {
    const personNames = getPersonNames();
    if (book.decade) {
      const normalizedDecade = normalizeDecadeLabel(book.decade);
      if (normalizedDecade) {
        book.decade = normalizedDecade;
      }
    }
    book._searchHaystack = [
      book.title,
      book.author,
      book.coverArtist,
      book.publicationDate,
      book.decade,
      book.listAuthor,
      ...personNames.resolveBookAuthors(book),
      ...personNames.resolveBookCoverArtists(book),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }
  
  function formatTagSearchQuery(tag) {
    return tagField().formatQuery(tag);
  }
  
  function parseTagDraftInput(input) {
    const draft = getSearchFields().parseFieldDraftInput(input, tagField());
    if (!draft) {
      return null;
    }
    return {
      partial: draft.partial,
      quoted: draft.quoted,
      prefix: draft.prefix,
    };
  }
  
  function isTagDraftPending(draftQuery) {
    const text = String(draftQuery || "").trim();
    if (!text) {
      return false;
    }
    if (getSearchFields().isFieldLiteralPrefixPending(text, tagField())) {
      return true;
    }
    return parseTagDraftInput(text) !== null;
  }
  
  function absorbTagDraftInput(input, knownTags) {
    const absorbed = getSearchFields().absorbFieldDraftInput(
      input,
      tagField(),
      knownTags,
    );
    if (!absorbed) {
      return null;
    }
    return {
      chipLabel: absorbed.chipLabel,
      remainder: absorbed.remainder,
    };
  }
  
  function resolveTagFilterLabel(term, knownTags) {
    return getSearchFields().resolveKnownFieldLabel(term, tagField(), knownTags);
  }
  
  function filterTagSuggestions(partial, knownTags, options = {}) {
    return getSearchFields().filterFieldSuggestions(
      partial,
      tagField(),
      knownTags,
      options,
    );
  }
  
  function matchesTagSearch(book, term) {
    return tagField().matchBook(book, term);
  }
  
  function filterBooksMatchingTagTerms(books, tagTerms) {
    return getSearchFields().filterBooksMatchingFieldTerms(books, {
      tag: tagTerms,
      author: [],
      cover: [],
    });
  }
  
  function matchesSearch(book, query) {
    const searchFields = getSearchFields();
    return searchFields.matchesCompoundSearch(
      book,
      searchFields.parseCompoundSearchQuery(query),
    );
  }
  
  function isMagazineIssue(book) {
    const listTitle = String(book?.listTitle || "").trim();
    const title = String(book?.title || "").trim();
  
    if (listTitle === "The Arkham Sampler") {
      return SAMPLER_ISSUE_TITLE_RE.test(title);
    }
    if (listTitle === "The Arkham Collector") {
      return COLLECTOR_ISSUE_TITLE_RE.test(title);
    }
    return false;
  }
  
  function passesHiddenVisibility(book, { hiddenOnly }) {
    return hiddenOnly ? book.hidden : !book.hidden;
  }
  
  function passesBookVisibility(book, { hiddenOnly, showMagazines }) {
    if (!passesHiddenVisibility(book, { hiddenOnly })) {
      return false;
    }
    if (isMagazineIssue(book) && !showMagazines) {
      return false;
    }
    return true;
  }
  
  function passesMycroftImprintFilter(book, mycroftFilterMode) {
    if (mycroftFilterMode === "only") {
      return book.imprint === "mycroft_moran";
    }
    if (mycroftFilterMode === "hidden") {
      return book.imprint !== "mycroft_moran";
    }
    return true;
  }
  
  function isCollected(book, collectedIds) {
    return collectedIds.has(book.id);
  }
  
  function isOrdered(book, collectedIds, orderedIds) {
    return orderedIds.has(book.id) && !isCollected(book, collectedIds);
  }
  
  function isInCollection(book, collectedIds, orderedIds) {
    return isCollected(book, collectedIds) || isOrdered(book, collectedIds, orderedIds);
  }
  
  function passesCollectionFilter(
    book,
    collectionFilterMode,
    collectedIds,
    orderedIds,
  ) {
    if (collectionFilterMode === "collection") {
      return isInCollection(book, collectedIds, orderedIds);
    }
    if (collectionFilterMode === "ordered") {
      return isOrdered(book, collectedIds, orderedIds);
    }
    return true;
  }
  
  function passesWantFilter(book, wantFilterMode, wantIds) {
    if (wantFilterMode == null) {
      return true;
    }
    return wantIds.has(book.id);
  }
  
  function hasAnyWants(books, wantIds, visibilityOptions) {
    return books.some(
      (book) =>
        passesBookVisibility(book, visibilityOptions) && wantIds.has(book.id),
    );
  }
  
  function filterBooksByCatalogFilters(books, options) {
    const {
      hiddenOnly,
      showMagazines,
      mycroftFilterMode,
      collectionFilterMode,
      wantFilterMode,
      collectedIds,
      orderedIds,
      wantIds,
    } = options;
  
    return books.filter(
      (book) =>
        passesBookVisibility(book, { hiddenOnly, showMagazines }) &&
        passesMycroftImprintFilter(book, mycroftFilterMode) &&
        passesCollectionFilter(
          book,
          collectionFilterMode,
          collectedIds,
          orderedIds,
        ) &&
        passesWantFilter(book, wantFilterMode, wantIds),
    );
  }
  
  function filterBooksBySearch(books, searchFilter) {
    return getSearchFields().filterBooksBySearch(books, searchFilter);
  }
  
  function filterVisibleBooks(books, options) {
    const {
      hiddenOnly,
      showMagazines,
      mycroftFilterMode,
      collectionFilterMode,
      wantFilterMode,
      collectedIds,
      orderedIds,
      wantIds,
      searchQuery = "",
      searchFilter,
    } = options;
  
    const resolvedSearchFilter =
      searchFilter ||
      (searchQuery
        ? getSearchFields().parseCompoundSearchQuery(searchQuery)
        : getSearchFields().emptySearchFilter());
  
    return filterBooksBySearch(
      filterBooksByCatalogFilters(books, {
        hiddenOnly,
        showMagazines,
        mycroftFilterMode,
        collectionFilterMode,
        wantFilterMode,
        collectedIds,
        orderedIds,
        wantIds,
      }),
      resolvedSearchFilter,
    );
  }
  
  function cycleMycroftFilter(mycroftFilterMode) {
    if (mycroftFilterMode === null) {
      return "only";
    }
    if (mycroftFilterMode === "only") {
      return "hidden";
    }
    return null;
  }
  
  function cycleCollectionFilter(collectionFilterMode, hasAnyOrderedBooks) {
    if (hasAnyOrderedBooks) {
      if (collectionFilterMode === null) {
        return "collection";
      }
      if (collectionFilterMode === "collection") {
        return "ordered";
      }
      return null;
    }
    return collectionFilterMode === "collection" ? null : "collection";
  }
  
  function hasAnyOrderedBooks(books, collectedIds, orderedIds, visibilityOptions) {
    return books.some(
      (book) =>
        passesBookVisibility(book, visibilityOptions) &&
        isOrdered(book, collectedIds, orderedIds),
    );
  }
  
  function pickRandomBook(books) {
    if (!Array.isArray(books) || books.length === 0) {
      return null;
    }
    return books[Math.floor(Math.random() * books.length)];
  }
  
  function parseSearchQuery(...args) {
    return getSearchFields().parseSearchQuery(...args);
  }
  
  function parseCompoundSearchQuery(...args) {
    return getSearchFields().parseCompoundSearchQuery(...args);
  }
  
  function serializeCompoundSearchQuery(...args) {
    return getSearchFields().serializeCompoundSearchQuery(...args);
  }
  
  function buildSearchFilter(...args) {
    return getSearchFields().buildSearchFilter(...args);
  }
  
  function isSearchDraftBlockingText(...args) {
    return getSearchFields().isSearchDraftBlockingText(...args);
  }
  
  function parseFieldDraftInput(...args) {
    return getSearchFields().parseFieldDraftInput(...args);
  }
  
  function getActiveDraftField(...args) {
    return getSearchFields().getActiveDraftField(...args);
  }
  
  function absorbFieldDraftInput(...args) {
    return getSearchFields().absorbFieldDraftInput(...args);
  }
  
  function resolveFieldFilterLabel(...args) {
    return getSearchFields().resolveFieldFilterLabel(...args);
  }
  
  function resolveKnownFieldLabel(...args) {
    return getSearchFields().resolveKnownFieldLabel(...args);
  }
  
  function filterFieldSuggestions(...args) {
    return getSearchFields().filterFieldSuggestions(...args);
  }
  
  function formatFieldSearchQuery(...args) {
    return getSearchFields().formatFieldSearchQuery(...args);
  }
  
  function matchesCompoundSearch(...args) {
    return getSearchFields().matchesCompoundSearch(...args);
  }
  
  function prepareCompoundSearchMatcher(...args) {
    return getSearchFields().prepareCompoundSearchMatcher(...args);
  }
  
  function filterBooksMatchingFieldTerms(...args) {
    return getSearchFields().filterBooksMatchingFieldTerms(...args);
  }
  
  function chipsToFieldTermsPartial(...args) {
    return getSearchFields().chipsToFieldTermsPartial(...args);
  }
  
  function emptySearchFilter(...args) {
    return getSearchFields().emptySearchFilter(...args);
  }
  
  function searchFilterIsEmpty(...args) {
    return getSearchFields().searchFilterIsEmpty(...args);
  }
  
  function filterBooksBySearch(...args) {
    return getSearchFields().filterBooksBySearch(...args);
  }
  
  function tagKey(...args) {
    return getTagHelpers().tagKey(...args);
  }
  return {
    prepareBookSearchIndex,
    parseSearchQuery,
    parseCompoundSearchQuery,
    serializeCompoundSearchQuery,
    buildSearchFilter,
    isTagDraftPending,
    isSearchDraftBlockingText,
    parseTagDraftInput,
    parseFieldDraftInput,
    getActiveDraftField,
    absorbTagDraftInput,
    absorbFieldDraftInput,
    resolveTagFilterLabel,
    resolveFieldFilterLabel,
    resolveKnownFieldLabel,
    filterTagSuggestions,
    filterFieldSuggestions,
    formatTagSearchQuery,
    formatFieldSearchQuery,
    matchesTagSearch,
    prepareCompoundSearchMatcher,
    matchesCompoundSearch,
    filterBooksMatchingTagTerms,
    filterBooksMatchingFieldTerms,
    chipsToFieldTermsPartial,
    emptySearchFilter,
    searchFilterIsEmpty,
    filterBooksBySearch,
    matchesSearch,
    isMagazineIssue,
    passesHiddenVisibility,
    passesBookVisibility,
    passesMycroftImprintFilter,
    isCollected,
    isOrdered,
    isInCollection,
    passesCollectionFilter,
    passesWantFilter,
    filterBooksByCatalogFilters,
    filterVisibleBooks,
    cycleMycroftFilter,
    cycleCollectionFilter,
    hasAnyOrderedBooks,
    hasAnyWants,
    pickRandomBook,
  };
})();


/* Generated from scripts/lib/viewer-filter-url.js — run npm run bundle-viewer */

const viewerFilterUrl = (function () {
  const DEFAULT_FILTERS = {
    collectionFilterMode: null,
    wantFilterMode: null,
    mycroftFilterMode: null,
    hiddenOnly: false,
  };
  
  const FILTER_BY_SEGMENT = {
    collection: {
      collectionFilterMode: "collection",
    },
    ordered: {
      collectionFilterMode: "ordered",
    },
    want: {
      wantFilterMode: "want",
    },
    "mycroft-moran": {
      mycroftFilterMode: "only",
    },
    "mycroft-hidden": {
      mycroftFilterMode: "hidden",
    },
  };
  
  const FILTER_PATH_SEGMENTS = Object.keys(FILTER_BY_SEGMENT);
  
  function normalizePathname(pathname) {
    if (!pathname || pathname === "/") {
      return "";
    }
    let path = String(pathname);
    path = path.replace(/\/index\.html$/i, "");
    path = path.replace(/\/viewer\.html$/i, "");
    path = path.replace(/\/+$/, "");
    return path === "/" ? "" : path;
  }
  
  function parseFilterPath(pathname) {
    const normalized = normalizePathname(pathname);
    if (!normalized) {
      return { ...DEFAULT_FILTERS };
    }
    const segment = normalized.replace(/^\//, "").split("/")[0];
    const match = FILTER_BY_SEGMENT[segment];
    if (!match) {
      return { ...DEFAULT_FILTERS };
    }
    return { ...DEFAULT_FILTERS, ...match };
  }
  
  function buildFilterPath(filters) {
    if (filters?.wantFilterMode === "want") {
      return "/want";
    }
    if (filters?.collectionFilterMode === "ordered") {
      return "/ordered";
    }
    if (filters?.collectionFilterMode === "collection") {
      return "/collection";
    }
    if (filters?.mycroftFilterMode === "only") {
      return "/mycroft-moran";
    }
    if (filters?.mycroftFilterMode === "hidden") {
      return "/mycroft-hidden";
    }
    return "/";
  }
  
  function buildFilterUrl(filters, search = "", hash = "") {
    const path = buildFilterPath(filters);
    return `${path}${search || ""}${hash || ""}`;
  }
  
  function currentFilterSnapshot(filters) {
    return {
      collectionFilterMode: filters?.collectionFilterMode ?? null,
      wantFilterMode: filters?.wantFilterMode ?? null,
      mycroftFilterMode: filters?.mycroftFilterMode ?? null,
      hiddenOnly: Boolean(filters?.hiddenOnly),
    };
  }
  return {
    DEFAULT_FILTERS,
    FILTER_PATH_SEGMENTS,
    normalizePathname,
    parseFilterPath,
    buildFilterPath,
    buildFilterUrl,
    currentFilterSnapshot,
  };
})();


/* Book list helpers and CSV / title parsing */

books.forEach((book) => {
  if (book.hidden === undefined) {
    book.hidden = false;
  }
  prepareBookSearchIndex(book);
});

function prepareBookSearchIndex(book) {
  viewerFilters.prepareBookSearchIndex(book);
}

function getBookDescription(book) {
  if (book.description) {
    return book.description;
  }
  const map = window.BOOK_DESCRIPTIONS || {};
  return map[book.id] ?? map[String(book.id)] ?? null;
}

function isDeleted(book) {
  return book.deleted === true;
}

function getActiveBooks() {
  return books.filter((book) => !isDeleted(book));
}

function parseYear(value) {
  if (!value) return null;
  const match = String(value).match(/\d{4}/);
  return match ? match[0] : null;
}

function decadeFromYear(year) {
  const value = parseInt(year, 10);
  if (!value) {
    return null;
  }
  return `${Math.floor(value / 10) * 10}s`;
}

function isMagazineIssue(book) {
  return viewerFilters.isMagazineIssue(book);
}

function passesHiddenVisibility(book) {
  return viewerFilters.passesHiddenVisibility(book, { hiddenOnly });
}

function hasVisibleMagazineIssues() {
  return getActiveBooks().some(
    (book) => isMagazineIssue(book) && !book.hidden,
  );
}

function isMycroftOnlyFilter() {
  return mycroftFilterMode === "only";
}

function isMycroftHiddenFilter() {
  return mycroftFilterMode === "hidden";
}

function passesMycroftImprintFilter(book) {
  return viewerFilters.passesMycroftImprintFilter(book, mycroftFilterMode);
}

function cycleMycroftFilter() {
  mycroftFilterMode = viewerFilters.cycleMycroftFilter(mycroftFilterMode);
}

function hasAnyOrderedBooks() {
  return viewerFilters.hasAnyOrderedBooks(
    getActiveBooks(),
    activeCollectionIds(),
    orderedIds,
    {
      hiddenOnly,
      showMagazines,
    },
  );
}

function isCollectionFilterActive() {
  return collectionFilterMode != null;
}

function isCollectionAllFilter() {
  return collectionFilterMode === "collection";
}

function isOrderedFilterActive() {
  return collectionFilterMode === "ordered";
}

function passesCollectionFilter(book) {
  return viewerFilters.passesCollectionFilter(
    book,
    collectionFilterMode,
    activeCollectionIds(),
    orderedIds,
  );
}

function cycleWantFilter() {
  wantFilterMode = viewerWantView.cycleWantFilter(
    wantFilterMode,
    hasAnyWants(),
  );
}

function hasAnyWants() {
  return viewerFilters.hasAnyWants(getActiveBooks(), wantIds, {
    hiddenOnly,
    showMagazines,
  });
}

function cycleCollectionFilter() {
  collectionFilterMode = viewerFilters.cycleCollectionFilter(
    collectionFilterMode,
    hasAnyOrderedBooks(),
  );
}

function passesBookVisibility(book) {
  return viewerFilters.passesBookVisibility(book, {
    hiddenOnly,
    showMagazines,
  });
}

function isCollected(book) {
  return viewerFilters.isCollected(book, activeCollectionIds());
}

function isOrdered(book) {
  return viewerFilters.isOrdered(book, activeCollectionIds(), orderedIds);
}

function getCollectionItem(book) {
  if (isCollected(book)) {
    return { status: "shelf" };
  }
  if (isOrdered(book)) {
    return { status: "order" };
  }
  return null;
}

function isInCollection(book) {
  return viewerFilters.isInCollection(
    book,
    activeCollectionIds(),
    orderedIds,
  );
}

function exportableCollectionIds() {
  const ids = new Set(activeCollectionIds());
  for (const id of orderedIds) {
    ids.add(id);
  }
  return ids;
}


/* Filter mode ↔ URL path sync (/want, /collection, etc.) */

function currentFilterStateForUrl() {
  return viewerFilterUrl.currentFilterSnapshot({
    collectionFilterMode,
    wantFilterMode,
    mycroftFilterMode,
    hiddenOnly,
  });
}

function applyFiltersFromUrl() {
  const parsed = viewerFilterUrl.parseFilterPath(window.location.pathname);
  collectionFilterMode = parsed.collectionFilterMode;
  wantFilterMode = parsed.wantFilterMode;
  mycroftFilterMode = parsed.mycroftFilterMode;
  hiddenOnly = parsed.hiddenOnly;
}

function syncFilterUrlFromState(options = {}) {
  const nextPath = viewerFilterUrl.buildFilterPath(currentFilterStateForUrl());
  const nextUrl = `${nextPath}${window.location.search}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl === currentUrl) {
    return false;
  }
  const usePush = options.replace === false;
  if (usePush) {
    history.pushState(history.state, "", nextUrl);
  } else {
    history.replaceState(history.state, "", nextUrl);
  }
  return true;
}

function goHome() {
  collectionFilterMode = null;
  wantFilterMode = null;
  mycroftFilterMode = null;
  hiddenOnly = false;

  if (typeof clearSearchState === "function") {
    clearSearchState();
  }

  if (
    typeof coverLightbox !== "undefined" &&
    coverLightbox &&
    !coverLightbox.hidden &&
    typeof closeCoverLightbox === "function"
  ) {
    closeCoverLightbox();
  }

  if (
    bookDetailDialog &&
    !bookDetailDialog.hidden &&
    typeof closeBookDetail === "function"
  ) {
    closeBookDetail({ programmatic: true });
  }

  if (
    typeof settingsDialog !== "undefined" &&
    settingsDialog &&
    !settingsDialog.hidden &&
    typeof closeSettingsDialog === "function"
  ) {
    closeSettingsDialog({ programmatic: true });
  }

  if (
    typeof attributionDialog !== "undefined" &&
    attributionDialog &&
    !attributionDialog.hidden &&
    typeof closeAttributionDialog === "function"
  ) {
    closeAttributionDialog({ programmatic: true });
  }

  syncFilterUrlFromState({ replace: false });
  render();
}

function notifyFilterChange(options = {}) {
  syncFilterUrlFromState(options);
  render();
}

window.addEventListener("popstate", () => {
  applyFiltersFromUrl();
  if (typeof handleNavigationPopState === "function") {
    handleNavigationPopState();
  } else if (typeof handleDetailPopState === "function") {
    handleDetailPopState();
  }
  render();
});


/* Collection, want list, storage mode, and user state */

const GIST_PUSH_DELAY_MS = 1000;
let gistPushTimer = null;
let gistPushInFlight = null;
let gistPullInFlight = null;

function readLegacyStorageSnapshot() {
  const snapshot = {};
  try {
    for (const key of Object.values(viewerUserState.LEGACY_KEYS)) {
      snapshot[key] = localStorage.getItem(key);
    }
  } catch (_) {
    // localStorage unavailable
  }
  return snapshot;
}

function readGistSyncConfig() {
  try {
    const saved = localStorage.getItem(viewerGistSync.GIST_SYNC_KEY);
    return viewerGistSync.parseGistSyncConfig(saved);
  } catch (_) {
    return null;
  }
}

function writeGistSyncConfig(config) {
  try {
    localStorage.setItem(
      viewerGistSync.GIST_SYNC_KEY,
      viewerGistSync.serializeGistSyncConfig(config),
    );
  } catch (_) {
    // localStorage unavailable
  }
}

function clearGistSyncConfig() {
  if (gistPushTimer) {
    clearTimeout(gistPushTimer);
    gistPushTimer = null;
  }
  gistPushInFlight = null;
  try {
    localStorage.removeItem(viewerGistSync.GIST_SYNC_KEY);
  } catch (_) {
    // localStorage unavailable
  }
  if (gistTokenInput) {
    gistTokenInput.value = "";
  }
  syncGistConnectUi();
  refreshGistSyncStatus();
}

function readPersistedUserState() {
  try {
    const saved = localStorage.getItem(viewerUserState.USER_STATE_KEY);
    return viewerUserState.parseUserState(saved);
  } catch (_) {
    return null;
  }
}

function buildStateForPersistence() {
  const existing = readPersistedUserState();
  return viewerUserState.buildUserStateFromRuntime(collectRuntimeSnapshot(), {
    existingCollections: existing?.collections,
  });
}

function swapCollectionForStorageMode(nextMode) {
  const existing = readPersistedUserState();
  const collections = viewerUserState.normalizeCollections(
    existing?.collections,
    existing?.collectionIds,
    existing?.orderedIds,
    {
      wantIds: existing?.wantIds,
      wantOrderIds: existing?.wantOrderIds,
      at: existing?.updatedAt,
    },
  );
  collections[storageMode] = viewerUserState.buildCollectionSlot(
    bookStatuses,
    wantOrderIds,
  );
  const nextSlot = collections[nextMode] || viewerUserState.emptyCollectionSlot();
  applyBookStatuses(nextSlot.statuses, { wantOrderIds: nextSlot.wantOrderIds });
  return collections;
}

function persistUserState(state) {
  try {
    localStorage.setItem(
      viewerUserState.USER_STATE_KEY,
      viewerUserState.serializeUserState(state),
    );
  } catch (_) {
    // localStorage unavailable
  }
}

function collectRuntimeSnapshot() {
  return {
    storageMode,
    bookStatuses,
    collectionIds: [...collectionIds],
    orderedIds: [...orderedIds],
    wantIds: [...wantIds],
    wantOrderIds: [...wantOrderIds],
    sort: getCatalogSortMode(),
    viewMode: gridViewMode,
    headerFiltersExpanded,
    highlightWants,
    highlightCollection,
    showMagazines,
    wantOrderLocked,
  };
}

function applyRuntimeSnapshot(runtime) {
  storageMode = viewerUserState.normalizeStorageMode(runtime.storageMode);
  applyBookStatuses(runtime.bookStatuses, {
    wantOrderIds: runtime.wantOrderIds,
  });
  gridViewMode = runtime.viewMode;
  headerFiltersExpanded = runtime.headerFiltersExpanded;
  highlightWants = runtime.highlightWants;
  highlightCollection = runtime.highlightCollection;
  showMagazines = runtime.showMagazines;
  wantOrderLocked = runtime.wantOrderLocked === true;
  if (runtime.sort) {
    syncSortControlFromMode(runtime.sort);
  }
  updateViewModeState();
  updateHeaderFiltersState();
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function listUserGists(token) {
  const response = await fetch(`${viewerGistSync.GITHUB_API}/gists?per_page=100`, {
    headers: githubHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) {
    return [];
  }
  return response.json();
}

async function fetchGistState(config) {
  const response = await fetch(
    `${viewerGistSync.GITHUB_API}/gists/${config.gistId}`,
    {
      headers: githubHeaders(config.token),
      cache: "no-store",
    },
  );
  if (response.status === 404) {
    throw new Error("Gist fetch failed (404)");
  }
  if (!response.ok) {
    throw new Error(`Gist fetch failed (${response.status})`);
  }
  const body = await response.json();
  const stateFilename = viewerGistSync.resolveGistStateFilename(
    body,
    config.stateFilename,
  );
  if (stateFilename !== config.stateFilename) {
    writeGistSyncConfig({ ...config, stateFilename });
  }
  const content = viewerGistSync.extractStateJsonFromGistResponse(
    body,
    stateFilename,
  );
  if (!content) {
    return null;
  }
  return viewerUserState.parseUserState(content);
}

async function findExistingArkhamGist(token) {
  const gists = await listUserGists(token);
  return viewerGistSync.findArkhamGistEntry(gists);
}

async function patchGistState(config, state) {
  const stateJson = viewerUserState.serializeUserState(state);
  const stateFilename =
    config.stateFilename || viewerGistSync.GIST_STATE_FILENAME;
  const response = await fetch(
    `${viewerGistSync.GITHUB_API}/gists/${config.gistId}`,
    {
      method: "PATCH",
      headers: {
        ...githubHeaders(config.token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        viewerGistSync.buildGistUpdatePayload(stateJson, stateFilename),
      ),
    },
  );
  if (!response.ok) {
    throw new Error(`Gist update failed (${response.status})`);
  }
}

/**
 * Fold whatever a push resolved to back into the live view, re-merging against
 * current state so a click made while the request was in flight survives.
 */
function adoptMergedGistState(merged) {
  const current = buildStateForPersistence();
  const next = viewerUserState.mergeUserState(current, merged) || merged;
  const unchanged =
    JSON.stringify(next.collections.gist.statuses) ===
      JSON.stringify(current.collections.gist.statuses) &&
    JSON.stringify(next.wantOrderIds) === JSON.stringify(current.wantOrderIds);
  if (unchanged) {
    return;
  }
  persistUserState(next);
  applyRuntimeSnapshot(viewerUserState.applyUserStateToRuntime(next));
  syncSettingsStorageMode();
  render();
}

/**
 * Read, merge, then write. A blind PATCH lets a tab that loaded an hour ago erase
 * books another device added since; merging the remote doc first means a stale tab
 * can only add to the record, never subtract from it.
 *
 * `authoritative` skips the merge for the one case that must not merge: restoring
 * a snapshot, which is a deliberate replacement of everything.
 */
async function pushGistState(config, state, options = {}) {
  if (options.authoritative) {
    await patchGistState(config, state);
    return state;
  }

  let remoteState = null;
  try {
    remoteState = await fetchGistState(config);
  } catch (error) {
    // Never overwrite a gist we could not read; a missing file is safe to replace.
    if (!String(error.message || "").includes("404")) {
      throw error;
    }
  }
  const merged = viewerUserState.mergeUserState(state, remoteState) || state;
  await patchGistState(config, merged);
  adoptMergedGistState(merged);
  return merged;
}

async function createGistWithState(config, state) {
  const stateJson = viewerUserState.serializeUserState(state);
  const response = await fetch(`${viewerGistSync.GITHUB_API}/gists`, {
    method: "POST",
    headers: {
      ...githubHeaders(config.token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(viewerGistSync.buildGistCreatePayload(stateJson)),
  });
  if (!response.ok) {
    throw new Error(`Gist create failed (${response.status})`);
  }
  const body = await response.json();
  return body.id;
}

async function connectGistSync(token) {
  const trimmed = String(token || "").trim();
  if (!trimmed) {
    throw new Error("Enter a GitHub token with gist access.");
  }

  const existingConfig = readGistSyncConfig();
  let gistId = existingConfig?.gistId || "";
  let stateFilename = existingConfig?.stateFilename || "";
  if (!gistId) {
    const entry = await findExistingArkhamGist(trimmed);
    gistId = entry?.gistId || "";
    stateFilename = entry?.stateFilename || "";
  }

  const localPersisted = readPersistedUserState();
  let remoteState = null;

  if (gistId) {
    try {
      remoteState = await fetchGistState({
        token: trimmed,
        gistId,
        stateFilename,
      });
    } catch (error) {
      if (String(error.message || "").includes("404")) {
        gistId = "";
        stateFilename = "";
      } else {
        throw error;
      }
    }
  }

  const resolved = viewerGistSync.resolveGistConnectState({
    gistId,
    remoteState,
    localPersisted,
    adoptRemoteGistState: viewerUserState.adoptRemoteGistState,
    buildNewGistConnectState: viewerUserState.buildNewGistConnectState,
  });
  if (!resolved.ok) {
    throw new Error(resolved.error);
  }

  let nextState = resolved.nextState;
  if (resolved.action === "create") {
    gistId = await createGistWithState(
      { token: trimmed, gistId: "" },
      nextState,
    );
    stateFilename = viewerGistSync.GIST_STATE_FILENAME;
  }

  const gists = await listUserGists(trimmed);
  const backupGistId =
    existingConfig?.backupGistId ||
    viewerGistBackup.findBackupGistId(gists, gistId) ||
    "";

  writeGistSyncConfig({
    token: trimmed,
    gistId,
    backupGistId,
    stateFilename,
  });
  persistUserState(nextState);
  applyRuntimeSnapshot(viewerUserState.applyUserStateToRuntime(nextState));
  pendingGistSetup = false;
  storageMode = "gist";
  syncSettingsStorageMode();
  return { token: trimmed, gistId };
}

function scheduleGistPush() {
  if (storageMode !== "gist") {
    return;
  }
  const config = readGistSyncConfig();
  if (!viewerGistSync.isConnectedGistConfig(config)) {
    return;
  }
  if (gistPushTimer) {
    clearTimeout(gistPushTimer);
  }
  gistPushTimer = setTimeout(async () => {
    gistPushTimer = null;
    try {
      gistPushInFlight = pushGistState(config, buildStateForPersistence());
      await gistPushInFlight;
      updateGistSyncStatus("Synced to GitHub Gist.");
      try {
        await maybeCreateGistSnapshot();
      } catch (_) {
        /* Backup failures must not block live sync. */
      }
    } catch (error) {
      updateGistSyncStatus(error.message || "Gist sync failed.", true);
    } finally {
      gistPushInFlight = null;
    }
  }, GIST_PUSH_DELAY_MS);
}

async function pullGistStateIfConfigured(options = {}) {
  if (storageMode !== "gist") {
    return;
  }
  const config = readGistSyncConfig();
  if (!viewerGistSync.isConnectedGistConfig(config)) {
    return;
  }
  if (gistPushTimer || gistPushInFlight) {
    return;
  }
  if (gistPullInFlight) {
    return gistPullInFlight;
  }

  gistPullInFlight = (async () => {
    try {
      const localRaw = localStorage.getItem(viewerUserState.USER_STATE_KEY);
      const localState = viewerUserState.parseUserState(localRaw);
      const remoteState = await fetchGistState(config);
      const merged = viewerUserState.mergeUserState(localState, remoteState);
      // Comparing updatedAt is not enough: a remote doc can carry books this
      // device is missing while still holding an older payload timestamp.
      const changed =
        merged &&
        viewerUserState.serializeUserState(merged) !==
          viewerUserState.serializeUserState(localState);
      if (changed) {
        persistUserState(merged);
        applyRuntimeSnapshot(viewerUserState.applyUserStateToRuntime(merged));
        syncSettingsStorageMode();
        if (options.reRender !== false) {
          render();
        }
      } else {
        refreshGistSyncStatus();
      }
    } catch (error) {
      updateGistSyncStatus(error.message || "Gist pull failed.", true);
    } finally {
      gistPullInFlight = null;
    }
  })();

  return gistPullInFlight;
}

function enforceStorageModeConsistency() {
  if (storageMode === "gist" && !viewerGistSync.isConnectedGistConfig(readGistSyncConfig())) {
    const collections = swapCollectionForStorageMode("local");
    storageMode = "local";
    persistUserState(
      viewerUserState.buildUserStateFromRuntime(collectRuntimeSnapshot(), {
        existingCollections: collections,
      }),
    );
  }
  pendingGistSetup = false;
}

function activateLocalStorageMode(options = {}) {
  pendingGistSetup = false;
  if (storageMode === "gist") {
    const collections = swapCollectionForStorageMode("local");
    storageMode = "local";
    persistUserState(
      viewerUserState.buildUserStateFromRuntime(collectRuntimeSnapshot(), {
        existingCollections: collections,
      }),
    );
  }
  syncSettingsStorageMode();
  if (options.render !== false) {
    render();
  }
  if (options.render !== false && !bookDetailDialog.hidden && detailBookId) {
    openBookDetail(detailBookId, { historyMode: "none" });
  }
}

async function activateGistStorageMode(options = {}) {
  if (!viewerGistSync.isConnectedGistConfig(readGistSyncConfig())) {
    pendingGistSetup = true;
    syncSettingsStorageMode();
    return false;
  }

  pendingGistSetup = false;
  if (storageMode !== "gist") {
    const collections = swapCollectionForStorageMode("gist");
    storageMode = "gist";
    persistUserState(
      viewerUserState.buildUserStateFromRuntime(collectRuntimeSnapshot(), {
        existingCollections: collections,
      }),
    );
    await pullGistStateIfConfigured({ reRender: false });
  }
  syncSettingsStorageMode();
  if (options.render !== false) {
    render();
  }
  if (options.render !== false && !bookDetailDialog.hidden && detailBookId) {
    openBookDetail(detailBookId, { historyMode: "none" });
  }
  return true;
}

function loadUserState() {
  let state = null;
  try {
    const saved = localStorage.getItem(viewerUserState.USER_STATE_KEY);
    state = viewerUserState.parseUserState(saved);
    if (!state) {
      const legacy = readLegacyStorageSnapshot();
      state = viewerUserState.hasLegacyUserData(legacy)
        ? viewerUserState.migrateFromLegacy(legacy)
        : viewerUserState.defaultUserState();
      persistUserState(state);
    }
  } catch (_) {
    state = viewerUserState.defaultUserState();
  }

  applyRuntimeSnapshot(viewerUserState.applyUserStateToRuntime(state));
  enforceStorageModeConsistency();
  syncSettingsHighlightCheckboxes();
  updateHeaderFiltersState();
  updateViewModeState();
  syncSettingsStorageMode();
}

async function loadUserStateAsync() {
  loadUserState();
  await pullGistStateIfConfigured({ reRender: false });
  try {
    await maybeCreateGistSnapshot();
  } catch (_) {
    /* Backup failures must not block startup. */
  }
}

function saveUserState() {
  if (
    storageMode === "gist" &&
    !viewerGistSync.isConnectedGistConfig(readGistSyncConfig())
  ) {
    storageMode = "local";
    pendingGistSetup = false;
  }
  persistUserState(buildStateForPersistence());
  scheduleGistPush();
}

async function importCollectionFromCsvText(csvText) {
  const rows = viewerCollectionImport.parseCollectionCsv(csvText);
  if (!rows.length) {
    throw new Error("No collection rows found in that file.");
  }

  const result = viewerCollectionImport.matchCollectionImportEntries(
    getActiveBooks(),
    rows,
  );
  applyBookStatuses(
    viewerBookStatus.replaceStatusesFromImport(
      bookStatuses,
      result.entries,
      new Date().toISOString(),
    ),
  );
  saveUserState();

  let syncedToGist = false;
  if (isGistStorageActive()) {
    const config = readGistSyncConfig();
    await pushGistState(config, buildStateForPersistence());
    syncedToGist = true;
      updateGistSyncStatus("Synced to GitHub Gist.");
  }

  return {
    rowCount: rows.length,
    matchedCount: result.entries.length,
    unmatchedCount: result.unmatchedRows.length,
    syncedToGist,
  };
}

function updateHeaderFiltersState() {
  document.body.classList.toggle(
    "header-filters-collapsed",
    !headerFiltersExpanded,
  );
  if (!headerFiltersToggle) {
    return;
  }
  headerFiltersToggle.setAttribute(
    "aria-expanded",
    String(headerFiltersExpanded),
  );
  headerFiltersToggle.setAttribute(
    "aria-label",
    headerFiltersExpanded
      ? "Hide filters and sort"
      : "Show filters and sort",
  );
}

function updateViewModeState() {
  const listMode = gridViewMode === "list";
  document.body.classList.toggle("view-mode-list", listMode);
  if (!viewModeToggle) {
    return;
  }
  const listPreference = gridViewMode === "list";
  viewModeToggle.setAttribute("aria-pressed", String(listPreference));
  viewModeToggle.setAttribute(
    "aria-label",
    listPreference ? "Switch to grid view" : "Switch to list view",
  );
}

function isWanted(book) {
  return wantIds.has(book.id);
}

function toggleWant(bookId) {
  const id = Number(bookId);
  if (!Number.isFinite(id)) {
    return;
  }
  syncWantMembership(id, !wantIds.has(id));
  saveUserState();
  render();
  if (!bookDetailDialog.hidden) {
    openBookDetail(detailBookId, { historyMode: "none" });
  }
}

function toggleCollection(bookId) {
  const id = Number(bookId);
  if (!Number.isFinite(id)) {
    return;
  }

  applyBookStatuses(
    viewerBookStatus.cycleCollectionStatus(
      bookStatuses,
      id,
      new Date().toISOString(),
    ),
  );

  saveUserState();
  render();
  if (!bookDetailDialog.hidden) {
    openBookDetail(detailBookId, { historyMode: "none" });
  }
}

function getWantCount() {
  return getActiveBooks().filter(
    (book) => passesBookVisibility(book) && isWanted(book),
  ).length;
}

function getCollectionCount() {
  return getActiveBooks().filter(
    (book) => passesBookVisibility(book) && isInCollection(book),
  ).length;
}

let backupSnapshotChain = Promise.resolve();

function isGistSyncConnected() {
  return (
    storageMode === "gist" &&
    viewerGistSync.isConnectedGistConfig(readGistSyncConfig())
  );
}

function backupUserStateLocally(state) {
  try {
    localStorage.setItem(
      viewerUserState.USER_STATE_BACKUP_KEY,
      viewerUserState.serializeUserState(state),
    );
  } catch (_) {
    // localStorage unavailable
  }
}

function clearStoredBackupGistId() {
  const config = readGistSyncConfig();
  if (!config?.backupGistId) {
    return;
  }
  writeGistSyncConfig({ ...config, backupGistId: "" });
}

async function gistApiRequest(path, options = {}) {
  const { method = "GET", token, body } = options;
  const response = await fetch(`${viewerGistSync.GITHUB_API}${path}`, {
    method,
    headers: {
      ...githubHeaders(token),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!response.ok) {
    const error = new Error(`GitHub API failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

async function resolveBackupGistId() {
  const config = readGistSyncConfig();
  if (!config?.token) {
    return null;
  }
  if (config.backupGistId) {
    return config.backupGistId;
  }
  const gists = await listUserGists(config.token);
  const backupGistId = viewerGistBackup.findBackupGistId(gists, config.gistId);
  if (backupGistId) {
    writeGistSyncConfig({ ...config, backupGistId });
  }
  return backupGistId || null;
}

async function fetchBackupGistBody(backupGistId) {
  const config = readGistSyncConfig();
  try {
    return await gistApiRequest(`/gists/${backupGistId}`, {
      token: config.token,
    });
  } catch (error) {
    if (error?.status === 404) {
      clearStoredBackupGistId();
      return null;
    }
    throw error;
  }
}

async function readBackupPayload(backupGistId) {
  const body = await fetchBackupGistBody(backupGistId);
  if (!body) {
    return viewerGistBackup.emptyBackupPayload();
  }
  const content = viewerGistBackup.extractBackupContent(body);
  return content
    ? viewerGistBackup.parseBackupPayload(content)
    : viewerGistBackup.emptyBackupPayload();
}

async function writeBackupPayload(backupGistId, payload) {
  const config = readGistSyncConfig();
  const contentJson = viewerGistBackup.serializeBackupPayload(payload);
  try {
    await gistApiRequest(`/gists/${backupGistId}`, {
      method: "PATCH",
      token: config.token,
      body: viewerGistBackup.buildBackupGistUpdatePayload(contentJson),
    });
  } catch (error) {
    if (error?.status === 404) {
      clearStoredBackupGistId();
      await createBackupGist(payload);
      return;
    }
    throw error;
  }
}

async function createBackupGist(payload) {
  const config = readGistSyncConfig();
  const contentJson = viewerGistBackup.serializeBackupPayload(payload);
  const created = await gistApiRequest("/gists", {
    method: "POST",
    token: config.token,
    body: viewerGistBackup.buildBackupGistCreatePayload(contentJson),
  });
  const backupGistId = created?.id || "";
  if (!backupGistId) {
    throw new Error("GitHub did not return a backup Gist id.");
  }
  writeGistSyncConfig({ ...config, backupGistId });
  return backupGistId;
}

async function createGistSnapshotNow() {
  const now = Date.now();
  const atIso = new Date(now).toISOString();
  const stateObject = viewerUserState.parseUserState(
    viewerUserState.serializeUserState(buildStateForPersistence()),
  );
  if (!stateObject) {
    return { ok: false, reason: "state" };
  }

  let backupGistId = await resolveBackupGistId();
  let payload = viewerGistBackup.emptyBackupPayload();

  if (backupGistId) {
    const body = await fetchBackupGistBody(backupGistId);
    if (!body) {
      backupGistId = null;
    } else {
      payload = viewerGistBackup.parseBackupPayload(
        viewerGistBackup.extractBackupContent(body) || "",
      );
      if (!viewerGistBackup.shouldCreateSnapshot(payload.snapshots, now)) {
        return { ok: true, skipped: true };
      }
    }
  }

  if (!backupGistId && !viewerGistBackup.shouldCreateSnapshot([], now)) {
    return { ok: true, skipped: true };
  }

  const nextPayload = viewerGistBackup.appendSnapshot(
    payload,
    stateObject,
    atIso,
  );

  if (!backupGistId) {
    await createBackupGist(nextPayload);
    return { ok: true, created: true };
  }

  await writeBackupPayload(backupGistId, nextPayload);
  return { ok: true, created: true };
}

async function maybeCreateGistSnapshot() {
  if (!isGistSyncConnected()) {
    return { ok: false, reason: "disabled" };
  }
  backupSnapshotChain = backupSnapshotChain.then(() => createGistSnapshotNow());
  return backupSnapshotChain;
}

async function listGistSnapshots() {
  if (!isGistSyncConnected()) {
    return [];
  }
  const backupGistId = await resolveBackupGistId();
  if (!backupGistId) {
    return [];
  }
  const payload = await readBackupPayload(backupGistId);
  return viewerGistBackup.snapshotListEntries(payload);
}

async function restoreGistSnapshot(at) {
  if (!isGistSyncConnected()) {
    return { ok: false, error: "Gist sync is not connected." };
  }
  if (!Date.parse(String(at || ""))) {
    return { ok: false, error: "That snapshot is not valid." };
  }

  const backupGistId = await resolveBackupGistId();
  if (!backupGistId) {
    return { ok: false, error: "No backup Gist found." };
  }

  const payload = await readBackupPayload(backupGistId);
  const entry = viewerGistBackup.findSnapshotByAt(payload, at);
  if (!entry) {
    return { ok: false, error: "Could not find that snapshot." };
  }
  const parsed = viewerUserState.parseUserState(entry.state);
  if (!parsed) {
    return { ok: false, error: "Could not read that snapshot." };
  }

  const current = buildStateForPersistence();
  backupUserStateLocally(current);

  const config = readGistSyncConfig();
  let remoteState = null;
  try {
    remoteState = await fetchGistState(config);
  } catch (_) {
    // A restore still proceeds when the remote doc cannot be read.
  }

  // A restore is a deliberate replacement, so every book is re-stamped now and
  // anything the snapshot never had gets a tombstone. Without fresh stamps the
  // next merge from another device would simply resurrect what was restored away.
  const baseline = viewerUserState.mergeUserState(current, remoteState) || current;
  const restoredAt = new Date().toISOString();
  const restored = viewerUserState.withActiveSlotMirrors(
    { ...parsed, updatedAt: restoredAt },
    {
      local: current.collections.local,
      gist: viewerUserState.buildCollectionSlot(
        viewerBookStatus.supersedeStatusMap(
          baseline.collections.gist.statuses,
          parsed.collections.gist.statuses,
          restoredAt,
        ),
        parsed.collections.gist.wantOrderIds,
      ),
    },
    "gist",
  );

  persistUserState(restored);
  applyRuntimeSnapshot(viewerUserState.applyUserStateToRuntime(restored));
  storageMode = "gist";
  pendingGistSetup = false;
  syncSettingsStorageMode();
  invalidateSortedCache();

  await pushGistState(config, restored, { authoritative: true });
  updateGistSyncStatus("Synced to GitHub Gist.");

  return { ok: true };
}


/* Generated from scripts/lib/viewer-sort.js — run npm run bundle-viewer */

const viewerSort = (function () {
  function parseYear(value) {
    if (!value) {
      return null;
    }
    const match = String(value).match(/\d{4}/);
    return match ? match[0] : null;
  }
  
  const SORT_MODES = new Set([
    "date-desc",
    "date-asc",
    "title-asc",
    "title-desc",
  ]);
  
  const SORT_FIELDS = new Set(["date", "title"]);
  
  const SORT_FIELD_DEFAULTS = {
    date: "date-asc",
    title: "title-asc",
  };
  
  function normalizeSort(raw, fallback = "date-asc") {
    if (raw && SORT_MODES.has(raw)) {
      return raw;
    }
    return fallback;
  }
  
  function getSortField(mode) {
    const normalized = normalizeSort(mode);
    if (normalized.startsWith("title-")) {
      return "title";
    }
    return "date";
  }
  
  function isSortDescending(mode) {
    return normalizeSort(mode).endsWith("-desc");
  }
  
  function toggleSortDirection(mode) {
    const normalized = normalizeSort(mode);
    if (normalized.endsWith("-asc")) {
      return normalized.replace(/-asc$/, "-desc");
    }
    if (normalized.endsWith("-desc")) {
      return normalized.replace(/-desc$/, "-asc");
    }
    return normalized;
  }
  
  function sortModeForField(field, currentMode) {
    if (!field || !SORT_FIELDS.has(field)) {
      return SORT_FIELD_DEFAULTS.date;
    }
    const normalized = normalizeSort(currentMode);
    if (getSortField(normalized) === field) {
      return normalized;
    }
    return SORT_FIELD_DEFAULTS[field] || SORT_FIELD_DEFAULTS.date;
  }
  
  function sortDirectionLabel(field, descending) {
    if (field === "title") {
      return descending ? "Z to A" : "A to Z";
    }
    return descending ? "Newest first" : "Oldest first";
  }
  
  function buildBookOrderIndex(orderIds) {
    return new Map(orderIds.map((id, index) => [Number(id), index]));
  }
  
  function compareOrderTiebreak(a, b, bookOrderIndex) {
    const indexA = bookOrderIndex.has(a.id) ? bookOrderIndex.get(a.id) : a.id;
    const indexB = bookOrderIndex.has(b.id) ? bookOrderIndex.get(b.id) : b.id;
    if (indexA !== indexB) {
      return indexA - indexB;
    }
    return a.id - b.id;
  }
  
  function compareCanonical(a, b, bookOrderIndex) {
    const yearA = parseYear(a.publicationDate);
    const yearB = parseYear(b.publicationDate);
    if (yearA == null && yearB == null) {
      return compareOrderTiebreak(a, b, bookOrderIndex);
    }
    if (yearA == null) {
      return 1;
    }
    if (yearB == null) {
      return -1;
    }
    if (yearA !== yearB) {
      return yearA - yearB;
    }
    return compareOrderTiebreak(a, b, bookOrderIndex);
  }
  
  function sortBooks(list, mode, bookOrderIndex) {
    const copy = [...list];
    if (mode === "title-asc" || mode === "title") {
      return copy.sort((a, b) =>
        (a.title || "").localeCompare(b.title || ""),
      );
    }
    if (mode === "title-desc") {
      return copy.sort((a, b) =>
        (b.title || "").localeCompare(a.title || ""),
      );
    }
    if (mode === "date-desc") {
      return copy.sort((a, b) => {
        const yearA = parseYear(a.publicationDate);
        const yearB = parseYear(b.publicationDate);
        if (yearA == null && yearB == null) {
          return compareOrderTiebreak(a, b, bookOrderIndex);
        }
        if (yearA == null) {
          return 1;
        }
        if (yearB == null) {
          return -1;
        }
        if (yearA !== yearB) {
          return yearB - yearA;
        }
        return compareOrderTiebreak(a, b, bookOrderIndex);
      });
    }
    return copy.sort((a, b) => compareCanonical(a, b, bookOrderIndex));
  }
  return {
    SORT_MODES,
    SORT_FIELDS,
    SORT_FIELD_DEFAULTS,
    normalizeSort,
    getSortField,
    isSortDescending,
    toggleSortDirection,
    sortModeForField,
    sortDirectionLabel,
    compareOrderTiebreak,
    compareCanonical,
    sortBooks,
  };
})();


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


/* Generated from scripts/lib/viewer-pointer-reorder.js — run npm run bundle-viewer */

const viewerPointerReorder = (function () {
  /**
   * Pointer/touch list reorder helpers (HTML5 drag does not work on touch).
   */
  function findRowAtPoint(options) {
    const {
      root,
      clientX,
      clientY,
      rowSelector,
      excludeRow,
      elementsFromPoint,
    } = options;
  
    if (!root || !rowSelector || typeof elementsFromPoint !== "function") {
      return null;
    }
  
    const elements = elementsFromPoint(clientX, clientY);
    if (!Array.isArray(elements)) {
      return null;
    }
  
    for (const element of elements) {
      if (!element || typeof element.closest !== "function") {
        continue;
      }
      const row = element.closest(rowSelector);
      if (row && row !== excludeRow && root.contains(row)) {
        return row;
      }
    }
  
    return null;
  }
  
  function findNearestRowAtPoint(options) {
    const {
      root,
      clientX,
      clientY,
      rowSelector,
      excludeRow,
      elementsFromPoint,
      gapSlop = 12,
      getRowRect,
    } = options;
  
    const direct = findRowAtPoint({
      root,
      clientX,
      clientY,
      rowSelector,
      excludeRow,
      elementsFromPoint,
    });
    if (direct) {
      return direct;
    }
  
    if (!root || !rowSelector || typeof root.querySelectorAll !== "function") {
      return null;
    }
  
    const rows = root.querySelectorAll(rowSelector);
    let best = null;
    let bestDist = Infinity;
  
    for (const row of rows) {
      if (row === excludeRow || !root.contains(row)) {
        continue;
      }
  
      const rect =
        typeof getRowRect === "function"
          ? getRowRect(row)
          : typeof row.getBoundingClientRect === "function"
            ? row.getBoundingClientRect()
            : null;
      if (!rect) {
        continue;
      }
  
      if (clientX < rect.left || clientX > rect.right) {
        continue;
      }
  
      const expandedTop = rect.top - gapSlop;
      const expandedBottom = rect.bottom + gapSlop;
      if (clientY < expandedTop || clientY > expandedBottom) {
        continue;
      }
  
      const centerY = rect.top + rect.height / 2;
      const dist = Math.abs(clientY - centerY);
      if (dist < bestDist) {
        bestDist = dist;
        best = row;
      }
    }
  
    return best;
  }
  
  function findNearestGridItemAtPoint(options) {
    const {
      root,
      clientX,
      clientY,
      itemSelector,
      excludeItem,
      elementsFromPoint,
      gapSlop = 12,
      getItemRect,
    } = options;
  
    const direct = findRowAtPoint({
      root,
      clientX,
      clientY,
      rowSelector: itemSelector,
      excludeRow: excludeItem,
      elementsFromPoint,
    });
    if (direct) {
      return direct;
    }
  
    if (!root || !itemSelector || typeof root.querySelectorAll !== "function") {
      return null;
    }
  
    const items = root.querySelectorAll(itemSelector);
    let best = null;
    let bestDist = Infinity;
    let bestReading = Infinity;
  
    for (const item of items) {
      if (item === excludeItem || !root.contains(item)) {
        continue;
      }
  
      const rect =
        typeof getItemRect === "function"
          ? getItemRect(item)
          : typeof item.getBoundingClientRect === "function"
            ? item.getBoundingClientRect()
            : null;
      if (!rect) {
        continue;
      }
  
      const expandedLeft = rect.left - gapSlop;
      const expandedRight = rect.right + gapSlop;
      const expandedTop = rect.top - gapSlop;
      const expandedBottom = rect.bottom + gapSlop;
      if (
        clientX < expandedLeft ||
        clientX > expandedRight ||
        clientY < expandedTop ||
        clientY > expandedBottom
      ) {
        continue;
      }
  
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.hypot(clientX - centerX, clientY - centerY);
      const reading = rect.top * 10000 + rect.left;
      if (
        dist < bestDist - 0.5 ||
        (Math.abs(dist - bestDist) <= 0.5 && reading < bestReading)
      ) {
        bestDist = dist;
        bestReading = reading;
        best = item;
      }
    }
  
    return best;
  }
  
  function findClosestGridItemAtPoint(options) {
    const {
      root,
      clientX,
      clientY,
      itemSelector,
      excludeItem,
      getItemRect,
      maxDistance = Infinity,
    } = options;
  
    if (!root || !itemSelector || typeof root.querySelectorAll !== "function") {
      return null;
    }
  
    const items = root.querySelectorAll(itemSelector);
    let best = null;
    let bestDist = Infinity;
    let bestReading = Infinity;
  
    for (const item of items) {
      if (item === excludeItem || !root.contains(item)) {
        continue;
      }
  
      const rect =
        typeof getItemRect === "function"
          ? getItemRect(item)
          : typeof item.getBoundingClientRect === "function"
            ? item.getBoundingClientRect()
            : null;
      if (!rect) {
        continue;
      }
  
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.hypot(clientX - centerX, clientY - centerY);
      if (dist > maxDistance) {
        continue;
      }
  
      const reading = rect.top * 10000 + rect.left;
      if (
        dist < bestDist - 0.5 ||
        (Math.abs(dist - bestDist) <= 0.5 && reading < bestReading)
      ) {
        bestDist = dist;
        bestReading = reading;
        best = item;
      }
    }
  
    return best;
  }
  return {
    findRowAtPoint,
    findNearestRowAtPoint,
    findNearestGridItemAtPoint,
    findClosestGridItemAtPoint,
  };
})();


/* Generated from scripts/lib/viewer-want-view.js — run npm run bundle-viewer */

const viewerWantView = (function () {
  const WANT_FILTER = "want";
  
  function isWantFilterActive(wantFilterMode) {
    return wantFilterMode === WANT_FILTER;
  }
  
  function cycleWantFilter(wantFilterMode, hasAnyWants) {
    if (!hasAnyWants) {
      return wantFilterMode === WANT_FILTER ? null : WANT_FILTER;
    }
    return wantFilterMode === WANT_FILTER ? null : WANT_FILTER;
  }
  
  function usesWantPrioritySort(wantFilterMode) {
    return isWantFilterActive(wantFilterMode);
  }
  
  function shouldDisableCatalogSort(wantFilterMode) {
    return isWantFilterActive(wantFilterMode);
  }
  
  function canReorderWantList(
    wantFilterMode,
    viewMode,
    hasActiveSearch,
    wantOrderLocked = false,
  ) {
    return (
      isWantFilterActive(wantFilterMode) &&
      (viewMode === "list" || viewMode === "cards") &&
      !hasActiveSearch &&
      !wantOrderLocked
    );
  }
  
  function shouldShowWantRankHandles(wantFilterMode, viewMode, hasActiveSearch) {
    return (
      isWantFilterActive(wantFilterMode) &&
      (viewMode === "list" || viewMode === "cards") &&
      !hasActiveSearch
    );
  }
  return {
    WANT_FILTER,
    isWantFilterActive,
    cycleWantFilter,
    usesWantPrioritySort,
    shouldDisableCatalogSort,
    canReorderWantList,
    shouldShowWantRankHandles,
  };
})();


/* Search chips, field autocomplete, and compound query state */

/** @type {{ type: string, label: string }[]} */
const searchFilterChips = [];
let searchSuggestIndex = -1;
let searchRenderTimer = null;
let suggestUpdateTimer = null;
let suggestScrollY = 0;
let cachedSearchFilter = null;
let cachedSearchFilterKey = null;
const knownFieldValuesCache = new Map();
/** @type {string[]} */
let lastSuggestItems = [];

function searchStateKey() {
  return JSON.stringify({
    chips: searchFilterChips,
    draft: searchInput.value,
  });
}

function invalidateSearchFilterCache() {
  cachedSearchFilterKey = null;
  cachedSearchFilter = null;
}

function invalidateKnownFieldValuesCache() {
  knownFieldValuesCache.clear();
}

function invalidateSearchViewCache() {
  invalidateSearchFilterCache();
  invalidateKnownFieldValuesCache();
}

function searchFilterHasTerms(filter) {
  return (
    (filter.textTerms || []).length > 0 ||
    viewerSearchFields.SEARCH_FIELD_TYPES.some(
      (field) => (filter.fieldTerms[field.key] || []).length > 0,
    )
  );
}

function isSuggestTouchAllowed(target) {
  return Boolean(target?.closest?.(".search-field-suggest"));
}

function preventSuggestTouchMove(event) {
  if (isSuggestTouchAllowed(event.target)) {
    return;
  }
  event.preventDefault();
}

function setSuggestScrollLock(locked) {
  const root = document.documentElement;
  const isLocked = document.body.classList.contains("search-field-suggest-open");
  if (locked === isLocked) {
    return;
  }

  if (locked) {
    suggestScrollY = window.scrollY;
    window.scrollTo(0, 0);
    root.classList.add("search-field-suggest-open");
    document.body.classList.add("search-field-suggest-open");
    document.body.style.top = "0";
    document.addEventListener("touchmove", preventSuggestTouchMove, {
      passive: false,
    });
    return;
  }

  root.classList.remove("search-field-suggest-open");
  document.body.classList.remove("search-field-suggest-open");
  document.body.style.top = "";
  document.removeEventListener("touchmove", preventSuggestTouchMove);
  window.scrollTo(0, suggestScrollY);
}

function getActiveSuggestField() {
  if (viewerSearchFields.getDecadeSuggestDraft(searchInput.value)) {
    return viewerSearchFields.getFieldByKey("decade");
  }
  return viewerSearchFields.getActiveDraftField(searchInput.value);
}

function getFieldDraftForSuggest(field) {
  if (field?.key === "decade") {
    return viewerSearchFields.getDecadeSuggestDraft(searchInput.value);
  }
  return viewerSearchFields.parseFieldDraftInput(searchInput.value, field);
}

function getKnownFieldValues(fieldKey) {
  const field = viewerSearchFields.getFieldByKey(fieldKey);
  if (!field) {
    return [];
  }
  const scopeKey = [
    fieldKey,
    typeof getViewWithoutSearchCacheKey === "function"
      ? getViewWithoutSearchCacheKey()
      : "",
    JSON.stringify(
      viewerSearchFields.chipsToFieldTermsPartial(
        searchFilterChips,
        fieldKey,
      ),
    ),
  ].join("|");
  if (knownFieldValuesCache.has(scopeKey)) {
    return knownFieldValuesCache.get(scopeKey);
  }
  const scopedBooks = viewerFilters.filterBooksMatchingFieldTerms(
    getViewBooksWithoutSearch(),
    viewerSearchFields.chipsToFieldTermsPartial(
      searchFilterChips,
      fieldKey,
    ),
  );
  const values = field.collectValues(scopedBooks);
  knownFieldValuesCache.set(scopeKey, values);
  return values;
}

function getSearchFilter() {
  const key = searchStateKey();
  if (key !== cachedSearchFilterKey) {
    cachedSearchFilterKey = key;
    cachedSearchFilter = viewerFilters.buildSearchFilter(
      searchFilterChips,
      searchInput.value,
    );
  }
  return cachedSearchFilter;
}

function hasActiveSearch() {
  if (searchFilterChips.length > 0) {
    return true;
  }
  const draft = searchInput.value.trim();
  if (!draft || viewerFilters.isSearchDraftBlockingText(draft)) {
    return false;
  }
  return searchFilterHasTerms(getSearchFilter());
}

function updateSearchClearVisibility() {
  searchClearBtn.hidden = !hasActiveSearch();
}

function renderNow() {
  if (searchRenderTimer) {
    clearTimeout(searchRenderTimer);
    searchRenderTimer = null;
  }
  render();
}

function debouncedRender() {
  if (searchRenderTimer) {
    clearTimeout(searchRenderTimer);
  }
  searchRenderTimer = setTimeout(() => {
    searchRenderTimer = null;
    render();
  }, 200);
}

function renderSearchChips() {
  if (!searchChips) {
    return;
  }
  searchChips.innerHTML = searchFilterChips
    .map((chip, index) => {
      const field = viewerSearchFields.getFieldByKey(chip.type);
      const safe = viewerCardHtml.escapeHtml(chip.label);
      const ariaPrefix = field?.chipAriaPrefix || chip.type;
      return `<span class="search-field-chip search-field-chip--${chip.type}"><span class="search-field-chip-label">${safe}</span><button type="button" class="search-field-chip-remove" data-search-chip-index="${index}" aria-label="Remove ${ariaPrefix} ${safe}">&times;</button></span>`;
    })
    .join("");
}

function hideSuggest() {
  searchSuggestIndex = -1;
  lastSuggestItems = [];
  searchFieldSuggest.hidden = true;
  searchFieldSuggest.innerHTML = "";
  searchInput.setAttribute("aria-expanded", "false");
  setSuggestScrollLock(false);
}

function updateSuggest() {
  updateSuggestNow();
}

function computeSuggestItems() {
  const field = getActiveSuggestField();
  if (!field) {
    return [];
  }
  const draft = getFieldDraftForSuggest(field);
  if (!draft) {
    return [];
  }
  const exclude = searchFilterChips
    .filter((chip) => chip.type === field.key)
    .map((chip) => chip.label);
  return viewerSearchFields.filterFieldSuggestions(
    draft.partial,
    field,
    getKnownFieldValues(field.key),
    { exclude },
  );
}

function getSuggestItems() {
  return computeSuggestItems();
}

function renderSuggest(field, items) {
  if (!field || !items.length) {
    hideSuggest();
    return;
  }

  searchFieldSuggest.innerHTML = items
    .map((label, index) => {
      const safe = viewerCardHtml.escapeHtml(label);
      const activeClass = index === searchSuggestIndex ? " active" : "";
      return `<li class="search-field-suggest-item search-field-suggest-item--${field.key}${activeClass}" role="option" data-suggest-index="${index}" aria-selected="${index === searchSuggestIndex}">${safe}</li>`;
    })
    .join("");
  searchFieldSuggest.hidden = false;
  searchInput.setAttribute("aria-expanded", "true");
  setSuggestScrollLock(true);
}

function updateSuggestNow() {
  const field = getActiveSuggestField();
  if (!field) {
    lastSuggestItems = [];
    hideSuggest();
    return;
  }
  lastSuggestItems = computeSuggestItems();
  if (searchSuggestIndex >= lastSuggestItems.length) {
    searchSuggestIndex = -1;
  }
  renderSuggest(field, lastSuggestItems);
}

function debouncedUpdateSuggest() {
  if (suggestUpdateTimer) {
    clearTimeout(suggestUpdateTimer);
  }
  suggestUpdateTimer = setTimeout(() => {
    suggestUpdateTimer = null;
    updateSuggestNow();
  }, 120);
}

function addSearchChip(fieldKey, label, options = {}) {
  const field = viewerSearchFields.getFieldByKey(fieldKey);
  if (!field) {
    return false;
  }
  const known = getKnownFieldValues(fieldKey);
  const canonical = field.formatLabel(label, known);
  if (!canonical) {
    return false;
  }
  if (
    searchFilterChips.some(
      (chip) =>
        chip.type === fieldKey &&
        field.labelKey(chip.label) === field.labelKey(canonical),
    )
  ) {
    return false;
  }
  searchFilterChips.push({ type: fieldKey, label: canonical });
  invalidateSearchViewCache();
  renderSearchChips();
  if (!options.silent) {
    updateSearchClearVisibility();
    updateSuggest();
    debouncedRender();
  }
  return true;
}

function removeSearchChipAt(index) {
  if (index < 0 || index >= searchFilterChips.length) {
    return;
  }
  searchFilterChips.splice(index, 1);
  invalidateSearchViewCache();
  renderSearchChips();
  updateSearchClearVisibility();
  updateSuggest();
  renderNow();
}

function absorbSearchInputTokens() {
  const trimmed = searchInput.value.trim();
  const activeField = viewerSearchFields.getActiveDraftField(trimmed);

  if (activeField && activeField.key !== "decade") {
    const draftAbsorbed = viewerSearchFields.absorbFieldDraftInput(
      trimmed,
      activeField,
      getKnownFieldValues(activeField.key),
    );
    if (draftAbsorbed) {
      if (draftAbsorbed.chipLabel) {
        addSearchChip(activeField.key, draftAbsorbed.chipLabel, { silent: true });
      }
      searchInput.value = draftAbsorbed.remainder;
      return;
    }
  }

  const parsed = viewerSearchFields.parseCompoundSearchQuery(searchInput.value);
  const unknownParts = [];

  for (const field of viewerSearchFields.SEARCH_FIELD_TYPES) {
    if (field.key === "decade") {
      continue;
    }
    const known = getKnownFieldValues(field.key);
    for (const term of parsed.fieldTerms[field.key] || []) {
      const label = viewerSearchFields.resolveKnownFieldLabel(
        term,
        field,
        known,
      );
      if (label) {
        addSearchChip(field.key, label, { silent: true });
      } else {
        unknownParts.push(field.formatQuery(term));
      }
    }
  }

  searchInput.value = [...unknownParts, ...parsed.textTerms]
    .join(" ")
    .trim();
}

function pickSuggestion(index) {
  const field = getActiveSuggestField();
  const items = lastSuggestItems.length ? lastSuggestItems : computeSuggestItems();
  const label = items[index];
  if (!field || !label) {
    return;
  }
  const draft = getFieldDraftForSuggest(field);
  const prefix = draft?.prefix?.trim() || "";
  addSearchChip(field.key, label, { silent: true });
  searchInput.value = prefix;
  hideSuggest();
  updateSearchClearVisibility();
  renderNow();
}

function clearSearchState() {
  searchFilterChips.length = 0;
  searchInput.value = "";
  invalidateSearchViewCache();
  renderSearchChips();
  hideSuggest();
  updateSearchClearVisibility();
}

function clearSearchAll() {
  clearSearchState();
  renderNow();
}

function applyFieldSearch(fieldKey, rawValue) {
  const field = viewerSearchFields.getFieldByKey(fieldKey);
  if (!field) {
    return;
  }
  const label = field.formatLabel(rawValue, getKnownFieldValues(fieldKey));
  if (!label) {
    return;
  }

  searchFilterChips.length = 0;
  searchInput.value = "";
  renderSearchChips();
  hideSuggest();
  addSearchChip(fieldKey, label, { silent: true });
  updateSearchClearVisibility();
  closeBookDetail({ programmatic: true });
  renderNow();
  searchInput.blur();
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  });
}

function onSearchInput() {
  invalidateSearchFilterCache();
  updateSearchClearVisibility();
  debouncedUpdateSuggest();
  debouncedRender();
}

function onSearchCommit() {
  absorbSearchInputTokens();
  invalidateSearchFilterCache();
  hideSuggest();
  updateSearchClearVisibility();
  renderNow();
}

searchChips.addEventListener("click", (event) => {
  const button = event.target.closest("[data-search-chip-index]");
  if (!button) {
    return;
  }
  removeSearchChipAt(Number(button.dataset.searchChipIndex));
});

searchFieldSuggest.addEventListener("mousedown", (event) => {
  const item = event.target.closest("[data-suggest-index]");
  if (!item) {
    return;
  }
  event.preventDefault();
  pickSuggestion(Number(item.dataset.suggestIndex));
});

searchInput.addEventListener("keydown", (event) => {
  const suggestOpen =
    lastSuggestItems.length > 0 && !searchFieldSuggest.hidden;
  const items = suggestOpen ? lastSuggestItems : [];
  const activeField = getActiveSuggestField();

  if (event.key === "Backspace" && !searchInput.value && searchFilterChips.length) {
    removeSearchChipAt(searchFilterChips.length - 1);
    return;
  }

  if (event.key === " " && !suggestOpen && activeField && activeField.key !== "decade") {
    const draft = viewerSearchFields.parseFieldDraftInput(
      searchInput.value.trim(),
      activeField,
    );
    if (draft?.partial) {
      const label = viewerSearchFields.resolveKnownFieldLabel(
        draft.partial,
        activeField,
        getKnownFieldValues(activeField.key),
      );
      if (label) {
        event.preventDefault();
        addSearchChip(activeField.key, label, { silent: true });
        searchInput.value = draft.prefix?.trim() || "";
        updateSearchClearVisibility();
        updateSuggest();
        renderNow();
      }
    }
    return;
  }

  if (!suggestOpen) {
    if (event.key === "Escape") {
      hideSuggest();
    }
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    searchSuggestIndex = (searchSuggestIndex + 1) % items.length;
    renderSuggest(getActiveSuggestField(), items);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    searchSuggestIndex =
      searchSuggestIndex <= 0 ? items.length - 1 : searchSuggestIndex - 1;
    renderSuggest(getActiveSuggestField(), items);
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (searchSuggestIndex >= 0) {
      pickSuggestion(searchSuggestIndex);
    } else {
      onSearchCommit();
    }
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    hideSuggest();
  }
});

searchInput.addEventListener("blur", () => {
  window.setTimeout(() => {
    absorbSearchInputTokens();
    hideSuggest();
    updateSearchClearVisibility();
    renderNow();
  }, 120);
});

searchClearBtn.addEventListener("click", () => {
  clearSearchAll();
  searchInput.focus();
});

searchInput.addEventListener("input", onSearchInput);
searchInput.addEventListener("search", onSearchCommit);
searchInput.addEventListener("change", onSearchCommit);

document.addEventListener("click", (event) => {
  if (
    !searchFieldSuggest.hidden &&
    !event.target.closest(".search-wrap")
  ) {
    hideSuggest();
  }
});


/* Sort, search, filters, and visible book list */

let prefilteredCache = { key: null, books: null };
let sortedActiveCache = { key: null, books: null };
let lastStatsRenderSignature = null;

function getCatalogFilterCacheKey() {
  return [
    hiddenOnly,
    showMagazines,
    mycroftFilterMode,
    collectionFilterMode,
    wantFilterMode,
    collectionIds.size,
    orderedIds.size,
    wantIds.size,
  ].join(":");
}

function invalidateSortedCache() {
  prefilteredCache.key = null;
  prefilteredCache.books = null;
  sortedActiveCache.key = null;
  sortedActiveCache.books = null;
  if (typeof invalidateSearchViewCache === "function") {
    invalidateSearchViewCache();
  }
}

function compareOrderTiebreak(a, b) {
  return viewerSort.compareOrderTiebreak(a, b, bookOrderIndex);
}

function compareCanonical(a, b) {
  return viewerSort.compareCanonical(a, b, bookOrderIndex);
}

function getPrefilteredBooks() {
  const cacheKey = getCatalogFilterCacheKey();
  if (prefilteredCache.key === cacheKey && prefilteredCache.books) {
    return prefilteredCache.books;
  }
  const books = viewerFilters.filterBooksByCatalogFilters(getActiveBooks(), {
    hiddenOnly,
    showMagazines,
    mycroftFilterMode,
    collectionFilterMode,
    wantFilterMode,
    collectedIds: activeCollectionIds(),
    orderedIds,
    wantIds,
  });
  prefilteredCache.key = cacheKey;
  prefilteredCache.books = books;
  return books;
}

function getSortedActiveBooksCacheKey() {
  return `${getCatalogFilterCacheKey()}:${getCatalogSortMode()}`;
}

function getSortedActiveBooks() {
  const cacheKey = getSortedActiveBooksCacheKey();
  if (sortedActiveCache.key === cacheKey && sortedActiveCache.books) {
    return sortedActiveCache.books;
  }
  const source = getPrefilteredBooks();
  let sorted;
  if (viewerWantView.usesWantPrioritySort(wantFilterMode)) {
    sorted = viewerWantOrder.sortBooksByWantOrder(
      source,
      wantOrderIds,
      bookOrderIndex,
    );
  } else {
    sorted = sortBooks(source, getCatalogSortMode());
  }
  sortedActiveCache.key = cacheKey;
  sortedActiveCache.books = sorted;
  return sorted;
}

function getCatalogSortMode() {
  return catalogSortMode;
}

function syncSortReverseButton(mode) {
  if (!sortReverseBtn) {
    return;
  }
  const descending = viewerSort.isSortDescending(mode);
  const field = viewerSort.getSortField(mode);
  sortReverseBtn.classList.toggle("is-descending", descending);
  sortReverseBtn.classList.toggle("is-ascending", !descending);
  sortReverseBtn.classList.toggle(
    "is-newest-first",
    field === "date" && descending,
  );
  const directionLabel = viewerSort.sortDirectionLabel(field, descending);
  sortReverseBtn.title = `${directionLabel} · click to reverse`;
  sortReverseBtn.setAttribute(
    "aria-label",
    `Sort order: ${directionLabel}. Reverse.`,
  );
}

function syncSortControlFromMode(mode) {
  const normalized = viewerSort.normalizeSort(mode);
  catalogSortMode = normalized;
  if (sortSelect) {
    sortSelect.value = viewerSort.getSortField(normalized);
  }
  syncSortReverseButton(normalized);
}

function setCatalogSortMode(mode) {
  const next = viewerSort.normalizeSort(mode);
  if (next === catalogSortMode) {
    syncSortReverseButton(next);
    return;
  }
  catalogSortMode = next;
  syncSortControlFromMode(next);
  invalidateSortedCache();
  saveUserState();
  render();
}

function onSortFieldChange() {
  if (sortSelect.disabled) {
    return;
  }
  setCatalogSortMode(
    viewerSort.sortModeForField(sortSelect.value, catalogSortMode),
  );
}

function toggleSortOrder() {
  if (sortSelect.disabled) {
    return;
  }
  setCatalogSortMode(viewerSort.toggleSortDirection(catalogSortMode));
  sortReverseBtn?.blur();
}

function onSortChange() {
  onSortFieldChange();
}

function sortBooks(list, mode) {
  return viewerSort.sortBooks(list, mode, bookOrderIndex);
}

function matchesSearch(book, query) {
  return viewerFilters.matchesSearch(book, query);
}

let wantOrderLockJiggleTimer = null;

function toggleWantOrderLock() {
  wantOrderLocked = !wantOrderLocked;
  saveUserState();
  updateSortControlState();
  render();
}

function jiggleWantOrderLock() {
  const lockIcon = sortWantBadge?.querySelector(".sort-want-badge-lock");
  if (lockIcon) {
    lockIcon.classList.remove("is-jiggling");
    void lockIcon.offsetWidth;
    lockIcon.classList.add("is-jiggling");
  }
  if (sortWantBadge) {
    sortWantBadge.classList.remove("is-locked-drag-denied");
    void sortWantBadge.offsetWidth;
    sortWantBadge.classList.add("is-locked-drag-denied");
  }
  clearTimeout(wantOrderLockJiggleTimer);
  wantOrderLockJiggleTimer = setTimeout(() => {
    lockIcon?.classList.remove("is-jiggling");
    sortWantBadge?.classList.remove("is-locked-drag-denied");
  }, 750);
}

function updateSortControlState() {
  const wantSort = viewerWantView.shouldDisableCatalogSort(wantFilterMode);
  if (sortSelect) {
    sortSelect.disabled = wantSort;
    sortSelect.classList.toggle("is-sort-slot-hidden", wantSort);
    sortSelect.setAttribute("aria-hidden", String(wantSort));
  }
  if (sortReverseBtn) {
    sortReverseBtn.hidden = wantSort;
    sortReverseBtn.disabled = wantSort;
    sortReverseBtn.setAttribute("aria-hidden", String(wantSort));
  }
  if (!wantSort) {
    syncSortControlFromMode(catalogSortMode);
  }
  if (sortWantBadge) {
    sortWantBadge.hidden = !wantSort;
    sortWantBadge.classList.toggle("is-sort-slot-hidden", !wantSort);
    sortWantBadge.setAttribute("aria-hidden", String(!wantSort));
    const badgeText = sortWantBadge.querySelector(".sort-want-badge-text");
    if (badgeText) {
      badgeText.textContent = wantOrderLocked
        ? "sorting locked"
        : "sorting unlocked";
    }
    sortWantBadge.classList.toggle("is-want-sort-locked", wantOrderLocked);
    sortWantBadge.classList.toggle("is-want-sort-unlocked", !wantOrderLocked);
    sortWantBadge.setAttribute("aria-pressed", String(wantOrderLocked));
    const listHint =
      gridViewMode === "list" && !hasActiveSearch() && !wantOrderLocked
        ? " Drag rank tabs to reorder."
        : gridViewMode === "cards" && !hasActiveSearch() && !wantOrderLocked
          ? " Drag rank chips to reorder."
          : wantOrderLocked
            ? " Tap to unlock and reorder."
            : " Tap to lock order.";
    const lockLabel = wantOrderLocked
      ? "Want sorting locked"
      : "Want sorting unlocked";
    sortWantBadge.setAttribute(
      "aria-label",
      `${lockLabel}.${listHint}`,
    );
    sortWantBadge.title = wantOrderLocked
      ? "Tap to unlock want list order"
      : "Tap to lock want list order";
  }
  document.body.classList.toggle(
    "want-order-locked",
    wantSort && wantOrderLocked,
  );
  if (sortControlWrap) {
    sortControlWrap.classList.toggle("sort-control-want-order", wantSort);
  }
}

if (sortWantBadge) {
  sortWantBadge.addEventListener("click", (event) => {
    event.preventDefault();
    toggleWantOrderLock();
  });
}

function renderWantFilterButton() {
  const active = isWantFilterActive();
  const classes = [
    "stat",
    "want-stat",
    "stat-toggle",
    active ? "active" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const ariaLabel = active
    ? "Viewing want list — tap to show all books"
    : "Filter to want list";
  return `<button type="button" class="${classes}" id="want-filter-toggle" aria-pressed="${active}" aria-label="${ariaLabel}">WANT</button>`;
}

function getStatTotal(activeBooks) {
  if (hiddenOnly) {
    return activeBooks.filter((book) => book.hidden).length;
  }
  return activeBooks
    .filter((book) => passesBookVisibility(book))
    .filter((book) => passesMycroftImprintFilter(book))
    .length;
}

function buildStatsRenderSignature(visible, activeBooks) {
  const hiddenCount = activeBooks.filter((book) => book.hidden).length;
  const total = getStatTotal(activeBooks);
  const hasMycroft = activeBooks.some(
    (book) => book.imprint === "mycroft_moran",
  );
  return [
    visible.length,
    total,
    hiddenCount,
    hasMycroft ? 1 : 0,
    isMycroftOnlyFilter() ? 1 : 0,
    isMycroftHiddenFilter() ? 1 : 0,
    isCollectionAllFilter() ? 1 : 0,
    isOrderedFilterActive() ? 1 : 0,
    isWantFilterActive() ? 1 : 0,
    hiddenOnly ? 1 : 0,
    viewerMode.shouldShowHiddenStatFilter(serveEnabled, hiddenCount) ? 1 : 0,
  ].join(":");
}

function renderStats(visible, all) {
  const activeBooks = all.filter((book) => !isDeleted(book));
  const signature = buildStatsRenderSignature(visible, activeBooks);
  if (signature === lastStatsRenderSignature) {
    return;
  }
  lastStatsRenderSignature = signature;

  const hiddenCount = activeBooks.filter((book) => book.hidden).length;
  const total = getStatTotal(activeBooks);
  const showingCount = visible.length;
  const hasMycroft = activeBooks.some(
    (book) => book.imprint === "mycroft_moran",
  );
  const mycroftToggleClass = [
    "stat",
    "mycroft-stat",
    "stat-toggle",
    isMycroftOnlyFilter() ? "active" : "",
    isMycroftHiddenFilter() ? "excluded" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const collectionToggleClass = [
    "stat",
    "owned-stat",
    "stat-toggle",
    isCollectionAllFilter() ? "active" : "",
    isOrderedFilterActive() ? "ordered-filter" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const collectionToggleLabel = isOrderedFilterActive() ? "ORDERED" : "COLLECTION";
  const filters = [
    `<button type="button" class="${collectionToggleClass}" id="collection-filter-toggle" aria-pressed="${isCollectionFilterActive()}">${collectionToggleLabel}</button>`,
    hasMycroft
      ? `<button type="button" class="${mycroftToggleClass}" id="mycroft-filter-toggle" aria-pressed="${isMycroftOnlyFilter()}"><span class="mycroft-stat-label">MYCROFT &amp; MORAN</span></button>`
      : "",
    renderWantFilterButton(),
    hiddenCount && viewerMode.shouldShowHiddenStatFilter(serveEnabled, hiddenCount)
      ? `<button type="button" class="stat hidden-stat stat-toggle${hiddenOnly ? " active" : ""}" id="hidden-filter-toggle" aria-pressed="${hiddenOnly}">HIDDEN</button>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  stats.innerHTML = `
    <div class="stats-filters${hasMycroft ? "" : " stats-filters--two"}">${filters}</div>
    <p class="stat-showing">Showing ${showingCount} of ${total}</p>
  `;
}

function getViewBooksWithoutSearch() {
  return getSortedActiveBooks();
}

function getVisibleBooks() {
  return viewerFilters.filterBooksBySearch(
    getSortedActiveBooks(),
    getSearchFilter(),
  );
}


/* Covers, cards, stats, and main grid render */

let wantDisplayRankById = null;
let lastGridRenderSignature = null;
let showWantRankControlsForRender = false;
let lastPageSubtitleText = null;

const coverZoomLensIcon = `
<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
  <circle cx="8.5" cy="8.5" r="4.75" stroke="currentColor" stroke-width="1.5" />
  <path d="M12.5 12.5 16 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
</svg>`;

function renderCover(book, cacheKey, variant = "card") {
  const coverPath = viewerCovers.getCoverPath(book, variant);
  if (!coverPath) {
    return `<div class="placeholder">No cover image</div>`;
  }

  const resolvedCacheKey =
    variant === "list" ? viewerListCrop.getListCoverCacheKey(book) : cacheKey;
  const src = viewerCovers.appendCoverCacheKey(coverPath, resolvedCacheKey);
  const title = viewerCardHtml.escapeHtml(book.title || "this book");
  let imgAttrs = "";
  if (variant === "list") {
    const presentation = viewerListCrop.getListCoverImagePresentation(book);
    const styleAttr = presentation.style ? ` style="${presentation.style}"` : "";
    const bookIdAttr =
      presentation.className === "cover-list-focal"
        ? ` data-book-id="${book.id}"`
        : "";
    imgAttrs = ` class="${presentation.className}"${bookIdAttr}${styleAttr}`;
  }
  const imgHtml = `<img${imgAttrs} src="${src}" alt="Cover of ${title}" loading="lazy" onerror="onCoverImageError(this)">`;

  if (variant !== "detail") {
    return imgHtml;
  }

  return `
    <button
      type="button"
      class="cover-zoom-trigger"
      data-book-id="${book.id}"
      aria-label="View cover of ${title} larger"
    >
      ${imgHtml}
      <span class="cover-zoom-lens">${coverZoomLensIcon}</span>
    </button>`;
}

const editIcon = `
<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
  <path d="M12.1 3.9 16.1 7.9 7.4 16.6 3.4 12.6 12.1 3.9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M10.8 5.2 14.8 9.2" stroke="currentColor" stroke-width="1.5"/>
</svg>
    `;

function isViewingOnDevServer() {
  return viewerMode.shouldRenderDetailEditButton({
    readOnly,
    protocol: window.location.protocol,
  });
}

function renderEditButton(book, className = "edit-book-btn") {
  if (!viewerMode.shouldRenderCardEditButton(serveEnabled)) {
    return "";
  }

  return `
  <button
    type="button"
    class="${className} edit-book-btn"
    data-book-id="${book.id}"
    aria-label="Edit ${book.title || "this book"}"
    title="Edit book"
  >${editIcon}</button>
`;
}

function renderDetailEditButton(book) {
  if (!isViewingOnDevServer()) {
    return "";
  }

  const title = serveEnabled
    ? "Edit book"
    : "Edit book (waiting for server…)";

  return `
  <button
    type="button"
    class="book-detail-edit-btn"
    data-book-id="${book.id}"
    aria-label="Edit ${book.title || "this book"}"
    title="${title}"
    ${serveEnabled ? "" : "disabled"}
  >${editIcon}</button>
`;
}

function refreshDetailToolbar(book) {
  if (!book) {
    return;
  }

  if (bookDetailImprint) {
    bookDetailImprint.innerHTML = viewerCardHtml.renderImprintBadge(book, "detail");
  }

  if (bookDetailToolbarStart) {
    bookDetailToolbarStart
      .querySelectorAll(".book-detail-edit-btn")
      .forEach((element) => element.remove());
    const editBtn = renderDetailEditButton(book);
    if (editBtn) {
      bookDetailToolbarStart.insertAdjacentHTML("beforeend", editBtn);
    }
  }
}

function refreshDetailToolbarIfOpen() {
  if (bookDetailDialog.hidden || !detailBookId) {
    return;
  }

  const book = books.find((entry) => entry.id === detailBookId);
  refreshDetailToolbar(book);
}

const hideIcon = `
<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
  <path d="M3.5 10s2.2-4.5 6.5-4.5S16.5 10 16.5 10s-2.2 4.5-6.5 4.5S3.5 10 3.5 10Z" stroke="currentColor" stroke-width="1.5"/>
  <circle cx="10" cy="10" r="1.75" stroke="currentColor" stroke-width="1.5"/>
  <path d="M4 4 16 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>
    `;

function getGoodreadsLinkForBook(book) {
  const savedUrl = resolveGoodreadsUrl(book);
  if (savedUrl) {
    return { url: savedUrl, search: false };
  }
  const searchUrl = viewerCardHtml.getGoodreadsSearchUrl(book);
  if (!searchUrl) {
    return null;
  }
  return { url: searchUrl, search: true };
}

function renderBookDescriptionHtml(book) {
  const description = getBookDescription(book);
  if (!description?.trim()) {
    return "";
  }
  return `<div class="book-detail-description">${viewerCardHtml.escapeHtml(description)}</div>`;
}

const unhideIcon = `
<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
  <path d="M3.5 10s2.2-4.5 6.5-4.5S16.5 10 16.5 10s-2.2 4.5-6.5 4.5S3.5 10 3.5 10Z" stroke="currentColor" stroke-width="1.5"/>
  <circle cx="10" cy="10" r="1.75" stroke="currentColor" stroke-width="1.5"/>
</svg>
    `;

function renderHideButton(book) {
  if (!serveEnabled) {
    return "";
  }

  const isHidden = Boolean(book.hidden);
  return `
  <button
    type="button"
    class="hide-book-btn"
    data-book-id="${book.id}"
    data-hidden="${isHidden ? "true" : "false"}"
    aria-label="${isHidden ? "Unhide" : "Hide"} ${book.title || "this book"}"
    title="${isHidden ? "Unhide book" : "Hide book"}"
  >${isHidden ? unhideIcon : hideIcon}</button>
`;
}

function renderCardWantBadge(book) {
  if (isInCollection(book) || !isWanted(book) || isWantFilterActive()) {
    return "";
  }

  return `<span class="want-btn active want-badge">Wanted</span>`;
}

function renderCollectionButton(book) {
  const collected = isCollected(book);
  const ordered = isOrdered(book);
  const label = collected ? "Collection" : ordered ? "Ordered" : "Collect";
  const active = collected || ordered;
  const className = `collection-btn${active ? " active" : ""}`;

  return `
  <button
    type="button"
    class="${className}"
    data-book-id="${book.id}"
    aria-pressed="${active}"
  >${label}</button>
`;
}

function renderOwnedBadge(book) {
  const owned = getCollectionItem(book);
  if (!owned) {
    return "";
  }

  const isOrder = owned.status === "order";
  if (
    gridViewMode === "list" &&
    isCollectionFilterActive() &&
    (isOrderedFilterActive() || !isOrder)
  ) {
    return "";
  }

  const label = isOrder ? "Ordered" : "Collection";
  const className = isOrder ? "owned-badge owned-badge--ordered" : "owned-badge";

  return `<span class="${className}">${label}</span>`;
}

function renderWantButton(book) {
  if (isInCollection(book)) {
    return "";
  }

  const wanted = isWanted(book);
  const label = wanted ? "Wanted" : "Want";
  const className = `want-btn${wanted ? " active" : ""}`;

  return `
  <button
    type="button"
    class="${className}"
    data-book-id="${book.id}"
    aria-pressed="${wanted}"
  >${label}</button>
`;
}

function renderCardBottomRow(
  imprintBadge,
  wantBadge,
  linkButtons,
  ownedBadge,
) {
  const left = [imprintBadge, linkButtons].filter(Boolean).join("");
  const right = [wantBadge, ownedBadge].filter(Boolean).join("");

  return `
  <div class="card-bottom-row">
    <div class="card-bottom-left">${left}</div>
    <div class="card-bottom-right">${right}</div>
  </div>
`;
}

function renderCoverActions(book) {
  return `${renderHideButton(book)}${renderEditButton(book)}`;
}

function resolveGoodreadsUrl(book) {
  const key = String(book.id);
  const edit = window.BOOK_EDITS?.[key];
  if (
    edit != null &&
    Object.prototype.hasOwnProperty.call(edit, "goodreadsUrl")
  ) {
    const fromEdit = (edit.goodreadsUrl || "").trim();
    return fromEdit || null;
  }
  const fromData = (book.goodreadsUrl || "").trim();
  return fromData || null;
}

window.onCoverImageError = function (img) {
  img.replaceWith(
    Object.assign(document.createElement("div"), {
      className: "placeholder",
      textContent: "No cover image",
    }),
  );
};

function layoutListCoverPreviewImage(img) {
  const bookId = Number(img.dataset.bookId);
  const book = books.find((entry) => entry.id === bookId);
  const wrap = img.closest(".cover-wrap");
  if (!book || !wrap || !img.naturalWidth) {
    return;
  }

  const { x, y } = viewerListCrop.resolveListCoverFocus(book);
  const layout = viewerListCrop.computeListCoverPreviewLayout(
    img.naturalWidth,
    img.naturalHeight,
    x,
    y,
    wrap.clientWidth,
    wrap.clientHeight,
  );
  if (!layout) {
    return;
  }

  img.style.width = `${layout.width}px`;
  img.style.height = `${layout.height}px`;
  img.style.left = `${layout.left}px`;
  img.style.top = `${layout.top}px`;
}

function layoutListCoverPreviews() {
  if (gridViewMode !== "list") {
    return;
  }

  grid.querySelectorAll("img.cover-list-focal[data-book-id]").forEach((img) => {
    if (img.complete && img.naturalWidth) {
      layoutListCoverPreviewImage(img);
      return;
    }
    img.addEventListener("load", () => layoutListCoverPreviewImage(img), {
      once: true,
    });
  });
}

let listCoverPreviewObserver = null;
let listCoverLayoutRaf = null;

function scheduleListCoverLayout() {
  if (listCoverLayoutRaf != null) {
    return;
  }
  listCoverLayoutRaf = requestAnimationFrame(() => {
    listCoverLayoutRaf = null;
    layoutListCoverPreviews();
  });
}

function ensureListCoverPreviewObserver() {
  if (listCoverPreviewObserver) {
    return;
  }
  listCoverPreviewObserver = new ResizeObserver(() => {
    scheduleListCoverLayout();
  });
  listCoverPreviewObserver.observe(grid);
}

function canShowWantRankControls() {
  return showWantRankControlsForRender;
}

function bookCardRenderToken(book, rank) {
  const highlightCollection = shouldHighlightCollectionOnCards();
  return [
    book.id,
    book.coverCacheKey || "",
    book.hidden ? 1 : 0,
    highlightCollection && isOrdered(book) ? 1 : 0,
    highlightCollection && isCollected(book) ? 1 : 0,
    isWanted(book) && shouldHighlightWantsOnCards() ? 1 : 0,
    rank ?? "",
  ].join(":");
}

function buildGridRenderSignature(visible, showWantRank, rankById) {
  return [
    gridViewMode,
    readOnly,
    serveEnabled,
    shouldHighlightCollectionOnCards(),
    shouldHighlightWantsOnCards(),
    isWantFilterActive(),
    showWantRank,
    visible
      .map((book) =>
        bookCardRenderToken(book, rankById?.get(Number(book.id))),
      )
      .join("|"),
  ].join(";");
}

function updateGridHtml(nextSignature, html) {
  if (nextSignature === lastGridRenderSignature) {
    return false;
  }
  lastGridRenderSignature = nextSignature;
  grid.innerHTML = html;
  scheduleListCoverLayout();
  return true;
}

function renderWantRankListHandle(book) {
  if (!canShowWantRankControls() || gridViewMode !== "list") {
    return "";
  }
  const rank = wantDisplayRankById?.get(Number(book.id));
  if (!rank) {
    return "";
  }
  return `<span
    class="want-rank-drag-handle"
    aria-label="Drag to reorder — rank ${rank}"
    role="button"
    tabindex="0"
    data-book-id="${book.id}"
  >${rank}</span>`;
}

function renderWantRankCardChip(book) {
  if (!canShowWantRankControls() || gridViewMode === "list") {
    return "";
  }
  const rank = wantDisplayRankById?.get(Number(book.id));
  if (!rank) {
    return "";
  }
  return `<span
    class="want-rank-drag-handle want-rank-card-chip"
    aria-label="Drag to reorder — rank ${rank}"
    role="button"
    tabindex="0"
    data-book-id="${book.id}"
  >${rank}</span>`;
}

function renderCard(book) {
  let collectionClass = "";
  if (shouldHighlightCollectionOnCards()) {
    if (isOrdered(book)) {
      collectionClass = " ordered";
    } else if (isCollected(book)) {
      collectionClass = " owned";
    }
  }
  const hiddenClass = book.hidden ? " hidden-book" : "";
  const listMode = gridViewMode === "list";
  const coverVariant = listMode ? "list" : "card";
  const imageHtml = renderCover(book, book.coverCacheKey, coverVariant);
  const coverActions = renderCoverActions(book);
  const listHandle = renderWantRankListHandle(book);
  const cardChip = renderWantRankCardChip(book);

  const imprintBadge = viewerCardHtml.renderImprintBadge(book, "card");
  const wantBadge = renderCardWantBadge(book);
  const ownedBadge = renderOwnedBadge(book);
  const hideCardMeta = isWantFilterActive() && !listMode;
  const bottomRow = renderCardBottomRow(
    listMode ? "" : imprintBadge,
    wantBadge,
    "",
    ownedBadge,
  );
  const listPrimaryHtml = listMode
    ? `<div class="card-list-primary">
          <h2 class="title">${book.title || "Untitled"}</h2>
          <div class="card-list-meta">
            ${book.publicationDate ? `<div class="date">${book.publicationDate}</div>` : ""}
            ${imprintBadge}
          </div>
        </div>`
    : `<div class="card-list-primary">
          <h2 class="title">${book.title || "Untitled"}</h2>
          ${book.publicationDate ? `<div class="date">${book.publicationDate}</div>` : ""}
        </div>`;

  const hiddenBadge = book.hidden
    ? `<span class="hidden-badge">Hidden</span>`
    : "";

  const wantedClass =
    isWanted(book) && shouldHighlightWantsOnCards() ? " wanted" : "";

  const cardMarkup = `
  <article class="card${collectionClass}${wantedClass}${hiddenClass}" data-book-id="${book.id}">
    <div class="cover-wrap">
      ${coverActions}
      ${imageHtml}
    </div>
    <div class="card-body">
      ${hiddenBadge}
      <div class="card-list-head">
        ${listPrimaryHtml}
      </div>
      ${hideCardMeta ? "" : viewerCardHtml.renderBookMetaHtml(book)}
      ${bottomRow}
      ${cardChip}
    </div>
  </article>`;

  if (listHandle) {
    return `<div class="want-rank-row">${cardMarkup}${listHandle}</div>`;
  }

  if (cardChip) {
    return `<div class="want-rank-row want-rank-row--card">${cardMarkup}</div>`;
  }

  return cardMarkup;
}

function updateHeaderLogo() {
  if (headerLogo) {
    headerLogo.src = isMycroftOnlyFilter() ? LOGO_MYCROFT : LOGO_ARKHAM;
  }
  const title = isMycroftOnlyFilter() ? "Mycroft & Moran" : "Arkham House";
  if (pageTitle) {
    pageTitle.textContent = title;
  }
  document.title = title;
}

function isWantViewExclusive() {
  return (
    isWantFilterActive() &&
    !isCollectionFilterActive() &&
    !hiddenOnly &&
    !isMycroftOnlyFilter()
  );
}

function render() {
  const activeBooks = getActiveBooks();
  const visible = getVisibleBooks();

  if (!bookDetailDialog.hidden && detailBookId) {
    const detailBook = books.find((entry) => entry.id === detailBookId);
    if (detailBook && !passesMycroftImprintFilter(detailBook)) {
      closeBookDetail({ programmatic: true });
    }
  }

  if (collectionFilterMode === "ordered" && !hasAnyOrderedBooks()) {
    collectionFilterMode = null;
  }

  if (isWantFilterActive() && wantIds.size === 0) {
    wantFilterMode = null;
  }

  updateHeaderLogo();
  updateViewModeState();
  updateHeaderFiltersState();
  updateSortControlState();
  const wantRankDragInProgress =
    typeof isWantRankDragActive === "function" && isWantRankDragActive();
  if (!wantRankDragInProgress && typeof clearWantRankDragState === "function") {
    clearWantRankDragState();
  }
  document.body.classList.toggle(
    "viewing-collection",
    isCollectionFilterActive() && !hiddenOnly && !isMycroftOnlyFilter() && !isWantFilterActive(),
  );
  document.body.classList.toggle(
    "viewing-hidden",
    hiddenOnly && !isCollectionFilterActive() && !isMycroftOnlyFilter() && !isWantFilterActive(),
  );
  document.body.classList.toggle("viewing-want", isWantViewExclusive());
  document.body.classList.toggle("viewing-want-filter", isWantFilterActive());
  document.body.classList.toggle("viewing-mycroft-hidden", isMycroftHiddenFilter());
  const activeSearch = hasActiveSearch();
  if (pageSubtitle) {
    let subtitleText =
      "A publishing house of horror and weird fiction—founded in 1939 to rescue Lovecraft from the pulps.";
    if (isCollectionAllFilter() && hiddenOnly) {
      subtitleText =
        "Viewing hidden books in your collection — click a stat again to show all books";
    } else if (isCollectionAllFilter()) {
      subtitleText = hasAnyOrderedBooks()
        ? "Viewing your collection — click again for on-order only"
        : "Viewing your collection — click the stat again to show all books";
    } else if (isOrderedFilterActive()) {
      subtitleText =
        "Viewing on-order titles only — click the stat again to show all books";
    } else if (hiddenOnly) {
      subtitleText =
        "Viewing hidden books — click the stat again to show all books";
    } else if (isMycroftOnlyFilter()) {
      subtitleText =
        "An imprint for weird detective fiction—founded in 1945 to house August Derleth's Solar Pons.";
    } else if (isMycroftHiddenFilter()) {
      subtitleText =
        "Mycroft & Moran titles hidden — click the stat again to show all books";
    } else if (isWantFilterActive() && isWantViewExclusive()) {
      subtitleText = activeSearch
        ? "Search narrows your want list — clear search to reorder"
        : gridViewMode === "list"
          ? "Your want list — drag rank tabs to reorder; tap WANT to show all books"
          : "Your want list — drag rank chips to reorder; tap WANT to show all books";
    }
    if (subtitleText !== lastPageSubtitleText) {
      pageSubtitle.textContent = subtitleText;
      lastPageSubtitleText = subtitleText;
    }
  }

  renderStats(visible, activeBooks);

  showWantRankControlsForRender = viewerWantView.shouldShowWantRankHandles(
    wantFilterMode,
    gridViewMode,
    activeSearch,
  );

  if (wantRankDragInProgress) {
    syncSettingsHighlightCheckboxes();
    return;
  }

  if (!visible.length) {
    let message = "No books match your search.";
    if (isCollectionAllFilter()) {
      message = activeSearch
        ? "No books in your collection match your search."
        : "Your collection is empty — open a book and tap Collect to add it.";
    } else if (isOrderedFilterActive()) {
      message = activeSearch
        ? "No on-order books match your search."
        : "No on-order books to show.";
    } else if (hiddenOnly) {
      message = activeSearch
        ? "No hidden books match your search."
        : "No hidden books to show.";
    } else if (isMycroftOnlyFilter()) {
      message = activeSearch
        ? "No Mycroft & Moran books match your search."
        : "No Mycroft & Moran books to show.";
    } else if (isWantFilterActive()) {
      message = activeSearch
        ? "No wanted books match your search."
        : "Your want list is empty — open a book and tap Want to add it.";
    }
    updateGridHtml(`empty:${message}`, `<div class="empty">${message}</div>`);
    wantDisplayRankById = null;
    if (!bookDetailDialog.hidden && detailBookId) {
      updateDetailNav();
    }
    syncSettingsHighlightCheckboxes();
    return;
  }

  wantDisplayRankById = showWantRankControlsForRender
    ? viewerWantOrder.buildWantDisplayRankById(
        wantOrderIds,
        visible.map((book) => book.id),
      )
    : null;

  const gridSignature = buildGridRenderSignature(
    visible,
    showWantRankControlsForRender,
    wantDisplayRankById,
  );
  updateGridHtml(gridSignature, visible.map(renderCard).join(""));

  if (!bookDetailDialog.hidden && detailBookId) {
    const detailBook = books.find((entry) => entry.id === detailBookId);
    refreshDetailToolbar(detailBook);
    updateDetailNav();
  }

  syncSettingsHighlightCheckboxes();

  if (typeof syncFilterUrlFromState === "function") {
    syncFilterUrlFromState({ replace: true });
  }
}


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


/* Edit dialog and dev-server PATCH / DELETE API */


async function deleteBook() {
  if (!editingBookId) {
    return;
  }

  const book = books.find((entry) => entry.id === editingBookId);
  const title = book?.title || "this book";
  const confirmed = window.confirm(
    `Remove "${title}" from the gallery? It will disappear everywhere, even with "Show hidden" on localhost. Scraped data is unchanged.`,
  );
  if (!confirmed) {
    return;
  }

  editDeleteBtn.disabled = true;
  editSaveBtn.disabled = true;

  try {
    const response = await fetch(`/api/books/${editingBookId}`, {
      method: "DELETE",
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not delete book");
    }

          if (book) {
            book.deleted = true;
          }
          invalidateSortedCache();

          if (detailBookId === editingBookId) {
      closeBookDetail({ programmatic: true });
    }

    closeEditDialog();
    render();
  } catch (error) {
    console.error(error);
    window.alert(`Could not delete book: ${error.message}`);
  } finally {
    editDeleteBtn.disabled = false;
    editSaveBtn.disabled = false;
  }
}

function applyEditResponseToBook(bookId, payload) {
  const book = books.find((entry) => entry.id === bookId);
  if (!book) {
    return;
  }

  book.title = payload.title;
  book.author = payload.author;
  book.coverArtist = payload.coverArtist;
  book.publicationDate = payload.publicationDate;
  book.decade =
    payload.decade ?? decadeFromYear(parseYear(book.publicationDate));
  book.wikipediaUrl = payload.wikipediaUrl;
  book.goodreadsUrl = payload.goodreadsUrl;
  if (Object.prototype.hasOwnProperty.call(payload, "description")) {
    book.description = payload.description || null;
  }
  if (payload.coverImageFile) {
    book.coverImageFile = payload.coverImageFile;
    book.coverCacheKey = Date.now();
  }
  if (Object.prototype.hasOwnProperty.call(payload, "listCoverFocusX")) {
    book.listCoverFocusX = payload.listCoverFocusX;
  } else {
    delete book.listCoverFocusX;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "listCoverFocusY")) {
    book.listCoverFocusY = payload.listCoverFocusY;
  } else {
    delete book.listCoverFocusY;
  }
  const key = String(bookId);
  const storedEdit = payload.edit || {};
  book.hidden = storedEdit.hidden === true;
  book.deleted = storedEdit.deleted === true;
  if (Object.keys(storedEdit).length) {
    window.BOOK_EDITS[key] = { ...storedEdit };
  } else {
    delete window.BOOK_EDITS[key];
  }

  prepareBookSearchIndex(book);
  invalidateSortedCache();
}

async function saveBookEdits(event) {
  event.preventDefault();
  if (!editingBookId) {
    return;
  }

  editSaveBtn.disabled = true;

  if (serveEnabled && !serveEditDeltas) {
    window.alert(
      "Restart npm run serve so edits save only changed fields (not the whole form).",
    );
    editSaveBtn.disabled = false;
    return;
  }

  try {
    const formData = new FormData();
    formData.append("title", sanitizeSingleLineText(editTitleInput.value));
    formData.append("author", sanitizeSingleLineText(editAuthorInput.value));
    formData.append(
      "coverArtist",
      sanitizeSingleLineText(editCoverArtistInput.value),
    );
    formData.append(
      "publicationDate",
      sanitizeSingleLineText(editPublicationDateInput.value),
    );
    formData.append(
      "wikipediaUrl",
      sanitizeUrlInput(editWikipediaUrlInput.value),
    );
    formData.append(
      "goodreadsUrl",
      sanitizeGoodreadsUrlInput(editGoodreadsUrlInput.value),
    );
    formData.append(
      "description",
      htmlToPlainText(editDescriptionInput.value),
    );
    if (editCoverFileInput.files?.[0]) {
      formData.append("cover", editCoverFileInput.files[0]);
    }
    appendListCoverFocusToFormData(formData);

    const response = await fetch(`/api/books/${editingBookId}`, {
      method: "PATCH",
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not save book");
    }

    applyEditResponseToBook(editingBookId, payload);

    const savedBookId = editingBookId;
    closeEditDialog();
    render();
    if (detailBookId === savedBookId) {
      openBookDetail(savedBookId, { historyMode: "none" });
    }
  } catch (error) {
    console.error(error);
    window.alert(`Could not save book: ${error.message}`);
  } finally {
    editSaveBtn.disabled = false;
  }
}

async function setBookHidden(bookId, hidden) {
  const button = grid.querySelector(
    `.hide-book-btn[data-book-id="${bookId}"]`,
  );
  if (button) {
    button.disabled = true;
  }

  try {
    const response = await fetch(`/api/books/${bookId}/hidden`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not update book");
    }

    applyEditResponseToBook(bookId, payload);
    render();
  } catch (error) {
    console.error(error);
    window.alert(`Could not update book: ${error.message}`);
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}


/* Tag editing in the dev-server edit dialog */

let editTagSuggestIndex = -1;

function normalizeTagInput(rawTag) {
  return viewerTags.normalizeTag(rawTag) || "";
}

function getAllKnownTags() {
  return viewerTags.collectAllKnownTags(window.BOOK_TAGS || {});
}

function getEditingBookTags() {
  if (!editingBookId) {
    return [];
  }
  const book = books.find((entry) => entry.id === editingBookId);
  return Array.isArray(book?.tags) ? book.tags.slice() : [];
}

function syncEditTagsVisibility() {
  if (editTagsField) {
    editTagsField.hidden = !serveEnabled;
  }
}

function hideEditTagSuggest() {
  editTagSuggestIndex = -1;
  if (!editTagSuggest) {
    return;
  }
  editTagSuggest.hidden = true;
  editTagSuggest.innerHTML = "";
  if (editTagInput) {
    editTagInput.setAttribute("aria-expanded", "false");
  }
}

function getEditTagSuggestItems() {
  const partial = String(editTagInput?.value || "").trim();
  if (!partial) {
    return [];
  }
  return viewerFilters.filterTagSuggestions(partial, getAllKnownTags(), {
    exclude: getEditingBookTags(),
  });
}

function renderEditTagSuggest() {
  const items = getEditTagSuggestItems();
  if (!items.length || !editTagSuggest) {
    hideEditTagSuggest();
    return;
  }

  editTagSuggest.innerHTML = items
    .map((label, index) => {
      const safe = viewerCardHtml.escapeHtml(label);
      const activeClass = index === editTagSuggestIndex ? " active" : "";
      return `<li class="edit-tag-suggest-item${activeClass}" role="option" data-suggest-index="${index}" aria-selected="${index === editTagSuggestIndex}">${safe}</li>`;
    })
    .join("");
  editTagSuggest.hidden = false;
  if (editTagInput) {
    editTagInput.setAttribute("aria-expanded", "true");
  }
}

function updateEditTagSuggest() {
  if (editTagSuggestIndex >= getEditTagSuggestItems().length) {
    editTagSuggestIndex = -1;
  }
  renderEditTagSuggest();
}

function pickEditTagSuggestion(index) {
  const items = getEditTagSuggestItems();
  const label = items[index];
  if (!label) {
    return;
  }
  hideEditTagSuggest();
  addEditingBookTag(label);
}

function commitEditTagInput() {
  const value = editTagInput?.value || "";
  hideEditTagSuggest();
  const resolved = viewerFilters.resolveTagFilterLabel(value, getAllKnownTags());
  addEditingBookTag(resolved || value);
}

function renderEditTagsUi() {
  if (!editTagsCurrent || !editTagsPoolList) {
    return;
  }

  const currentTags = getEditingBookTags();
  const currentKeys = new Set(currentTags.map(viewerTags.tagKey));

  if (!currentTags.length) {
    editTagsCurrent.innerHTML =
      '<p class="edit-tags-empty">No tags yet.</p>';
  } else {
    editTagsCurrent.innerHTML = currentTags
      .map((tag) => {
        const label = viewerTags.formatTagLabel(tag);
        return `<span class="edit-tag-chip"><span class="edit-tag-chip-label">${viewerCardHtml.escapeHtml(label)}</span><button type="button" class="edit-tag-remove" aria-label="Remove tag ${viewerCardHtml.escapeHtml(label)}">×</button></span>`;
      })
      .join("");
  }

  const poolTags = getAllKnownTags().filter(
    (tag) => !currentKeys.has(viewerTags.tagKey(tag)),
  );
  if (!poolTags.length) {
    editTagsPool.hidden = true;
    editTagsPoolList.innerHTML = "";
    return;
  }

  editTagsPool.hidden = false;
  editTagsPoolList.innerHTML = poolTags
    .map((tag) => {
      const label = viewerTags.formatTagLabel(tag);
      return `<button type="button" class="edit-tag-pool-btn">${viewerCardHtml.escapeHtml(label)}</button>`;
    })
    .join("");
}

function applyTagResponseToBook(bookId, tags) {
  const book = books.find((entry) => entry.id === bookId);
  if (!book) {
    return;
  }

  book.tags = Array.isArray(tags) ? tags.slice() : [];
  const key = String(bookId);
  if (book.tags.length) {
    window.BOOK_TAGS[key] = book.tags.slice();
  } else {
    delete window.BOOK_TAGS[key];
  }
}

async function persistBookTags(bookId, nextTags) {
  if (!bookId || !serveEnabled) {
    return;
  }

  const response = await fetch(`/api/books/${bookId}/tags`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags: nextTags }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Could not save tags");
  }

  applyTagResponseToBook(bookId, payload.tags);
  if (editingBookId === bookId) {
    renderEditTagsUi();
  }
  render();
  if (detailBookId === bookId) {
    openBookDetail(bookId, { historyMode: "none" });
  }
}

async function persistEditingBookTags(nextTags) {
  if (!editingBookId) {
    return;
  }
  await persistBookTags(editingBookId, nextTags);
}

async function addEditingBookTag(rawTag) {
  const tag = normalizeTagInput(rawTag);
  if (!tag) {
    return;
  }

  const currentTags = getEditingBookTags();
  if (
    currentTags.some(
      (entry) => viewerTags.tagKey(entry) === viewerTags.tagKey(tag),
    )
  ) {
    if (editTagInput) {
      editTagInput.value = "";
      hideEditTagSuggest();
    }
    return;
  }

  if (editTagAddBtn) {
    editTagAddBtn.disabled = true;
  }
  try {
    await persistEditingBookTags([...currentTags, tag]);
    if (editTagInput) {
      editTagInput.value = "";
      hideEditTagSuggest();
      editTagInput.focus();
    }
  } catch (error) {
    console.error(error);
    window.alert(`Could not save tag: ${error.message}`);
  } finally {
    if (editTagAddBtn) {
      editTagAddBtn.disabled = false;
    }
  }
}

async function removeEditingBookTag(rawTag) {
  const removeKey = viewerTags.tagKey(rawTag);
  const nextTags = getEditingBookTags().filter(
    (tag) => viewerTags.tagKey(tag) !== removeKey,
  );

  if (editTagAddBtn) {
    editTagAddBtn.disabled = true;
  }
  try {
    await persistEditingBookTags(nextTags);
  } catch (error) {
    console.error(error);
    window.alert(`Could not remove tag: ${error.message}`);
  } finally {
    if (editTagAddBtn) {
      editTagAddBtn.disabled = false;
    }
  }
}

async function removeDetailBookTag(rawTag) {
  if (!detailBookId || !serveEnabled) {
    return;
  }

  const book = books.find((entry) => entry.id === detailBookId);
  const currentTags = Array.isArray(book?.tags) ? book.tags : [];
  const removeKey = viewerTags.tagKey(rawTag);
  const nextTags = currentTags.filter(
    (tag) => viewerTags.tagKey(tag) !== removeKey,
  );

  try {
    await persistBookTags(detailBookId, nextTags);
  } catch (error) {
    console.error(error);
    window.alert(`Could not remove tag: ${error.message}`);
  }
}

function renderBookTagsHtml(book) {
  const tags = Array.isArray(book.tags) ? book.tags : [];
  if (!tags.length) {
    return "";
  }

  const editable = serveEnabled;
  const chips = tags
    .map((tag) => {
      const label = viewerTags.formatTagLabel(tag);
      const searchButton = `<button type="button" class="book-detail-tag" aria-label="Search for tag ${viewerCardHtml.escapeHtml(label)}">${viewerCardHtml.escapeHtml(label)}</button>`;
      if (!editable) {
        return searchButton;
      }
      return `<span class="book-detail-tag-chip">${searchButton}<button type="button" class="book-detail-tag-remove" aria-label="Remove tag ${viewerCardHtml.escapeHtml(label)}">×</button></span>`;
    })
    .join("");
  const editableClass = editable ? " book-detail-tags--editable" : "";
  return `<div class="book-detail-tags${editableClass}" aria-label="Tags">${chips}</div>`;
}


/* Admin book order dialog */

let bookOrderDragId = null;
let bookOrderPointerDrag = null;

function getBookById(bookId) {
  return books.find((entry) => entry.id === bookId) || null;
}

function isValidBookOrder(order) {
  for (let index = 1; index < order.length; index += 1) {
    const prevYear = parseYear(getBookById(order[index - 1])?.publicationDate);
    const nextYear = parseYear(getBookById(order[index])?.publicationDate);
    if (prevYear && nextYear && Number(prevYear) > Number(nextYear)) {
      return false;
    }
  }
  return true;
}

function wouldSwapBooksInOrder(order, indexA, indexB) {
  if (
    indexA < 0 ||
    indexB < 0 ||
    indexA >= order.length ||
    indexB >= order.length ||
    indexA === indexB
  ) {
    return false;
  }

  const next = [...order];
  [next[indexA], next[indexB]] = [next[indexB], next[indexA]];
  return isValidBookOrder(next);
}

function wouldMoveBookToIndex(order, bookId, targetIndex) {
  const from = order.indexOf(bookId);
  if (from < 0 || targetIndex < 0 || targetIndex >= order.length || from === targetIndex) {
    return false;
  }

  const next = [...order];
  next.splice(from, 1);
  next.splice(targetIndex, 0, bookId);
  return isValidBookOrder(next);
}

function canMoveBookInOrder(order, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= order.length) {
    return false;
  }

  return wouldSwapBooksInOrder(order, index, target);
}

function getOrderDialogIds() {
  return workingBookOrder.filter((id) => {
    const book = getBookById(id);
    return book && !book.hidden;
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
      const title = viewerCardHtml.escapeHtml(book.title || book.listTitle || "Untitled");

      return `
        <div class="order-dialog-row" data-book-id="${id}">
          <span
            class="order-dialog-drag-handle"
            aria-label="Drag to reorder"
            role="button"
            tabindex="0"
          >⠿</span>
          <div class="order-dialog-row-text">
            <span class="order-dialog-row-title">${title}</span>
            <span class="order-dialog-row-date">${viewerCardHtml.escapeHtml(dateLabel)}</span>
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
  const to = workingBookOrder.indexOf(targetId);
  if (
    from < 0 ||
    to < 0 ||
    from === to ||
    !wouldMoveBookToIndex(workingBookOrder, dragId, to)
  ) {
    return;
  }

  const next = [...workingBookOrder];
  next.splice(from, 1);
  next.splice(to, 0, dragId);
  workingBookOrder = next;
  bookOrderDirty = true;
  renderBookOrderList();
}

function findBookOrderRowAtPoint(clientX, clientY, excludeRow) {
  if (!bookOrderList) {
    return null;
  }
  return viewerPointerReorder.findRowAtPoint({
    root: bookOrderList,
    clientX,
    clientY,
    rowSelector: ".order-dialog-row",
    excludeRow,
    elementsFromPoint: document.elementsFromPoint.bind(document),
  });
}

function clearBookOrderDragState() {
  bookOrderDragId = null;
  bookOrderPointerDrag = null;
  if (!bookOrderList) {
    return;
  }
  bookOrderList
    .querySelectorAll(".order-dialog-row-dragging, .order-dialog-row-drop-target")
    .forEach((element) => {
      element.classList.remove("order-dialog-row-dragging", "order-dialog-row-drop-target");
    });
}

function updateBookOrderDropTarget(row) {
  if (!bookOrderList) {
    return;
  }
  bookOrderList
    .querySelectorAll(".order-dialog-row-drop-target")
    .forEach((element) => {
      if (element !== row) {
        element.classList.remove("order-dialog-row-drop-target");
      }
    });

  if (!row || !bookOrderDragId) {
    return;
  }

  const targetId = Number(row.dataset.bookId);
  const targetIndex = workingBookOrder.indexOf(targetId);
  if (wouldMoveBookToIndex(workingBookOrder, bookOrderDragId, targetIndex)) {
    row.classList.add("order-dialog-row-drop-target");
  }
}

function onBookOrderPointerDown(event) {
  if (event.button !== 0) {
    return;
  }

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

  event.preventDefault();
  handle.setPointerCapture(event.pointerId);

  bookOrderDragId = bookId;
  bookOrderPointerDrag = {
    row,
    pointerId: event.pointerId,
  };
  row.classList.add("order-dialog-row-dragging");
}

function onBookOrderPointerMove(event) {
  if (
    !bookOrderPointerDrag ||
    bookOrderPointerDrag.pointerId !== event.pointerId
  ) {
    return;
  }

  event.preventDefault();
  const row = findBookOrderRowAtPoint(
    event.clientX,
    event.clientY,
    bookOrderPointerDrag.row,
  );
  updateBookOrderDropTarget(row);
}

function finishBookOrderPointerDrag(event) {
  if (
    !bookOrderPointerDrag ||
    bookOrderPointerDrag.pointerId !== event.pointerId
  ) {
    return;
  }

  if (bookOrderDragId) {
    const row = findBookOrderRowAtPoint(
      event.clientX,
      event.clientY,
      bookOrderPointerDrag.row,
    );
    if (row) {
      const targetId = Number(row.dataset.bookId);
      reorderBookToTarget(bookOrderDragId, targetId);
    }
  }

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
    wantOrderLocked,
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
  if (event.button !== 0) {
    return;
  }

  const handle = event.target.closest(".want-rank-drag-handle");
  if (!handle) {
    return;
  }

  if (wantOrderLocked) {
    if (typeof jiggleWantOrderLock === "function") {
      jiggleWantOrderLock();
    }
    return;
  }

  if (!canReorderWantRank()) {
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


/* Grid and header filter event listeners */

grid.addEventListener("click", (event) => {
  if (event.target.closest(".want-rank-drag-handle")) {
    return;
  }

  if (typeof consumeWantRankClickSuppress === "function" && consumeWantRankClickSuppress()) {
    return;
  }

  const editButton = event.target.closest(".edit-book-btn");
  if (editButton) {
    event.preventDefault();
    event.stopPropagation();
    openEditDialog(Number(editButton.dataset.bookId));
    return;
  }

  const hideButton = event.target.closest(".hide-book-btn");
  if (hideButton) {
    event.preventDefault();
    event.stopPropagation();
    const bookId = Number(hideButton.dataset.bookId);
    const isHidden = hideButton.dataset.hidden === "true";
    setBookHidden(bookId, !isHidden);
    return;
  }

  if (
    event.target.closest(".book-detail-wiki-btn") ||
    event.target.closest(".book-detail-goodreads-btn")
  ) {
    return;
  }

  const card = event.target.closest(".card");
  if (card) {
    openBookDetail(Number(card.dataset.bookId));
  }
});

stats.addEventListener("click", (event) => {
  if (event.target.closest("#collection-filter-toggle")) {
    cycleCollectionFilter();
    wantFilterMode = null;
    notifyFilterChange({ replace: false });
    return;
  }
  if (event.target.closest("#hidden-filter-toggle")) {
    hiddenOnly = !hiddenOnly;
    render();
    return;
  }
  if (event.target.closest("#mycroft-filter-toggle")) {
    cycleMycroftFilter();
    notifyFilterChange({ replace: false });
    return;
  }
  if (event.target.closest("#want-filter-toggle")) {
    cycleWantFilter();
    if (wantFilterMode != null) {
      collectionFilterMode = null;
    }
    notifyFilterChange({ replace: false });
    return;
  }
});

const HOME_LOGO_MULTI_TAP_MS = 1200;
const HOME_LOGO_RANDOM_TAP_COUNT = 3;
let homeLogoTapTimes = [];
let homeLogoSingleTapTimer = null;

if (headerLogoBtn) {
  headerLogoBtn.addEventListener("click", (event) => {
    event.preventDefault();
    const now = Date.now();
    homeLogoTapTimes = homeLogoTapTimes.filter(
      (time) => now - time < HOME_LOGO_MULTI_TAP_MS,
    );
    homeLogoTapTimes.push(now);

    if (homeLogoTapTimes.length >= HOME_LOGO_RANDOM_TAP_COUNT) {
      homeLogoTapTimes = [];
      if (homeLogoSingleTapTimer) {
        clearTimeout(homeLogoSingleTapTimer);
        homeLogoSingleTapTimer = null;
      }
      openRandomVisibleBook();
      return;
    }

    if (homeLogoSingleTapTimer) {
      clearTimeout(homeLogoSingleTapTimer);
    }
    homeLogoSingleTapTimer = setTimeout(() => {
      homeLogoTapTimes = [];
      homeLogoSingleTapTimer = null;
      goHome();
    }, 350);
  });
}


/* Detail overlay and cover lightbox event listeners */

bookDetailCloseBtn.addEventListener("click", closeBookDetail);
bookDetailCover.addEventListener("click", handleCoverZoomTrigger);
bookDetailPrevBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  navigateDetail(-1);
});
bookDetailNextBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  navigateDetail(1);
});
bookDetailDialog.addEventListener("click", (event) => {
  const tagRemove = event.target.closest(".book-detail-tag-remove");
  if (tagRemove) {
    event.preventDefault();
    event.stopPropagation();
    const label = tagRemove
      .closest(".book-detail-tag-chip")
      ?.querySelector(".book-detail-tag")
      ?.textContent;
    if (label) {
      removeDetailBookTag(label);
    }
    return;
  }

  const fieldChip = event.target.closest(".book-detail-field-chip");
  if (fieldChip) {
    event.preventDefault();
    event.stopPropagation();
    applyFieldSearch(fieldChip.dataset.searchField, fieldChip.textContent);
    return;
  }

  const tagButton = event.target.closest(".book-detail-tag");
  if (tagButton) {
    event.preventDefault();
    event.stopPropagation();
    applyFieldSearch("tag", tagButton.textContent);
    return;
  }

  const editButton = event.target.closest(".book-detail-edit-btn");
  if (editButton) {
    event.preventDefault();
    event.stopPropagation();
    openEditDialog(Number(editButton.dataset.bookId));
    return;
  }

  const collectionButton = event.target.closest(".collection-btn");
  if (collectionButton) {
    event.preventDefault();
    event.stopPropagation();
    toggleCollection(Number(collectionButton.dataset.bookId));
    return;
  }

  const wantButton = event.target.closest(".want-btn");
  if (!wantButton || wantButton.classList.contains("want-badge")) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  toggleWant(Number(wantButton.dataset.bookId));
});
bookDetailDialog
  .querySelectorAll("[data-close-detail]")
  .forEach((element) => {
    element.addEventListener("click", closeBookDetail);
  });

if (coverLightbox) {
  coverLightbox.addEventListener("click", (event) => {
    if (event.target.closest(".cover-lightbox-img")) {
      if (isMobileCoverLightboxViewport()) {
        closeCoverLightbox();
      }
      return;
    }
    closeCoverLightbox();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  if (coverLightbox && !coverLightbox.hidden) {
    event.preventDefault();
    closeCoverLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (coverLightbox && !coverLightbox.hidden) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateCoverLightbox(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateCoverLightbox(1);
      return;
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !bookDetailDialog.hidden) {
    closeBookDetail();
    return;
  }
  if (
    !bookDetailDialog.hidden &&
    editDialog.hidden &&
    (!coverLightbox || coverLightbox.hidden)
  ) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateDetail(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateDetail(1);
    }
  }
});


/* Edit dialog, settings, search, and startup */

editBookForm.addEventListener("submit", saveBookEdits);
bindEditFieldSanitizers(editBookForm);
initListCoverPicker();
ensureListCoverPreviewObserver();
editDeleteBtn.addEventListener("click", deleteBook);
editCancelBtn.addEventListener("click", closeEditDialog);
editDialog.querySelectorAll("[data-close-edit]").forEach((element) => {
  element.addEventListener("click", closeEditDialog);
});

settingsBtn.addEventListener("click", () => {
  if (settingsDialog.hidden) {
    openSettingsDialog();
  } else {
    closeSettingsDialog();
  }
});

settingsCloseBtn.addEventListener("click", closeSettingsDialog);
settingsDialog.querySelectorAll("[data-close-settings]").forEach((element) => {
  element.addEventListener("click", closeSettingsDialog);
});

settingsTabAbout.addEventListener("click", () => {
  selectSettingsTab("about");
});

settingsTabSettings.addEventListener("click", () => {
  selectSettingsTab("settings");
});

editTabDetails.addEventListener("click", () => {
  selectEditDialogTab("details");
});

editTabListCrop.addEventListener("click", () => {
  selectEditDialogTab("list-crop");
});

if (editTagAddBtn) {
  editTagAddBtn.addEventListener("click", () => {
    commitEditTagInput();
  });
}

if (editTagSuggest) {
  editTagSuggest.addEventListener("mousedown", (event) => {
    const item = event.target.closest("[data-suggest-index]");
    if (!item) {
      return;
    }
    event.preventDefault();
    pickEditTagSuggestion(Number(item.dataset.suggestIndex));
  });
}

if (editTagInput) {
  editTagInput.addEventListener("input", () => {
    updateEditTagSuggest();
  });

  editTagInput.addEventListener("keydown", (event) => {
    const items = getEditTagSuggestItems();
    const suggestOpen = items.length > 0 && !editTagSuggest.hidden;

    if (event.key === "Enter") {
      event.preventDefault();
      if (suggestOpen && editTagSuggestIndex >= 0) {
        pickEditTagSuggestion(editTagSuggestIndex);
      } else {
        commitEditTagInput();
      }
      return;
    }

    if (!suggestOpen) {
      if (event.key === "Escape") {
        hideEditTagSuggest();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      editTagSuggestIndex = (editTagSuggestIndex + 1) % items.length;
      renderEditTagSuggest();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      editTagSuggestIndex =
        editTagSuggestIndex <= 0 ? items.length - 1 : editTagSuggestIndex - 1;
      renderEditTagSuggest();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      hideEditTagSuggest();
    }
  });

  editTagInput.addEventListener("blur", () => {
    window.setTimeout(() => {
      hideEditTagSuggest();
    }, 120);
  });
}

if (editTagsCurrent) {
  editTagsCurrent.addEventListener("click", (event) => {
    const removeBtn = event.target.closest(".edit-tag-remove");
    if (!removeBtn) {
      return;
    }
    event.preventDefault();
    const tag = removeBtn
      .closest(".edit-tag-chip")
      ?.querySelector(".edit-tag-chip-label")?.textContent;
    if (tag) {
      removeEditingBookTag(tag);
    }
  });
}

if (editTagsPoolList) {
  editTagsPoolList.addEventListener("click", (event) => {
    const button = event.target.closest(".edit-tag-pool-btn");
    if (!button) {
      return;
    }
    event.preventDefault();
    addEditingBookTag(button.textContent);
  });
}

if (storageModeLocalInput) {
  storageModeLocalInput.addEventListener("change", () => {
    if (storageModeLocalInput.checked) {
      onStorageModeChange("local");
    }
  });
}

if (storageModeGistInput) {
  storageModeGistInput.addEventListener("change", () => {
    if (storageModeGistInput.checked) {
      onGistSetupSelected();
    }
  });
}

if (gistConnectBtn) {
  gistConnectBtn.addEventListener("click", () => {
    onGistConnectClick();
  });
}

if (gistClearBtn) {
  gistClearBtn.addEventListener("click", () => {
    onGistClearClick();
  });
}

if (gistBackupList) {
  gistBackupList.addEventListener("click", onGistBackupListClick);
}

if (backupRestoreOk) {
  backupRestoreOk.addEventListener("click", () => {
    onConfirmBackupRestore();
  });
}

if (backupRestoreCancel) {
  backupRestoreCancel.addEventListener("click", closeBackupRestoreConfirm);
}

if (backupRestoreDialog) {
  backupRestoreDialog
    .querySelectorAll("[data-close-backup-restore]")
    .forEach((element) => {
      element.addEventListener("click", closeBackupRestoreConfirm);
    });
}

if (exportCollectionBtn) {
  exportCollectionBtn.addEventListener("click", () => {
    exportCollectionCsv();
  });
}

if (importCollectionBtn && importCollectionInput) {
  importCollectionBtn.addEventListener("click", () => {
    importCollectionInput.click();
  });
  importCollectionInput.addEventListener("change", () => {
    onImportCollectionFileSelected(importCollectionInput);
  });
}

if (highlightWantsInput) {
  highlightWantsInput.addEventListener("change", () => {
    highlightWants = highlightWantsInput.checked;
    saveUserState();
    render();
  });
}

if (highlightCollectionInput) {
  highlightCollectionInput.addEventListener("change", () => {
    highlightCollection = highlightCollectionInput.checked;
    saveUserState();
    render();
  });
}

if (showMagazinesInput) {
  showMagazinesInput.addEventListener("change", () => {
    showMagazines = showMagazinesInput.checked;
    saveUserState();
    render();
  });
}

if (bookOrderBtn) {
  bookOrderBtn.addEventListener("click", () => {
    if (bookOrderDialog.hidden) {
      openBookOrderDialog();
    } else {
      closeBookOrderDialog();
    }
  });
}

if (bookOrderCloseBtn) {
  bookOrderCloseBtn.addEventListener("click", closeBookOrderDialog);
}

if (bookOrderCancelBtn) {
  bookOrderCancelBtn.addEventListener("click", closeBookOrderDialog);
}

if (bookOrderSaveBtn) {
  bookOrderSaveBtn.addEventListener("click", () => {
    saveBookOrderDialog();
  });
}

if (bookOrderDialog) {
  bookOrderDialog.querySelectorAll("[data-close-book-order]").forEach((element) => {
    element.addEventListener("click", closeBookOrderDialog);
  });
}

if (bookOrderList) {
  bookOrderList.addEventListener("click", onBookOrderListClick);
  bookOrderList.addEventListener("pointerdown", onBookOrderPointerDown);
  bookOrderList.addEventListener("pointermove", onBookOrderPointerMove);
  bookOrderList.addEventListener("pointerup", finishBookOrderPointerDrag);
  bookOrderList.addEventListener("pointercancel", finishBookOrderPointerDrag);
}

attributionBtn.addEventListener("click", () => {
  if (attributionDialog.hidden) {
    openAttributionDialog();
  } else {
    closeAttributionDialog();
  }
});

attributionCloseBtn.addEventListener("click", closeAttributionDialog);
attributionDialog.querySelectorAll("[data-close-attribution]").forEach((element) => {
  element.addEventListener("click", closeAttributionDialog);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !editDialog.hidden) {
    if (editTagSuggest && !editTagSuggest.hidden) {
      hideEditTagSuggest();
      return;
    }
    closeEditDialog();
    return;
  }
  if (event.key === "Escape" && !settingsDialog.hidden) {
    closeSettingsDialog();
    return;
  }
  if (event.key === "Escape" && bookOrderDialog && !bookOrderDialog.hidden) {
    closeBookOrderDialog();
    return;
  }
  if (event.key === "Escape" && !attributionDialog.hidden) {
    closeAttributionDialog();
  }
});

sortSelect.addEventListener("change", onSortChange);
sortReverseBtn?.addEventListener("click", toggleSortOrder);

syncSettingsStorageMode();
updateSortControlVisibility();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    pullGistStateIfConfigured();
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    loadUserStateAsync().then(() => {
      render();
    });
    return;
  }
  pullGistStateIfConfigured();
});

if (headerFiltersToggle) {
  headerFiltersToggle.addEventListener("click", () => {
    headerFiltersExpanded = !headerFiltersExpanded;
    saveUserState();
    updateHeaderFiltersState();
  });
}

if (viewModeToggle) {
  viewModeToggle.addEventListener("click", () => {
    gridViewMode = gridViewMode === "list" ? "cards" : "list";
    saveUserState();
    updateViewModeState();
    render();
  });
}

function startViewer() {
  applyFiltersFromUrl();
  loadUserStateAsync().then(() => {
    syncFilterUrlFromState({ replace: true });
    render();
    openBookDetailFromLocation();
  });
}

if (readOnly) {
  startViewer();
} else {
  checkServeSupport().then(() => {
    startViewer();
  });
}

})();

