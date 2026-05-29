#!/usr/bin/env node

const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const COVERS_DIR = path.join(ROOT, "covers");
const COLLECTION_CSV = path.join(ROOT, "my_collection", "my_collection.csv");
const COLLECTION_JS = path.join(ROOT, "my_collection", "collection.js");
const EXAMPLES_DIR = path.join(ROOT, "examples");
const ARKHAM_LOCAL = path.join(EXAMPLES_DIR, "Arkham House - Wikipedia.html");
const MYCROFT_LOCAL = path.join(
  EXAMPLES_DIR,
  "Mycroft & Moran - Wikipedia.html",
);
const SAMPLE_BOOK_LOCAL = path.join(
  EXAMPLES_DIR,
  "The Dark Brotherhood and Other Pieces - Wikipedia.html",
);

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const WIKI_BASE = "https://en.wikipedia.org";
const SOURCE_URL = `${WIKI_BASE}/wiki/Arkham_House`;

const IMPRINTS = {
  arkham_house: {
    wikiPage: "Arkham_House",
    sectionId: "Bibliography_of_works_published_by_Arkham_House",
    localFile: "Arkham House - Wikipedia.html",
    sourceUrl: `${WIKI_BASE}/wiki/Arkham_House`,
    openLibraryPublisher: "Arkham House",
  },
  mycroft_moran: {
    wikiPage: "Mycroft_&_Moran",
    sectionId: "Works_published_by_Mycroft_&_Moran",
    localFile: "Mycroft & Moran - Wikipedia.html",
    sourceUrl: `${WIKI_BASE}/wiki/Mycroft_%26_Moran`,
    openLibraryPublisher: "Mycroft & Moran",
  },
};
const USER_AGENT =
  "ArkhamCoverCrawler/1.0 (personal project; https://github.com/)";

const args = parseArgs(process.argv.slice(2));
const delayMs = args.delayMs;
const pageCache = new Map();
const coverDownloadCache = new Map();
let requestCount = 0;
let lastRequestAt = 0;

function parseArgs(argv) {
  const options = {
    local: false,
    limit: Infinity,
    skipDownload: false,
    delayMs: 2000,
    syncCollection: false,
    reconcileCovers: false,
    fillCovers: false,
    dryRun: false,
    mycroftOnly: false,
    syncPublicationDates: false,
    syncAuthors: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--local") {
      options.local = true;
    } else if (arg === "--mycroft-only") {
      options.mycroftOnly = true;
    } else if (arg === "--sync-publication-dates") {
      options.syncPublicationDates = true;
    } else if (arg === "--sync-authors") {
      options.syncAuthors = true;
    } else if (arg === "--skip-download") {
      options.skipDownload = true;
    } else if (arg === "--sync-collection") {
      options.syncCollection = true;
    } else if (arg === "--reconcile-covers") {
      options.reconcileCovers = true;
    } else if (arg === "--fill-covers") {
      options.fillCovers = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--limit") {
      options.limit = Number(argv[++i]);
    } else if (arg === "--delay-ms") {
      options.delayMs = Number(argv[++i]);
    }
  }

  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttle() {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < delayMs) {
    await sleep(delayMs - elapsed);
  }
  lastRequestAt = Date.now();
}

async function fetchWithRetry(url, options = {}, retries = 3) {
  await throttle();
  requestCount += 1;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "User-Agent": USER_AGENT,
        ...(options.headers || {}),
      },
    });

    if (response.status === 429 && attempt < retries) {
      console.warn(`Rate limited (429). Waiting 60s before retry...`);
      await sleep(60000);
      continue;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await response.json();
      if (
        json.error &&
        /maxlag|ratelimited/i.test(json.error.code || json.error.info || "")
      ) {
        if (attempt < retries) {
          console.warn(`API rate limit: ${json.error.info}. Waiting 60s...`);
          await sleep(60000);
          continue;
        }
      }
      return json;
    }

    return response;
  }

  throw new Error(`Failed after retries: ${url}`);
}

async function fetchParseHtml(pageTitle) {
  const params = new URLSearchParams({
    action: "parse",
    page: pageTitle,
    prop: "text",
    format: "json",
    redirects: "true",
  });
  const json = await fetchWithRetry(`${WIKI_API}?${params}`);
  if (json.error) {
    throw new Error(json.error.info || json.error.code);
  }
  const text = json.parse.text;
  return typeof text === "string" ? text : text["*"];
}

function readLocalHtml(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function normalizeLabel(text) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cellText($, cell) {
  return normalizeLabel($(cell).text());
}

function parseYearFromListLine(text) {
  const matches = [...text.matchAll(/\((\d{4})\)/g)];
  if (matches.length === 0) {
    return null;
  }
  return matches[matches.length - 1][1];
}

function parseAuthorFromListLine(listAuthor) {
  if (!listAuthor) {
    return null;
  }

  let line = normalizeLabel(listAuthor).replace(/\s*\(\d{4}\)\s*$/, "").trim();
  const editedMatch = line.match(/edited by\s+(.+)$/i);
  if (editedMatch) {
    return normalizeLabel(editedMatch[1]);
  }

  const byMatch = line.match(/(?:^|,\s*)by\s+(.+)$/i);
  if (byMatch) {
    return normalizeLabel(byMatch[1].split(/\s+vol\.\s+/i)[0]) || null;
  }

  return null;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function wikiTitleFromHref(href) {
  if (!href) {
    return null;
  }
  const match = href.match(/\/wiki\/([^#?]+)/);
  if (!match) {
    return null;
  }
  return decodeURIComponent(match[1].replace(/\+/g, " "));
}

function wikiUrlFromTitle(title) {
  return `${WIKI_BASE}/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

function expectedCoverPaths(book) {
  const wikiTitle = wikiTitleFromHref(book.wikipediaUrl);
  const slugBase = slugify(wikiTitle || book.listTitle || book.title);
  const id = book.id;
  if (!slugBase || !id) {
    return [];
  }
  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].map((ext) =>
    path.join("covers", `${slugBase}-${id}${ext}`),
  );
}

function findLocalCoverFile(book) {
  if (book.coverImageFile) {
    const filePath = path.join(ROOT, book.coverImageFile);
    if (fs.existsSync(filePath)) {
      return book.coverImageFile.replace(/\\/g, "/");
    }
  }

  for (const relativePath of expectedCoverPaths(book)) {
    if (fs.existsSync(path.join(ROOT, relativePath))) {
      return relativePath.replace(/\\/g, "/");
    }
  }

  if (book.id && fs.existsSync(COVERS_DIR)) {
    const idSuffix = `-${book.id}.`;
    for (const name of fs.readdirSync(COVERS_DIR)) {
      if (name.includes(idSuffix)) {
        return `covers/${name}`.replace(/\\/g, "/");
      }
    }
  }

  return null;
}

function bookHasLocalCover(book) {
  return Boolean(findLocalCoverFile(book));
}

function preserveCoverFields(existing, incoming) {
  const localCover = findLocalCoverFile(existing);
  if (localCover) {
    return {
      coverImageFile: localCover,
      coverImageUrl: existing.coverImageUrl ?? incoming.coverImageUrl ?? null,
    };
  }

  return {
    coverImageFile: existing.coverImageFile || incoming.coverImageFile,
    coverImageUrl: existing.coverImageUrl || incoming.coverImageUrl,
  };
}

function reconcileCoverFiles(books) {
  return books.map((book) => {
    const localCover = findLocalCoverFile(book);
    if (!localCover) {
      return book;
    }

    if (book.coverImageFile === localCover) {
      return book;
    }

    return {
      ...book,
      coverImageFile: localCover,
    };
  });
}

function headingText(node) {
  const h = node.find("h2, h3").first();
  return h.length ? normalizeLabel(h.text()) : normalizeLabel(node.text());
}

function isSectionStop(node) {
  const tag = node.prop("tagName")?.toLowerCase();
  if (tag === "h2") {
    return true;
  }
  if (tag === "div" && node.hasClass("mw-heading") && node.find("h2").length) {
    return true;
  }
  return false;
}

function decadeFromYear(year) {
  const value = parseInt(year, 10);
  if (!value) {
    return null;
  }
  if (value < 1940) {
    return String(value);
  }
  return `${Math.floor(value / 10) * 10}s`;
}

function entryDecade(entry) {
  if (entry.decade) {
    return entry.decade;
  }
  return decadeFromYear(entry.listYear);
}

function extractBibliography(html, { sectionId }) {
  const $ = cheerio.load(html);
  const heading = $(`[id="${sectionId}"]`);
  if (!heading.length) {
    throw new Error(`Bibliography section not found: ${sectionId}`);
  }

  const entries = [];
  let decade = null;
  let node = heading.parent().next();

  while (node.length) {
    if (isSectionStop(node)) {
      break;
    }

    const tag = node.prop("tagName")?.toLowerCase();
    if (tag === "h3") {
      decade = headingText(node);
    } else if (
      tag === "div" &&
      node.hasClass("mw-heading") &&
      node.find("h3").length
    ) {
      decade = headingText(node);
    } else if (tag === "ul") {
      collectListItems($, node, decade, entries);
    }

    node = node.next();
  }

  return entries;
}

function collectListItems($, ul, decade, entries) {
  ul.children("li").each((_, li) => {
    const $li = $(li);
    const italic = $li.children("i").first();
    const link = italic.find("a").first();
    const listTitle = normalizeLabel(link.length ? link.text() : italic.text());
    const wikiTitle = link.length ? wikiTitleFromHref(link.attr("href")) : null;
    const fullText = normalizeLabel($li.text());
    let listAuthor = fullText.startsWith(listTitle)
      ? normalizeLabel(fullText.slice(listTitle.length))
      : fullText;
    listAuthor = listAuthor.replace(/^,\s*/, "");

    entries.push({
      decade,
      listTitle,
      listAuthor,
      wikipediaTitle: wikiTitle,
      wikipediaUrl: wikiTitle ? wikiUrlFromTitle(wikiTitle) : null,
      listYear: parseYearFromListLine(fullText),
    });

    const nested = $li.children("ul").first();
    if (nested.length) {
      collectListItems($, nested, decade, entries);
    }
  });
}

function infoboxRowValue($, infobox, labelPattern) {
  let value = null;
  infobox.find("tr").each((_, row) => {
    const label = cellText($, $(row).find("th.infobox-label").first());
    if (labelPattern.test(label)) {
      value = cellText($, $(row).find("td.infobox-data").first());
    }
  });
  return value || null;
}

function parseCoverArtistFromCaption(caption) {
  const match = caption.match(
    /(?:dust\s*jacket\s*(?:illustration|art(?:work)?|design)\s*by|cover\s*(?:art(?:work)?|by))\s+(.+?)\.?$/i,
  );
  return match ? normalizeLabel(match[1]) : null;
}

function normalizeWikimediaImageUrl(url) {
  if (!url) {
    return null;
  }

  let normalized = url;
  if (normalized.startsWith("//")) {
    normalized = `https:${normalized}`;
  }

  normalized = normalized.split("?")[0];

  const thumbMatch = normalized.match(
    /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+\/)thumb\/(.+\/)(?:\d+px-)?[^/]+$/,
  );
  if (thumbMatch) {
    normalized = `${thumbMatch[1]}${thumbMatch[2].replace(/\/$/, "")}`;
  }

  return normalized;
}

function resolveImageUrl(src, srcset) {
  if (srcset) {
    const parts = srcset
      .split(",")
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean);
    const best = parts[parts.length - 1];
    if (best && !best.includes("_files/")) {
      src = best;
    }
  }

  if (!src || src.includes("_files/")) {
    return null;
  }

  if (src.startsWith("//")) {
    return normalizeWikimediaImageUrl(`https:${src}`);
  }
  if (src.startsWith("http")) {
    return normalizeWikimediaImageUrl(src);
  }
  if (src.startsWith("/")) {
    return normalizeWikimediaImageUrl(`${WIKI_BASE}${src}`);
  }
  return normalizeWikimediaImageUrl(src);
}

function parseBookPage(html, options = {}) {
  const { allowOgImage = true } = options;
  const $ = cheerio.load(html);
  const infobox =
    $("table.infobox.ib-book").first().length > 0
      ? $("table.infobox.ib-book").first()
      : $("table.infobox").first();

  let title = normalizeLabel($("#firstHeading").text()) || null;
  let author = null;
  let coverArtist = null;
  let publicationDate = null;
  let coverImageUrl = null;

  if (infobox.length) {
    const infoboxTitle = normalizeLabel(
      infobox
        .find(".infobox-title")
        .first()
        .clone()
        .children("span")
        .remove()
        .end()
        .text(),
    );
    if (infoboxTitle) {
      title = infoboxTitle;
    }

    author = infoboxRowValue($, infobox, /^Author$/);
    if (!author) {
      author = infoboxRowValue($, infobox, /^Editor$/);
    }
    coverArtist = infoboxRowValue($, infobox, /^Cover artist$/);
    publicationDate = infoboxRowValue($, infobox, /^Publication date$/);

    const imageCell = infobox.find(".infobox-image").first();
    const img = imageCell.find("img").first();
    coverImageUrl = resolveImageUrl(img.attr("src"), img.attr("srcset"));

    if (!coverArtist) {
      coverArtist = parseCoverArtistFromCaption(
        cellText($, imageCell.find(".infobox-caption").first()),
      );
    }
  }

  if (!coverImageUrl && allowOgImage) {
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage && ogImage.includes("upload.wikimedia.org")) {
      coverImageUrl = normalizeWikimediaImageUrl(ogImage);
    }
  }

  return {
    title,
    author,
    coverArtist,
    publicationDate,
    coverImageUrl,
  };
}

async function getBookMetadata(wikipediaTitle, options = {}) {
  if (pageCache.has(wikipediaTitle)) {
    return pageCache.get(wikipediaTitle);
  }

  let html;
  if (args.local) {
    if (
      wikipediaTitle === "The_Dark_Brotherhood_and_Other_Pieces" &&
      fs.existsSync(SAMPLE_BOOK_LOCAL)
    ) {
      html = readLocalHtml(SAMPLE_BOOK_LOCAL);
    } else {
      const empty = {
        title: null,
        author: null,
        coverArtist: null,
        publicationDate: null,
        coverImageUrl: null,
      };
      pageCache.set(wikipediaTitle, empty);
      return empty;
    }
  } else {
    html = await fetchParseHtml(wikipediaTitle);
  }

  const metadata = parseBookPage(html, options);
  pageCache.set(wikipediaTitle, metadata);
  return metadata;
}

function extensionFromUrl(url) {
  const pathname = new URL(url).pathname;
  const ext = path.extname(pathname).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
    return ext === ".jpeg" ? ".jpg" : ext;
  }
  return ".jpg";
}

async function downloadCover(url, slug) {
  if (!url) {
    return null;
  }

  if (coverDownloadCache.has(url)) {
    return coverDownloadCache.get(url);
  }

  const ext = extensionFromUrl(url);
  const filename = `${slug}${ext}`;
  const filePath = path.join(COVERS_DIR, filename);
  const relativePath = path.join("covers", filename);

  if (fs.existsSync(filePath)) {
    coverDownloadCache.set(url, relativePath);
    return relativePath;
  }

  await throttle();
  requestCount += 1;

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Cover download failed: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  coverDownloadCache.set(url, relativePath);
  return relativePath;
}

function formatEta(processed, total, startedAt) {
  if (processed === 0) {
    return "?";
  }
  const elapsed = Date.now() - startedAt;
  const perItem = elapsed / processed;
  const remaining = Math.max(0, total - processed);
  const seconds = Math.ceil((remaining * perItem) / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  return `${Math.ceil(seconds / 60)} min`;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parseYear(value) {
  if (!value) {
    return null;
  }
  const match = String(value).match(/\d{4}/);
  return match ? match[0] : null;
}

function parseCollectionCsv(csvText) {
  return csvText
    .trim()
    .split(/\r?\n/)
    .map(parseCsvLine)
    .filter((cols) => cols.length >= 3)
    .map((cols) => ({
      title: cols[0].trim(),
      author: cols[1]?.trim() || "",
      year: parseYear(cols[2]),
      status: cols[3]?.trim() || "",
    }))
    .filter((item) => {
      if (!item.title || !item.year) {
        return false;
      }
      if (item.title.toUpperCase() === "ARKHAM HOUSE") {
        return false;
      }
      if (/^\d+ on order/i.test(item.title)) {
        return false;
      }
      return true;
    });
}

function publisherNameForImprint(imprint) {
  return (
    IMPRINTS[imprint]?.openLibraryPublisher ||
    IMPRINTS.arkham_house.openLibraryPublisher
  );
}

function bookMatchKey(book) {
  const imprint = book.imprint || "arkham_house";
  const year =
    book.publicationDate || parseYearFromListLine(book.listAuthor || "") || "";
  if (book.wikipediaUrl) {
    return `${imprint}|${book.wikipediaUrl}|${year}`;
  }
  return `${imprint}|${book.listTitle || book.title}|${year}`;
}

function migrateLegacyImprints(books) {
  return books.map((book) => ({
    ...book,
    imprint: book.imprint || "arkham_house",
  }));
}

function mergeBooks(existingBooks, incomingBooks) {
  const merged = migrateLegacyImprints([...existingBooks]);
  const indexByKey = new Map();
  merged.forEach((book, index) => {
    indexByKey.set(bookMatchKey(book), index);
  });

  let nextId = merged.reduce((max, book) => Math.max(max, book.id || 0), 0);

  for (const incoming of incomingBooks) {
    const key = bookMatchKey(incoming);
    const existingIndex = indexByKey.get(key);
    if (existingIndex !== undefined) {
      const existing = merged[existingIndex];
      merged[existingIndex] = {
        ...incoming,
        id: existing.id,
        hidden: existing.hidden,
        ...preserveCoverFields(existing, incoming),
      };
    } else {
      nextId += 1;
      merged.push({ ...incoming, id: nextId });
      indexByKey.set(key, merged.length - 1);
    }
  }

  return merged;
}

function loadExistingPayload() {
  const jsonPath = path.join(DATA_DIR, "books.json");
  if (!fs.existsSync(jsonPath)) {
    return { books: [], sourceUrls: {} };
  }
  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  return {
    ...payload,
    books: payload.books || [],
    sourceUrls: payload.sourceUrls || {},
  };
}

function mergeCrawlResults(arkhamBooks) {
  const existing = loadExistingPayload().books;
  if (!existing.length) {
    return arkhamBooks;
  }

  const mycroftBooks = existing.filter(
    (book) => book.imprint === "mycroft_moran",
  );
  const arkhamExisting = existing.filter(
    (book) => (book.imprint || "arkham_house") === "arkham_house",
  );
  const mergedArkham = mergeBooks(arkhamExisting, arkhamBooks);
  return mycroftBooks.length
    ? mergeBooks(mergedArkham, mycroftBooks)
    : mergedArkham;
}

async function buildBookRecord(entry, imprint, id, progressLabel) {
  let metadata = {
    title: entry.listTitle,
    author: null,
    coverArtist: null,
    coverImageUrl: null,
  };
  let error = null;
  let coverImageFile = null;

  try {
    if (entry.wikipediaTitle) {
      console.log(`${progressLabel} Fetching ${entry.listTitle}`);
      const pageData = await getBookMetadata(entry.wikipediaTitle);
      metadata = {
        title: pageData.title || entry.listTitle,
        author: pageData.author,
        coverArtist: pageData.coverArtist,
        coverImageUrl: pageData.coverImageUrl,
      };
    } else {
      console.log(`${progressLabel} No wiki link: ${entry.listTitle}`);
    }

    if (!metadata.author) {
      metadata.author = parseAuthorFromListLine(entry.listAuthor);
    }

    if (!args.skipDownload && metadata.coverImageUrl && !args.local && id) {
      const tempBook = {
        id,
        wikipediaUrl: entry.wikipediaUrl,
        listTitle: entry.listTitle,
        title: entry.listTitle,
      };
      const existingCover = findLocalCoverFile(tempBook);
      if (existingCover) {
        coverImageFile = existingCover;
      } else {
        const slugBase = slugify(entry.wikipediaTitle || entry.listTitle);
        const slug = `${slugBase}-${id}`;
        try {
          coverImageFile = await downloadCover(metadata.coverImageUrl, slug);
        } catch (downloadError) {
          error = downloadError.message;
        }
      }
    }
  } catch (fetchError) {
    error = fetchError.message;
  }

  return {
    book: {
      ...(id ? { id } : {}),
      imprint,
      decade: entryDecade(entry),
      listTitle: entry.listTitle,
      listAuthor: entry.listAuthor,
      title: metadata.title || entry.listTitle,
      author: metadata.author,
      coverArtist: metadata.coverArtist,
      publicationDate: entry.listYear,
      wikipediaUrl: entry.wikipediaUrl,
      coverImageUrl: metadata.coverImageUrl,
      coverImageFile,
      hidden: false,
      error,
    },
    failure: error ? { title: entry.listTitle, error } : null,
  };
}

async function syncPublicationDates() {
  const payload = loadExistingPayload();
  const dateByKey = new Map();

  for (const [imprint, config] of Object.entries(IMPRINTS)) {
    let html;
    if (args.local) {
      const localPath = path.join(EXAMPLES_DIR, config.localFile);
      if (!fs.existsSync(localPath)) {
        console.warn(`Skipping ${imprint}: missing ${localPath}`);
        continue;
      }
      html = readLocalHtml(localPath);
    } else {
      console.log(`Fetching bibliography for ${imprint}...`);
      html = await fetchParseHtml(config.wikiPage);
    }

    const entries = extractBibliography(html, { sectionId: config.sectionId });
    for (const entry of entries) {
      if (!entry.listYear) {
        continue;
      }
      if (entry.wikipediaUrl) {
        dateByKey.set(
          `${imprint}|${entry.wikipediaUrl}|${entry.listYear}`,
          entry.listYear,
        );
      }
      dateByKey.set(
        `${imprint}|title|${entry.listTitle}|${entry.listYear}`,
        entry.listYear,
      );
    }
  }

  let updated = 0;
  for (const book of payload.books) {
    const imprint = book.imprint || "arkham_house";
    const authorYear = parseYearFromListLine(book.listAuthor || "");
    let listYear = null;
    if (authorYear) {
      if (book.wikipediaUrl) {
        listYear = dateByKey.get(
          `${imprint}|${book.wikipediaUrl}|${authorYear}`,
        );
      }
      if (!listYear && book.listTitle) {
        listYear = dateByKey.get(
          `${imprint}|title|${book.listTitle}|${authorYear}`,
        );
      }
    }
    if (listYear && book.publicationDate !== listYear) {
      book.publicationDate = listYear;
      updated += 1;
    }
  }

  const { jsonPath, jsPath } = writeOutput(payload);
  console.log(`Updated publicationDate on ${updated} books`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`JS:   ${jsPath}`);
}

function syncAuthors() {
  const payload = loadExistingPayload();
  let updated = 0;

  for (const book of payload.books) {
    if (book.author) {
      continue;
    }

    const author = parseAuthorFromListLine(book.listAuthor);
    if (!author) {
      continue;
    }

    book.author = author;
    updated += 1;
  }

  const { jsonPath, jsPath } = writeOutput(payload);
  const stillMissing = payload.books.filter((book) => !book.author).length;

  console.log(`Filled ${updated} authors from bibliography lines.`);
  console.log(`Still missing author: ${stillMissing}`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`JS:   ${jsPath}`);
}

function syncCollectionFromCsv() {
  if (!fs.existsSync(COLLECTION_CSV)) {
    throw new Error(`Missing collection CSV: ${COLLECTION_CSV}`);
  }

  const items = parseCollectionCsv(fs.readFileSync(COLLECTION_CSV, "utf8"));
  fs.mkdirSync(path.dirname(COLLECTION_JS), { recursive: true });
  fs.writeFileSync(
    COLLECTION_JS,
    `window.MY_COLLECTION = ${JSON.stringify(items, null, 2)};\n`,
  );
  console.log(`Synced ${items.length} collection items to ${COLLECTION_JS}`);
}

function writeOutput(payload) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(COVERS_DIR, { recursive: true });

  const reconciledBooks = reconcileCoverFiles(payload.books);
  const output = { ...payload, books: reconciledBooks };

  const jsonPath = path.join(DATA_DIR, "books.json");
  const jsPath = path.join(DATA_DIR, "books.js");

  fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(
    jsPath,
    `window.BOOKS = ${JSON.stringify(reconciledBooks, null, 2)};\n`,
  );

  return { jsonPath, jsPath };
}

function reconcileCoversFromDisk() {
  const jsonPath = path.join(DATA_DIR, "books.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Missing ${jsonPath}. Run the crawler first.`);
  }

  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const before = payload.books.filter((book) => book.coverImageFile).length;
  const { jsonPath: outJson, jsPath } = writeOutput(payload);
  const after = JSON.parse(fs.readFileSync(outJson, "utf8")).books.filter(
    (book) => book.coverImageFile,
  ).length;

  console.log(
    `Linked cover files: ${before} -> ${after} of ${payload.books.length} books`,
  );
  console.log(`JSON: ${outJson}`);
  console.log(`JS:   ${jsPath}`);
}

function normalizeForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''""]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titlesMatch(a, b) {
  const left = normalizeForMatch(a);
  const right = normalizeForMatch(b);
  if (!left || !right) {
    return false;
  }
  return left === right || left.includes(right) || right.includes(left);
}

function bookHasCover(book) {
  if (bookHasLocalCover(book)) {
    return true;
  }

  return Boolean(book.coverImageUrl);
}

const WIKI_IMAGE_SKIP =
  /(?:\.svg$|commons-logo|ambox|edit-clear|question_book|wikimedia|open book|icon|logo|flag|map)/i;

async function fetchWikipediaFileUrl(fileTitle) {
  const params = new URLSearchParams({
    action: "query",
    titles: fileTitle,
    prop: "imageinfo",
    iiprop: "url",
    format: "json",
  });
  const json = await fetchWithRetry(`${WIKI_API}?${params}`);
  const page = Object.values(json.query.pages)[0];
  return page?.imageinfo?.[0]?.url || null;
}

function scoreWikiImageFile(fileTitle, book) {
  const file = normalizeForMatch(fileTitle.replace(/^file:/i, ""));
  if (WIKI_IMAGE_SKIP.test(fileTitle) || /\blogo\b/.test(file)) {
    return -1;
  }

  const bookNorm = normalizeForMatch(book.title);
  const words = bookNorm.split(/\s+/).filter((word) => word.length > 3);
  let score = 0;

  for (const word of words) {
    if (file.includes(word)) {
      score += 3;
    }
  }

  if (/collector/.test(bookNorm) && /collector/.test(file)) {
    score += 5;
  }
  if (/sampler/.test(bookNorm) && /sampler/.test(file)) {
    score += 5;
  }
  if (/cover|dust|jacket|edition/.test(file)) {
    score += 2;
  }

  return score;
}

async function pickBestWikipediaArticleImage(pageTitle, book, minScore = 1) {
  const params = new URLSearchParams({
    action: "query",
    titles: pageTitle,
    prop: "images",
    imlimit: "50",
    format: "json",
  });
  const json = await fetchWithRetry(`${WIKI_API}?${params}`);
  const page = Object.values(json.query.pages)[0];
  if (!page?.images?.length) {
    return null;
  }

  const candidates = [];

  for (const image of page.images) {
    const fileTitle = image.title;
    const score = scoreWikiImageFile(fileTitle, book);
    if (score < minScore) {
      continue;
    }

    const url = await fetchWikipediaFileUrl(fileTitle);
    if (url) {
      candidates.push({
        score,
        coverImageUrl: normalizeWikimediaImageUrl(url),
        fileTitle,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

async function searchWikipediaTitle(book) {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: [
      book.title,
      book.publicationDate,
      publisherNameForImprint(book.imprint),
    ]
      .filter(Boolean)
      .join(" "),
    srlimit: "8",
    format: "json",
  });
  const json = await fetchWithRetry(`${WIKI_API}?${params}`);
  const results = json.query?.search || [];

  for (const result of results) {
    if (
      titlesMatch(result.title, book.title) ||
      titlesMatch(result.title, book.listTitle)
    ) {
      return result.title;
    }
  }

  return null;
}

function scoreOpenLibraryMatch(doc, book) {
  if (!doc.cover_i) {
    return -1;
  }

  let score = 0;
  const docTitle = doc.title || "";
  if (
    titlesMatch(docTitle, book.title) ||
    titlesMatch(docTitle, book.listTitle)
  ) {
    score += 10;
  } else if (
    normalizeForMatch(docTitle).includes(
      normalizeForMatch(book.title).slice(0, 12),
    )
  ) {
    score += 4;
  } else {
    return -1;
  }

  const bookYear = parseYear(book.publicationDate || book.listYear);
  if (bookYear && String(doc.first_publish_year) === bookYear) {
    score += 5;
  }

  const publisherPattern = new RegExp(
    publisherNameForImprint(book.imprint).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    ),
    "i",
  );
  if (
    Array.isArray(doc.publisher) &&
    doc.publisher.some((p) => publisherPattern.test(p))
  ) {
    score += 3;
  }

  return score;
}

async function searchOpenLibraryCover(book) {
  const year = parseYear(book.publicationDate);
  const queries = [
    { title: book.title, year },
    { title: book.listTitle, year },
  ];

  if (book.author) {
    queries.push({ title: book.title, year, author: book.author });
  }

  let best = null;

  for (const query of queries) {
    const params = new URLSearchParams({
      title: query.title,
      limit: "8",
    });
    if (query.year) {
      params.set("first_publish_year", query.year);
    }
    if (query.author) {
      params.set("author", query.author);
    }

    const json = await fetchWithRetry(
      `https://openlibrary.org/search.json?${params}`,
    );
    for (const doc of json.docs || []) {
      const score = scoreOpenLibraryMatch(doc, book);
      if (score > (best?.score || 0)) {
        best = {
          score,
          coverImageUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
          source: "openlibrary",
          matchedTitle: doc.title,
        };
      }
    }
  }

  return best;
}

async function findCoverForBook(book) {
  const wikipediaTitle = wikiTitleFromHref(book.wikipediaUrl);
  const attempts = [];

  if (wikipediaTitle) {
    try {
      const pageData = await getBookMetadata(wikipediaTitle, {
        allowOgImage: true,
      });
      if (pageData.coverImageUrl) {
        return {
          coverImageUrl: pageData.coverImageUrl,
          source: "wikipedia-infobox",
          wikipediaTitle,
        };
      }
      attempts.push("infobox empty");
    } catch (error) {
      attempts.push(`infobox: ${error.message}`);
    }

    try {
      const image = await pickBestWikipediaArticleImage(
        wikipediaTitle,
        book,
        1,
      );
      if (image) {
        return {
          coverImageUrl: image.coverImageUrl,
          source: "wikipedia-article-image",
          wikipediaTitle,
        };
      }
      attempts.push("no matching article images");
    } catch (error) {
      attempts.push(`article images: ${error.message}`);
    }
  }

  try {
    const openLibrary = await searchOpenLibraryCover(book);
    if (openLibrary) {
      return openLibrary;
    }
    attempts.push("no open library match");
  } catch (error) {
    attempts.push(`open library: ${error.message}`);
  }

  if (!wikipediaTitle) {
    try {
      const foundTitle = await searchWikipediaTitle(book);
      if (foundTitle) {
        const pageData = await getBookMetadata(foundTitle, {
          allowOgImage: false,
        });
        if (pageData.coverImageUrl) {
          return {
            coverImageUrl: pageData.coverImageUrl,
            source: "wikipedia-search-infobox",
            wikipediaTitle: foundTitle,
            wikipediaUrl: wikiUrlFromTitle(foundTitle),
          };
        }

        const image = await pickBestWikipediaArticleImage(foundTitle, book, 3);
        if (image) {
          return {
            coverImageUrl: image.coverImageUrl,
            source: "wikipedia-search-image",
            wikipediaTitle: foundTitle,
            wikipediaUrl: wikiUrlFromTitle(foundTitle),
          };
        }
        attempts.push(`search found ${foundTitle} but no cover image`);
      } else {
        attempts.push("no wikipedia search result");
      }
    } catch (error) {
      attempts.push(`wikipedia search: ${error.message}`);
    }
  }

  return { coverImageUrl: null, attempts };
}

async function fillMissingCovers() {
  const jsonPath = path.join(DATA_DIR, "books.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Missing ${jsonPath}. Run the crawler first.`);
  }

  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  payload.books = reconcileCoverFiles(payload.books);

  const missing = payload.books.filter((book) => !bookHasCover(book));
  const toProcess = missing.slice(0, args.limit);

  console.log(
    `Found ${missing.length} books without covers; processing ${toProcess.length}`,
  );
  if (args.dryRun) {
    console.log("Dry run — no files will be downloaded or written");
  }
  console.log(`Request delay: ${delayMs}ms`);

  const startedAt = Date.now();
  let filled = 0;
  let failed = 0;

  for (let index = 0; index < toProcess.length; index += 1) {
    const book = toProcess[index];
    const progress = `[${index + 1}/${toProcess.length}]`;
    const eta = formatEta(index, toProcess.length, startedAt);
    console.log(`${progress} ${book.title} (~${eta} remaining)`);

    const result = await findCoverForBook(book);
    if (!result.coverImageUrl) {
      failed += 1;
      console.log(`  No cover found (${(result.attempts || []).join("; ")})`);
      continue;
    }

    console.log(`  Found via ${result.source}: ${result.coverImageUrl}`);

    if (args.dryRun) {
      filled += 1;
      continue;
    }

    const bookIndex = payload.books.findIndex((entry) => entry.id === book.id);
    if (bookIndex === -1) {
      continue;
    }

    const currentBook = payload.books[bookIndex];
    if (bookHasLocalCover(currentBook)) {
      console.log("  Skipped — local cover already on disk");
      continue;
    }

    const slugBase = slugify(
      wikiTitleFromHref(book.wikipediaUrl) || book.title,
    );
    const slug = `${slugBase}-${book.id}`;
    let coverImageFile = null;
    let error = null;

    try {
      coverImageFile = await downloadCover(result.coverImageUrl, slug);
    } catch (downloadError) {
      error = downloadError.message;
      console.log(`  Download failed: ${error}`);
      failed += 1;
      continue;
    }

    payload.books[bookIndex] = {
      ...payload.books[bookIndex],
      coverImageUrl: result.coverImageUrl,
      coverImageFile,
      wikipediaUrl:
        result.wikipediaUrl || payload.books[bookIndex].wikipediaUrl,
      error: error || payload.books[bookIndex].error,
    };

    writeOutput(payload);
    filled += 1;
    console.log(`  Saved ${coverImageFile}`);
  }

  console.log("");
  console.log(
    `Done. Filled ${filled}, still missing ${missing.length - filled}, failed ${failed}.`,
  );
  console.log(`HTTP requests made: ${requestCount}`);
}

async function crawlMycroftOnly() {
  const imprintConfig = IMPRINTS.mycroft_moran;
  const existingPayload = loadExistingPayload();
  const existingBooks = existingPayload.books;

  console.log(
    args.local
      ? "Running Mycroft & Moran crawl in local mode"
      : "Running live Mycroft & Moran crawl (merge with existing data)",
  );
  console.log(`Request delay: ${delayMs}ms`);
  console.log(`Existing books: ${existingBooks.length}`);

  let html;
  if (args.local) {
    if (!fs.existsSync(MYCROFT_LOCAL)) {
      throw new Error(`Missing local file: ${MYCROFT_LOCAL}`);
    }
    html = readLocalHtml(MYCROFT_LOCAL);
  } else {
    html = await fetchParseHtml(imprintConfig.wikiPage);
  }

  const bibliography = extractBibliography(html, {
    sectionId: imprintConfig.sectionId,
  });
  const limited = bibliography.slice(0, args.limit);
  console.log(
    `Found ${bibliography.length} Mycroft & Moran entries; processing ${limited.length}`,
  );

  const incomingBooks = [];
  const failures = [];
  const startedAt = Date.now();

  for (let index = 0; index < limited.length; index += 1) {
    const entry = limited[index];
    const progress = `[${index + 1}/${limited.length}]`;
    const eta = formatEta(index, limited.length, startedAt);
    const { book, failure } = await buildBookRecord(
      entry,
      "mycroft_moran",
      null,
      `${progress} (~${eta} remaining)`,
    );
    incomingBooks.push(book);
    if (failure) {
      failures.push(failure);
    }
  }

  const mergedBooks = mergeBooks(existingBooks, incomingBooks);

  if (!args.skipDownload && !args.local) {
    for (const book of mergedBooks) {
      if (
        book.imprint !== "mycroft_moran" ||
        bookHasLocalCover(book) ||
        !book.coverImageUrl
      ) {
        continue;
      }

      const wikiTitle = wikiTitleFromHref(book.wikipediaUrl);
      const slugBase = slugify(wikiTitle || book.listTitle || book.title);
      const slug = `${slugBase}-${book.id}`;
      try {
        book.coverImageFile = await downloadCover(book.coverImageUrl, slug);
      } catch (downloadError) {
        book.error = downloadError.message;
        failures.push({ title: book.title, error: downloadError.message });
      }
    }
  }

  const payload = {
    scrapedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    sourceUrls: {
      arkham_house: SOURCE_URL,
      ...existingPayload.sourceUrls,
      mycroft_moran: imprintConfig.sourceUrl,
    },
    books: mergedBooks,
  };

  const { jsonPath, jsPath } = writeOutput(payload);

  if (fs.existsSync(COLLECTION_CSV)) {
    syncCollectionFromCsv();
  }

  const mycroftCount = mergedBooks.filter(
    (book) => book.imprint === "mycroft_moran",
  ).length;
  console.log("");
  console.log(
    `Done. ${mergedBooks.length} total books (${mycroftCount} Mycroft & Moran).`,
  );
  console.log(`JSON: ${jsonPath}`);
  console.log(`JS:   ${jsPath}`);
  console.log(`HTTP requests made: ${requestCount}`);
  if (failures.length) {
    console.log(`Failures (${failures.length}):`);
    failures.slice(0, 10).forEach((failure) => {
      console.log(`  - ${failure.title}: ${failure.error}`);
    });
    if (failures.length > 10) {
      console.log(`  ... and ${failures.length - 10} more`);
    }
  }
}

async function main() {
  console.log(
    args.local
      ? "Running in local mode (no live Wikipedia requests except optional cover downloads)"
      : "Running live Wikipedia crawl",
  );
  console.log(`Request delay: ${delayMs}ms`);

  let arkhamHtml;
  if (args.local) {
    if (!fs.existsSync(ARKHAM_LOCAL)) {
      throw new Error(`Missing local file: ${ARKHAM_LOCAL}`);
    }
    arkhamHtml = readLocalHtml(ARKHAM_LOCAL);
  } else {
    arkhamHtml = await fetchParseHtml("Arkham_House");
  }

  const bibliography = extractBibliography(arkhamHtml, {
    sectionId: IMPRINTS.arkham_house.sectionId,
  });
  const limited = bibliography.slice(0, args.limit);
  console.log(
    `Found ${bibliography.length} bibliography entries; processing ${limited.length}`,
  );

  const books = [];
  const failures = [];
  const startedAt = Date.now();
  const scrapedAt = new Date().toISOString();
  const uniquePages = new Set(
    limited
      .filter((entry) => entry.wikipediaTitle)
      .map((entry) => entry.wikipediaTitle),
  );
  const estimatedRequests =
    (args.local ? 0 : 1) +
    (args.local ? 0 : uniquePages.size) +
    (args.skipDownload ? 0 : uniquePages.size);

  for (let index = 0; index < limited.length; index += 1) {
    const entry = limited[index];
    const progress = `[${index + 1}/${limited.length}]`;
    const eta = formatEta(
      index,
      estimatedRequests || limited.length,
      startedAt,
    );
    const { book, failure } = await buildBookRecord(
      entry,
      "arkham_house",
      index + 1,
      `${progress} (~${eta} remaining)`,
    );
    if (failure) {
      failures.push(failure);
    }
    books.push(book);

    writeOutput({
      scrapedAt,
      sourceUrl: SOURCE_URL,
      sourceUrls: {
        arkham_house: SOURCE_URL,
        ...(loadExistingPayload().sourceUrls || {}),
      },
      inProgress: index < limited.length - 1,
      books: mergeCrawlResults(books),
    });
  }

  const payload = {
    scrapedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    sourceUrls: {
      arkham_house: SOURCE_URL,
      ...(loadExistingPayload().sourceUrls || {}),
    },
    books: mergeCrawlResults(books),
  };

  const { jsonPath, jsPath } = writeOutput(payload);

  if (fs.existsSync(COLLECTION_CSV)) {
    syncCollectionFromCsv();
  }

  console.log("");
  console.log(`Done. Wrote ${books.length} books.`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`JS:   ${jsPath}`);
  console.log(`HTTP requests made: ${requestCount}`);
  if (failures.length) {
    console.log(`Failures (${failures.length}):`);
    failures.slice(0, 10).forEach((failure) => {
      console.log(`  - ${failure.title}: ${failure.error}`);
    });
    if (failures.length > 10) {
      console.log(`  ... and ${failures.length - 10} more`);
    }
  }
}

if (args.syncCollection) {
  try {
    syncCollectionFromCsv();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
} else if (args.reconcileCovers) {
  try {
    reconcileCoversFromDisk();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
} else if (args.fillCovers) {
  fillMissingCovers().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else if (args.mycroftOnly) {
  crawlMycroftOnly().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else if (args.syncPublicationDates) {
  syncPublicationDates().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else if (args.syncAuthors) {
  try {
    syncAuthors();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
} else {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
