/* Generated from scripts/lib/viewer-covers.js — run npm run bundle-viewer */

const viewerCovers = (function () {
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
    return book.coverImageFile || null;
  }
  return {
    appendCoverCacheKey,
    getCoverPath,
  };
})();
