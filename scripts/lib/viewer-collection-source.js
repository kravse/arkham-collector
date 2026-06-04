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

module.exports = {
  parseSampleUrlOverride,
  resolveCollectionSourceOnLoad,
};
