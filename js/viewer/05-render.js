/* Covers, cards, stats, and main grid render */

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^the\s+/, "");
}

function wikiTitleFromUrl(url) {
  if (!url) return null;
  const match = url.match(/\/wiki\/([^#?]+)/);
  return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : null;
}

function getCoverSources(book) {
  if (book.coverEditPath) {
    return [book.coverEditPath];
  }

  const sources = [];
  if (book.coverImageFile) {
    sources.push(book.coverImageFile);
  }

  const slugBase = slugify(
    wikiTitleFromUrl(book.wikipediaUrl) || book.listTitle || book.title,
  );
  if (slugBase && book.id) {
    ["jpg", "jpeg", "png", "webp", "gif"].forEach((ext) => {
      sources.push(`covers/${slugBase}-${book.id}.${ext}`);
    });
  }

  if (book.coverImageUrl) {
    sources.push(book.coverImageUrl);
  }

  return [...new Set(sources)];
}

function renderCover(book, cacheKey) {
  const sources = getCoverSources(book);
  if (!sources.length) {
    return `<div class="placeholder">No cover image</div>`;
  }

  const primary = cacheKey
    ? `${sources[0]}?v=${encodeURIComponent(cacheKey)}`
    : sources[0];
  const fallback = sources.slice(1).join("|");
  return `<img src="${primary}" alt="Cover of ${book.title}" loading="lazy" data-fallbacks="${fallback}" onerror="tryCoverFallback(this)">`;
}

const editIcon = `
<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
  <path d="M12.1 3.9 16.1 7.9 7.4 16.6 3.4 12.6 12.1 3.9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M10.8 5.2 14.8 9.2" stroke="currentColor" stroke-width="1.5"/>
</svg>
    `;

function isViewingOnDevServer() {
  return !readOnly && window.location.protocol !== "file:";
}

function renderEditButton(book, className = "edit-book-btn") {
  if (!serveEnabled) {
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
    bookDetailImprint.innerHTML = renderImprintBadge(book, "detail");
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

function getGoodreadsLinkForBook(book) {
  const savedUrl = resolveGoodreadsUrl(book);
  if (savedUrl) {
    return { url: savedUrl, search: false };
  }
  const searchUrl = getGoodreadsSearchUrl(book);
  if (!searchUrl) {
    return null;
  }
  return { url: searchUrl, search: true };
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

function getDisplayAuthor(book) {
  if (book.author) {
    return book.author;
  }

  const line = (book.listAuthor || "").trim();
  if (!line) {
    return null;
  }

  const withoutYear = line.replace(/\s*\(\d{4}\)\s*$/, "").trim();
  const editedMatch = withoutYear.match(/edited by\s+(.+)$/i);
  if (editedMatch) {
    return editedMatch[1].trim();
  }

  const byMatch = withoutYear.match(/(?:^|,\s*)by\s+(.+)$/i);
  if (byMatch) {
    return byMatch[1].split(/\s+vol\.\s+/i)[0].trim() || null;
  }

  return null;
}

function renderBookMetaHtml(book) {
  const author = getDisplayAuthor(book);
  const lines = [];

  if (author) {
    lines.push(`<p class="meta"><strong>Author:</strong> ${author}</p>`);
  }

  if (book.coverArtist) {
    lines.push(`<p class="meta"><strong>Cover:</strong> ${book.coverArtist}</p>`);
  }

  if (book.imprint === "mycroft_moran") {
    lines.push(`<p class="meta"><strong>Imprint:</strong> Mycroft &amp; Moran</p>`);
  }

  return lines.join("");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBookDescriptionHtml(book) {
  const description = getBookDescription(book);
  if (!description?.trim()) {
    return "";
  }
  return `<div class="book-detail-description">${escapeHtml(description)}</div>`;
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

function renderImprintBadge(book, placement = "cover") {
  const isMycroft = book.imprint === "mycroft_moran";
  const label = isMycroft ? "MM" : "AH";
  const title = isMycroft ? "Mycroft & Moran" : "Arkham House";
  const imprintClass = isMycroft ? "imprint-badge--mm" : "imprint-badge--ah";

  return `<span class="imprint-badge imprint-badge--${placement} ${imprintClass}" title="${title}" aria-label="${title}">${label}</span>`;
}

function renderCardWantBadge(book) {
  if (isInCollection(book) || !isWanted(book)) {
    return "";
  }

  return `<span class="want-btn active want-badge">Wanted</span>`;
}

function renderCollectionButton(book) {
  const collected = isInCollection(book);
  const label = collected ? "Collection" : "Collect";
  const className = `collection-btn${collected ? " active" : ""}`;

  return `
  <button
    type="button"
    class="${className}"
    data-book-id="${book.id}"
    aria-pressed="${collected}"
  >${label}</button>
`;
}

function renderOwnedBadge(book) {
  const owned = getCollectionItem(book);
  if (!owned) {
    return "";
  }

  return `<span class="owned-badge">${owned.status === "order" ? "On order" : "Collection"}</span>`;
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

window.tryCoverFallback = function (img) {
  const remaining = img.dataset.fallbacks
    ? img.dataset.fallbacks.split("|").filter(Boolean)
    : [];
  if (!remaining.length) {
    img.replaceWith(
      Object.assign(document.createElement("div"), {
        className: "placeholder",
        textContent: "No cover image",
      }),
    );
    return;
  }

  img.dataset.fallbacks = remaining.slice(1).join("|");
  img.src = remaining[0];
};

function renderCard(book) {
  const inCollection = isInCollection(book);
  const ownedClass =
    inCollection && shouldHighlightCollectionOnCards() ? " owned" : "";
  const hiddenClass = book.hidden ? " hidden-book" : "";
  const imageHtml = renderCover(book, book.coverCacheKey);
  const coverActions = renderCoverActions(book);

  const imprintBadge = renderImprintBadge(book, "card");
  const wantBadge = renderCardWantBadge(book);
  const ownedBadge = renderOwnedBadge(book);
  const bottomRow = renderCardBottomRow(
    imprintBadge,
    wantBadge,
    "",
    ownedBadge,
  );

  const hiddenBadge = book.hidden
    ? `<span class="hidden-badge">Hidden</span>`
    : "";

  const wantedClass =
    isWanted(book) && shouldHighlightWantsOnCards() ? " wanted" : "";

  return `
  <article class="card${ownedClass}${wantedClass}${hiddenClass}" data-book-id="${book.id}">
    <div class="cover-wrap">
      ${coverActions}
      ${imageHtml}
    </div>
    <div class="card-body">
      ${hiddenBadge}
      <h2 class="title">${book.title || "Untitled"}</h2>
      ${book.publicationDate ? `<div class="date">${book.publicationDate}</div>` : ""}
      ${renderBookMetaHtml(book)}
      ${bottomRow}
    </div>
  </article>
`;
}

function updateHeaderLogo() {
  if (headerLogo) {
    headerLogo.src = mycroftOnly ? LOGO_MYCROFT : LOGO_ARKHAM;
  }
  const title = mycroftOnly ? "Mycroft & Moran" : "Arkham House";
  if (pageTitle) {
    pageTitle.textContent = title;
  }
  document.title = title;
}

function render() {
  const activeBooks = getActiveBooks();
  const visible = getVisibleBooks();

  updateHeaderLogo();
  document.body.classList.toggle(
    "viewing-collection",
    collectionOnly && !hiddenOnly && !mycroftOnly && !wantOnly,
  );
  document.body.classList.toggle(
    "viewing-hidden",
    hiddenOnly && !collectionOnly && !mycroftOnly && !wantOnly,
  );
  document.body.classList.toggle(
    "viewing-want",
    wantOnly && !collectionOnly && !hiddenOnly && !mycroftOnly,
  );
  if (pageSubtitle) {
    if (collectionOnly && hiddenOnly) {
      pageSubtitle.textContent =
        "Viewing hidden books in your collection — click a stat again to show all books";
    } else if (collectionOnly) {
      pageSubtitle.textContent =
        "Viewing your collection — click the stat again to show all books";
    } else if (hiddenOnly) {
      pageSubtitle.textContent =
        "Viewing hidden books — click the stat again to show all books";
    } else if (mycroftOnly) {
      pageSubtitle.textContent =
        "An imprint for weird detective fiction—founded in 1945 to house August Derleth's Solar Pons.";
    } else if (wantOnly) {
      pageSubtitle.textContent =
        "Viewing your want list — click the stat again to show all books";
    } else {
      pageSubtitle.textContent =
        "A publishing house of horror and weird fiction—founded in 1939 to rescue Lovecraft from the pulps.";
    }
  }

  renderStats(visible, activeBooks);

  if (!visible.length) {
    let message = "No books match your search.";
    if (collectionOnly) {
      message = searchInput.value.trim()
        ? "No books in your collection match your search."
        : "Your collection is empty — open a book and tap Collect to add it.";
    } else if (hiddenOnly) {
      message = searchInput.value.trim()
        ? "No hidden books match your search."
        : "No hidden books to show.";
    } else if (mycroftOnly) {
      message = searchInput.value.trim()
        ? "No Mycroft & Moran books match your search."
        : "No Mycroft & Moran books to show.";
    } else if (wantOnly) {
      message = searchInput.value.trim()
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

  grid.innerHTML = visible.map(renderCard).join("");

  if (!bookDetailDialog.hidden && detailBookId) {
    const detailBook = books.find((entry) => entry.id === detailBookId);
    refreshDetailToolbar(detailBook);
    updateDetailNav();
  }

  syncSettingsHighlightCheckboxes();
}
