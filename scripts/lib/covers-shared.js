const path = require("path");

function coverSourceKey(relativePath) {
  return String(relativePath || "").replace(/\\/g, "/");
}

function coverDerivativePaths(relativePath) {
  const normalized = coverSourceKey(relativePath);
  const parsed = path.posix.parse(normalized);
  const base = parsed.dir ? `${parsed.dir}/${parsed.name}` : parsed.name;
  return {
    card: `${base}.card.webp`,
    detail: `${base}.detail.webp`,
    list: `${base}.list.webp`,
  };
}

module.exports = {
  coverSourceKey,
  coverDerivativePaths,
};
