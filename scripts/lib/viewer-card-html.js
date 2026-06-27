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

module.exports = {
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
