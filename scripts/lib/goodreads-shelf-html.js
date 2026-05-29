const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { EXAMPLES_DIR } = require("../config");
const { normalizeForMatch, titlesMatch, normalizeLabel } = require("./text");

const GOODREADS_SHELF_HTML_FILES = [
  "Arkham House Books _ Goodreads.html",
  "Arkham House Books _ Goodreads2.html",
  "Arkham House Books _ Goodreads3.html",
  "Arkham House Books _ Goodreads5.html",
];

const BINDING_SUFFIX =
  /\s*\((?:hardcover|paperback|mass market paperback|ebook|kindle edition|audiobook|library binding|unknown binding|spiral-bound|box set|omnibus|reprint|illustrated|unabridged|abridged|english edition|spanish edition|french edition|german edition)[^)]*\)\s*$/i;

function cleanGoodreadsShelfTitle(raw) {
  return normalizeLabel(String(raw || "").replace(BINDING_SUFFIX, "").trim());
}

function normalizeGoodreadsBookUrl(href) {
  if (!href) {
    return null;
  }
  const trimmed = href.trim();
  if (!/goodreads\.com\/book\/show\//i.test(trimmed)) {
    return null;
  }
  try {
    const url = new URL(trimmed, "https://www.goodreads.com");
    return url.href;
  } catch {
    return trimmed;
  }
}

function parseGoodreadsShelfFile(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const $ = cheerio.load(html);
  const entries = [];
  const seenUrls = new Set();

  $("a.bookTitle").each((_, element) => {
    const $title = $(element);
    const url = normalizeGoodreadsBookUrl($title.attr("href"));
    if (!url || seenUrls.has(url)) {
      return;
    }

    const title = cleanGoodreadsShelfTitle($title.text());
    if (!title) {
      return;
    }

    const $left = $title.closest(".left");
    let author = null;
    if ($left.length) {
      author =
        normalizeLabel(
          $left.find('a.authorName span[itemprop="name"]').first().text(),
        ) ||
        normalizeLabel($left.find("a.authorName").first().text()) ||
        null;
    }

    seenUrls.add(url);
    entries.push({
      title,
      url,
      author,
      sourceFile: path.basename(filePath),
    });
  });

  return entries;
}

function loadGoodreadsShelfCatalog(fileNames = GOODREADS_SHELF_HTML_FILES) {
  const byNormalizedTitle = new Map();
  const allEntries = [];

  for (const fileName of fileNames) {
    const filePath = path.join(EXAMPLES_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing Goodreads shelf export: ${filePath}`);
    }

    const entries = parseGoodreadsShelfFile(filePath);
    for (const entry of entries) {
      const key = normalizeForMatch(entry.title);
      if (!key) {
        continue;
      }
      byNormalizedTitle.set(key, entry);
      allEntries.push(entry);
    }
  }

  return { byNormalizedTitle, allEntries, fileNames };
}

function authorMatches(bookAuthor, shelfAuthor) {
  if (!bookAuthor || !shelfAuthor) {
    return true;
  }

  const left = normalizeForMatch(bookAuthor);
  const right = normalizeForMatch(shelfAuthor);
  if (!left || !right) {
    return true;
  }

  if (left === right || left.includes(right) || right.includes(left)) {
    return true;
  }

  const leftLast = left.split(/\s+/).pop();
  const rightLast = right.split(/\s+/).pop();
  return Boolean(leftLast && rightLast && leftLast === rightLast);
}

function findShelfEntryForBook(book, byNormalizedTitle, allEntries) {
  const titles = [book.title, book.listTitle].filter(Boolean);

  for (const title of titles) {
    const key = normalizeForMatch(title);
    const direct = byNormalizedTitle.get(key);
    if (direct) {
      return direct;
    }
  }

  const fuzzyMatches = [];
  for (const entry of allEntries) {
    if (titles.some((title) => titlesMatch(title, entry.title))) {
      fuzzyMatches.push(entry);
    }
  }

  if (fuzzyMatches.length === 1) {
    return fuzzyMatches[0];
  }

  if (fuzzyMatches.length > 1) {
    const withAuthor = fuzzyMatches.filter((entry) =>
      authorMatches(book.author, entry.author),
    );
    if (withAuthor.length === 1) {
      return withAuthor[0];
    }
  }

  return null;
}

module.exports = {
  GOODREADS_SHELF_HTML_FILES,
  cleanGoodreadsShelfTitle,
  parseGoodreadsShelfFile,
  loadGoodreadsShelfCatalog,
  findShelfEntryForBook,
  authorMatches,
};
