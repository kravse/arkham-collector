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

module.exports = {
  appendCoverCacheKey,
  getCoverPath,
};
