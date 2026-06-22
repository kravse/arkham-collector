function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  renderImprintBadge,
};
