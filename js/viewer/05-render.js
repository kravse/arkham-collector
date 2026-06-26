/* Covers, cards, stats, and main grid render */

let wantDisplayRankById = null;

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
  const scraped = (window.BOOKS || []).find((entry) => entry.id === book.id);
  const fromData = (scraped?.goodreadsUrl || "").trim();
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

function ensureListCoverPreviewObserver() {
  if (listCoverPreviewObserver) {
    return;
  }
  listCoverPreviewObserver = new ResizeObserver(() => {
    layoutListCoverPreviews();
  });
  listCoverPreviewObserver.observe(grid);
}

function canShowWantRankControls() {
  return viewerWantView.canReorderWantList(
    wantFilterMode,
    gridViewMode,
    hasActiveSearch(),
  );
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
    const rowContent =
      wantRankDragSide === "right"
        ? `${cardMarkup}${listHandle}`
        : `${listHandle}${cardMarkup}`;
    return `<div class="want-rank-row">${rowContent}</div>`;
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
  if (pageSubtitle) {
    if (isCollectionAllFilter() && hiddenOnly) {
      pageSubtitle.textContent =
        "Viewing hidden books in your collection — click a stat again to show all books";
    } else if (isCollectionAllFilter()) {
      pageSubtitle.textContent = hasAnyOrderedBooks()
        ? "Viewing your collection — click again for on-order only"
        : "Viewing your collection — click the stat again to show all books";
    } else if (isOrderedFilterActive()) {
      pageSubtitle.textContent =
        "Viewing on-order titles only — click the stat again to show all books";
    } else if (hiddenOnly) {
      pageSubtitle.textContent =
        "Viewing hidden books — click the stat again to show all books";
    } else if (isMycroftOnlyFilter()) {
      pageSubtitle.textContent =
        "An imprint for weird detective fiction—founded in 1945 to house August Derleth's Solar Pons.";
    } else if (isMycroftHiddenFilter()) {
      pageSubtitle.textContent =
        "Mycroft & Moran titles hidden — click the stat again to show all books";
    } else if (isWantFilterActive() && isWantViewExclusive()) {
      pageSubtitle.textContent = hasActiveSearch()
        ? "Search narrows your want list — clear search to reorder"
        : gridViewMode === "list"
          ? "Your want list — drag rank tabs to reorder; tap WANT to show all books"
          : "Your want list — drag rank chips to reorder; tap WANT to show all books";
    } else {
      pageSubtitle.textContent =
        "A publishing house of horror and weird fiction—founded in 1939 to rescue Lovecraft from the pulps.";
    }
  }

  renderStats(visible, activeBooks);

  if (wantRankDragInProgress) {
    syncSettingsHighlightCheckboxes();
    return;
  }

  if (!visible.length) {
    let message = "No books match your search.";
    const activeSearch = hasActiveSearch();
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
    grid.innerHTML = `<div class="empty">${message}</div>`;
    if (!bookDetailDialog.hidden && detailBookId) {
      updateDetailNav();
    }
    syncSettingsHighlightCheckboxes();
    return;
  }

  wantDisplayRankById = canShowWantRankControls()
    ? viewerWantOrder.buildWantDisplayRankById(
        wantOrderIds,
        visible.map((book) => book.id),
      )
    : null;

  grid.innerHTML = visible.map(renderCard).join("");
  layoutListCoverPreviews();

  if (!bookDetailDialog.hidden && detailBookId) {
    const detailBook = books.find((entry) => entry.id === detailBookId);
    refreshDetailToolbar(detailBook);
    updateDetailNav();
  }

  syncSettingsHighlightCheckboxes();
}
