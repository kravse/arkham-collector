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
