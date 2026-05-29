const fs = require("fs");
const path = require("path");
const {
  DATA_DIR,
  COVERS_DIR,
  EXAMPLES_DIR,
  SAMPLE_BOOK_LOCAL,
} = require("../config");
const { state } = require("../state");
const { parseAuthorFromListLine, parseYearFromListLine, slugify } = require("./text");
const { wikiTitleFromHref } = require("./wiki-urls");
const { readLocalHtml, entryDecade } = require("./wiki-bibliography");
const { parseBookPage } = require("./wiki-book-page");
const { fetchParseHtml } = require("./http");
const {
  findLocalCoverFile,
  preserveCoverFields,
  reconcileCoverFiles,
  downloadCover,
} = require("./covers-files");

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
        description: existing.description ?? null,
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

async function getBookMetadata(wikipediaTitle, options = {}) {
  if (state.pageCache.has(wikipediaTitle)) {
    return state.pageCache.get(wikipediaTitle);
  }

  let html;
  if (state.args.local) {
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
      state.pageCache.set(wikipediaTitle, empty);
      return empty;
    }
  } else {
    html = await fetchParseHtml(wikipediaTitle);
  }

  const metadata = parseBookPage(html, options);
  state.pageCache.set(wikipediaTitle, metadata);
  return metadata;
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

    if (!state.args.skipDownload && metadata.coverImageUrl && !state.args.local && id) {
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

module.exports = {
  bookMatchKey,
  migrateLegacyImprints,
  mergeBooks,
  loadExistingPayload,
  mergeCrawlResults,
  getBookMetadata,
  buildBookRecord,
  writeOutput,
};
