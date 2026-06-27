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
