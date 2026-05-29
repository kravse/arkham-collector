const { fetchWithRetry } = require("./http");

const OPEN_LIBRARY_BASE = "https://openlibrary.org";

async function searchWorks({ title, author, publisher, limit = 8 }) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (title) {
    params.set("title", title);
  }
  if (author) {
    params.set("author", author);
  }
  if (publisher) {
    params.set("publisher", publisher);
  }
  if (!title && !author) {
    return [];
  }

  const json = await fetchWithRetry(
    `${OPEN_LIBRARY_BASE}/search.json?${params}`,
  );
  return json.docs || [];
}

function workIdFromDocKey(key) {
  if (!key) {
    return null;
  }
  const match = String(key).match(/\/works\/(OL\d+W)/i);
  return match ? match[1] : null;
}

async function fetchEditions(workId) {
  if (!workId) {
    return [];
  }

  const json = await fetchWithRetry(
    `${OPEN_LIBRARY_BASE}/works/${workId}/editions.json?limit=50`,
  );
  return json.entries || [];
}

module.exports = {
  OPEN_LIBRARY_BASE,
  searchWorks,
  workIdFromDocKey,
  fetchEditions,
};
