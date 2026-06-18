function slugifyCover(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function wikiTitleFromUrl(url) {
  if (!url) {
    return null;
  }
  const match = url.match(/\/wiki\/([^#?]+)/);
  return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : null;
}

function coverSlugFromBook(book) {
  return slugifyCover(
    wikiTitleFromUrl(book.wikipediaUrl) || book.listTitle || book.title,
  );
}

function appendCoverCacheKey(url, cacheKey) {
  if (!cacheKey) {
    return url;
  }
  return `${url}?v=${encodeURIComponent(cacheKey)}`;
}

function getCoverSources(book, variant = "card") {
  const sources = [];

  if (book.coverEditPath) {
    sources.push(book.coverEditPath);
  }
  if (variant === "detail" && book.coverImageDetailFile) {
    sources.push(book.coverImageDetailFile);
  }
  if (book.coverImageFile) {
    sources.push(book.coverImageFile);
  }

  const slugBase = coverSlugFromBook(book);
  if (slugBase && book.id) {
    if (variant === "detail") {
      sources.push(`covers/${slugBase}-${book.id}.detail.webp`);
    }
    sources.push(`covers/${slugBase}-${book.id}.card.webp`);
    ["jpg", "jpeg", "png", "webp", "gif"].forEach((ext) => {
      sources.push(`covers/${slugBase}-${book.id}.${ext}`);
    });
  }

  if (book.coverImageUrl) {
    sources.push(book.coverImageUrl);
  }

  return [...new Set(sources)];
}

module.exports = {
  slugifyCover,
  wikiTitleFromUrl,
  coverSlugFromBook,
  appendCoverCacheKey,
  getCoverSources,
};
