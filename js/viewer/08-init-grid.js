/* Grid and header filter event listeners */

const RANDOM_CARD_LOGO_TAP_MS = 1200;
const RANDOM_CARD_LOGO_TAP_COUNT = 3;
let randomCardLogoTapTimes = [];

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
    render();
    return;
  }
  if (event.target.closest("#hidden-filter-toggle")) {
    hiddenOnly = !hiddenOnly;
    render();
    return;
  }
  if (event.target.closest("#mycroft-filter-toggle")) {
    cycleMycroftFilter();
    render();
    return;
  }
  if (event.target.closest("#want-filter-toggle")) {
    cycleWantFilter();
    if (wantFilterMode != null) {
      collectionFilterMode = null;
    }
    render();
    return;
  }
});

if (headerLogo) {
  headerLogo.addEventListener("click", () => {
    const now = Date.now();
    randomCardLogoTapTimes = randomCardLogoTapTimes.filter(
      (time) => now - time < RANDOM_CARD_LOGO_TAP_MS,
    );
    randomCardLogoTapTimes.push(now);
    if (randomCardLogoTapTimes.length >= RANDOM_CARD_LOGO_TAP_COUNT) {
      randomCardLogoTapTimes = [];
      openRandomVisibleBook();
    }
  });
}
