/* Generated from scripts/lib/viewer-collection-source.js — run npm run bundle-viewer */

const viewerCollectionSource = (function () {
  function parseSampleUrlOverride(search) {
    try {
      return new URLSearchParams(search).get("sample") === "true";
    } catch (_) {
      return false;
    }
  }
  
  function resolveCollectionSourceOnLoad({ saved, defaultSource, sampleUrlOverride }) {
    if (saved === "sample" || saved === "own") {
      if (sampleUrlOverride) {
        return "sample";
      }
      return saved;
    }
    if (sampleUrlOverride) {
      return "sample";
    }
    return defaultSource === "sample" || defaultSource === "own"
      ? defaultSource
      : "sample";
  }
  return {
    parseSampleUrlOverride,
    resolveCollectionSourceOnLoad,
  };
})();
