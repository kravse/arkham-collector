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
const SAMPLE_BOOK_LOCAL = path.join(
  EXAMPLES_DIR,
  "The Dark Brotherhood and Other Pieces - Wikipedia.html"
);

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const WIKI_BASE = "https://en.wikipedia.org";
const SOURCE_URL = `${WIKI_BASE}/wiki/Arkham_House`;
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
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--local") {
      options.local = true;
    } else if (arg === "--skip-download") {
      options.skipDownload = true;
    } else if (arg === "--sync-collection") {
      options.syncCollection = true;
    } else if (arg === "--reconcile-covers") {
      options.reconcileCovers = true;
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
      if (json.error && /maxlag|ratelimited/i.test(json.error.code || json.error.info || "")) {
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
  return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
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
    path.join("covers", `${slugBase}-${id}${ext}`)
  );
}

function reconcileCoverFiles(books) {
  return books.map((book) => {
    if (book.coverImageFile) {
      const existing = path.join(ROOT, book.coverImageFile);
      if (fs.existsSync(existing)) {
        return book;
      }
    }

    for (const relativePath of expectedCoverPaths(book)) {
      if (fs.existsSync(path.join(ROOT, relativePath))) {
        return {
          ...book,
          coverImageFile: relativePath.replace(/\\/g, "/"),
        };
      }
    }

    return book;
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

function extractBibliography(html) {
  const $ = cheerio.load(html);
  const heading = $("#Bibliography_of_works_published_by_Arkham_House");
  if (!heading.length) {
    throw new Error("Bibliography section not found");
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
    } else if (tag === "div" && node.hasClass("mw-heading") && node.find("h3").length) {
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
    /(?:dust\s*jacket\s*(?:illustration|art(?:work)?|design)\s*by|cover\s*(?:art(?:work)?|by))\s+(.+?)\.?$/i
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
    /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+\/)thumb\/(.+\/)(?:\d+px-)?[^/]+$/
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

function parseBookPage(html) {
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
    const infoboxTitle = normalizeLabel(infobox.find(".infobox-title").first().clone().children("span").remove().end().text());
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
      coverArtist = parseCoverArtistFromCaption(cellText($, imageCell.find(".infobox-caption").first()));
    }
  }

  if (!coverImageUrl) {
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

async function getBookMetadata(wikipediaTitle) {
  if (pageCache.has(wikipediaTitle)) {
    return pageCache.get(wikipediaTitle);
  }

  let html;
  if (args.local) {
    if (wikipediaTitle === "The_Dark_Brotherhood_and_Other_Pieces" && fs.existsSync(SAMPLE_BOOK_LOCAL)) {
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

  const metadata = parseBookPage(html);
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

function syncCollectionFromCsv() {
  if (!fs.existsSync(COLLECTION_CSV)) {
    throw new Error(`Missing collection CSV: ${COLLECTION_CSV}`);
  }

  const items = parseCollectionCsv(fs.readFileSync(COLLECTION_CSV, "utf8"));
  fs.mkdirSync(path.dirname(COLLECTION_JS), { recursive: true });
  fs.writeFileSync(
    COLLECTION_JS,
    `window.MY_COLLECTION = ${JSON.stringify(items, null, 2)};\n`
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
  fs.writeFileSync(jsPath, `window.BOOKS = ${JSON.stringify(reconciledBooks, null, 2)};\n`);

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
    (book) => book.coverImageFile
  ).length;

  console.log(`Linked cover files: ${before} -> ${after} of ${payload.books.length} books`);
  console.log(`JSON: ${outJson}`);
  console.log(`JS:   ${jsPath}`);
}

async function main() {
  console.log(
    args.local
      ? "Running in local mode (no live Wikipedia requests except optional cover downloads)"
      : "Running live Wikipedia crawl"
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

  const bibliography = extractBibliography(arkhamHtml);
  const limited = bibliography.slice(0, args.limit);
  console.log(`Found ${bibliography.length} bibliography entries; processing ${limited.length}`);

  const books = [];
  const failures = [];
  const startedAt = Date.now();
  const scrapedAt = new Date().toISOString();
  const uniquePages = new Set(
    limited.filter((entry) => entry.wikipediaTitle).map((entry) => entry.wikipediaTitle)
  );
  const estimatedRequests =
    (args.local ? 0 : 1) +
    (args.local ? 0 : uniquePages.size) +
    (args.skipDownload ? 0 : uniquePages.size);

  for (let index = 0; index < limited.length; index += 1) {
    const entry = limited[index];
    const progress = `[${index + 1}/${limited.length}]`;
    const eta = formatEta(index, estimatedRequests || limited.length, startedAt);

    let metadata = {
      title: entry.listTitle,
      author: null,
      coverArtist: null,
      publicationDate: entry.listYear,
      coverImageUrl: null,
    };
    let error = null;
    let coverImageFile = null;

    try {
      if (entry.wikipediaTitle) {
        console.log(`${progress} Fetching ${entry.listTitle} (~${eta} remaining)`);
        const pageData = await getBookMetadata(entry.wikipediaTitle);
        metadata = {
          title: pageData.title || entry.listTitle,
          author: pageData.author,
          coverArtist: pageData.coverArtist,
          publicationDate: pageData.publicationDate || entry.listYear,
          coverImageUrl: pageData.coverImageUrl,
        };
      } else {
        console.log(`${progress} No wiki link: ${entry.listTitle}`);
      }

      if (!args.skipDownload && metadata.coverImageUrl && !args.local) {
        const slugBase = slugify(entry.wikipediaTitle || entry.listTitle);
        const slug = `${slugBase}-${index + 1}`;
        try {
          coverImageFile = await downloadCover(metadata.coverImageUrl, slug);
        } catch (downloadError) {
          error = downloadError.message;
          failures.push({ title: entry.listTitle, error: downloadError.message });
        }
      }
    } catch (fetchError) {
      error = fetchError.message;
      failures.push({ title: entry.listTitle, error: fetchError.message });
      metadata.publicationDate = metadata.publicationDate || entry.listYear;
    }

    books.push({
      id: index + 1,
      decade: entry.decade,
      listTitle: entry.listTitle,
      listAuthor: entry.listAuthor,
      title: metadata.title || entry.listTitle,
      author: metadata.author,
      coverArtist: metadata.coverArtist,
      publicationDate: metadata.publicationDate,
      wikipediaUrl: entry.wikipediaUrl,
      coverImageUrl: metadata.coverImageUrl,
      coverImageFile,
      hidden: false,
      error,
    });

    writeOutput({
      scrapedAt,
      sourceUrl: SOURCE_URL,
      inProgress: index < limited.length - 1,
      books,
    });
  }

  const payload = {
    scrapedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    books,
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
} else {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
