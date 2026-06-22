const fs = require("fs");
const path = require("path");

const { DATA_DIR } = require("../config");
const {
  MAX_TAG_LENGTH,
  tagKey,
  normalizeTag,
  collectAllKnownTags,
} = require("./tag-normalize");
const { writeJsonAndJs } = require("./static-data");

const TAGS_JSON = path.join(DATA_DIR, "tags.json");
const TAGS_JS = path.join(DATA_DIR, "tags.js");

function normalizeTags(tags) {
  const seen = new Set();
  const result = [];
  for (const raw of tags || []) {
    const tag = normalizeTag(raw);
    if (!tag) {
      continue;
    }
    const key = tagKey(tag);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(tag);
  }
  return result.sort((a, b) => tagKey(a).localeCompare(tagKey(b)));
}

function loadTags() {
  if (!fs.existsSync(TAGS_JSON)) {
    return { byBookId: {} };
  }
  const payload = JSON.parse(fs.readFileSync(TAGS_JSON, "utf8"));
  return {
    byBookId: payload.byBookId || {},
  };
}

function saveTags(payload, paths = {}) {
  const byBookId = {};
  for (const [key, tags] of Object.entries(payload.byBookId || {})) {
    const next = normalizeTags(tags);
    if (next.length) {
      byBookId[key] = next;
    }
  }
  const output = { byBookId };
  const tagsJson = paths.tagsJson || TAGS_JSON;
  const tagsJs = paths.tagsJs || TAGS_JS;
  writeJsonAndJs({
    jsonPath: tagsJson,
    jsPath: tagsJs,
    jsonValue: output,
    jsGlobal: "BOOK_TAGS",
    jsValue: byBookId,
  });
  return output;
}

function getTagsForBook(tagsByBookId, bookId) {
  if (!tagsByBookId) {
    return [];
  }
  const raw = tagsByBookId[String(bookId)] || tagsByBookId[bookId];
  return normalizeTags(Array.isArray(raw) ? raw : []);
}

function setBookTags(bookId, tags) {
  const payload = loadTags();
  const key = String(bookId);
  const next = normalizeTags(tags);
  if (next.length === 0) {
    delete payload.byBookId[key];
  } else {
    payload.byBookId[key] = next;
  }
  return saveTags(payload);
}

function getAllTags(tagsByBookId) {
  return collectAllKnownTags(tagsByBookId);
}

function compactAllTags() {
  const payload = loadTags();
  const byBookId = {};

  for (const [key, tags] of Object.entries(payload.byBookId)) {
    const next = normalizeTags(tags);
    if (next.length) {
      byBookId[key] = next;
    }
  }

  return saveTags({ byBookId });
}

function applyTagsToBook(book, tagsByBookId) {
  return {
    ...book,
    tags: getTagsForBook(tagsByBookId, book.id),
  };
}

function applyTagsToBooks(books, tagsByBookId) {
  if (!Array.isArray(books)) {
    return [];
  }
  if (!tagsByBookId || typeof tagsByBookId !== "object") {
    return books.map((book) => ({
      ...book,
      tags: Array.isArray(book.tags) ? book.tags : [],
    }));
  }
  return books.map((book) => applyTagsToBook(book, tagsByBookId));
}

module.exports = {
  TAGS_JSON,
  TAGS_JS,
  MAX_TAG_LENGTH,
  tagKey,
  normalizeTag,
  normalizeTags,
  compactAllTags,
  loadTags,
  saveTags,
  getTagsForBook,
  setBookTags,
  getAllTags,
  applyTagsToBook,
  applyTagsToBooks,
};
