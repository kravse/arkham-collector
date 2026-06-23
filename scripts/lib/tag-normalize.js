const MAX_TAG_LENGTH = 48;

function tagKey(tag) {
  return String(tag || "")
    .trim()
    .toLowerCase();
}

function normalizeTag(value) {
  const text = String(value || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!text || text.length > MAX_TAG_LENGTH) {
    return null;
  }
  return text.toUpperCase();
}

function formatTagLabel(tag) {
  return normalizeTag(tag) || String(tag || "").trim().toUpperCase();
}

function collectTagsFromBooks(books) {
  const seen = new Set();
  const tags = [];
  for (const book of books || []) {
    if (!Array.isArray(book?.tags)) {
      continue;
    }
    for (const tag of book.tags) {
      const label = formatTagLabel(tag);
      if (!label) {
        continue;
      }
      const key = tagKey(label);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      tags.push(label);
    }
  }
  return tags.sort((a, b) => tagKey(a).localeCompare(tagKey(b)));
}

function collectAllKnownTags(tagsByBookId) {
  const books = Object.values(tagsByBookId || {}).map((bookTags) => ({
    tags: bookTags,
  }));
  return collectTagsFromBooks(books);
}

module.exports = {
  MAX_TAG_LENGTH,
  tagKey,
  normalizeTag,
  formatTagLabel,
  collectAllKnownTags,
  collectTagsFromBooks,
};
