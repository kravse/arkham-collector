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

  syncFilterUrlFromState({ replace: false });
  render();
}

function notifyFilterChange(options = {}) {
  syncFilterUrlFromState(options);
  render();
}

window.addEventListener("popstate", () => {
  applyFiltersFromUrl();
  if (typeof handleDetailPopState === "function") {
    handleDetailPopState();
  }
  render();
});
