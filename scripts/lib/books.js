const fs = require("fs");
const path = require("path");
const {
  DATA_DIR,
  COVERS_DIR,
  EXAMPLES_DIR,
  SAMPLE_BOOK_LOCAL,
} = require("../config");
const { state } = require("../state");
const {
  parseAuthorFromListLine,
  parseYearFromListLine,
  resolveScrapedTitle,
  slugify,
} = require("./text");
const { wikiTitleFromHref } = require("./wiki-urls");
const { readLocalHtml, entryDecade } = require("./wiki-bibliography");
const { parseBookPage } = require("./wiki-book-page");
const { fetchParseHtml } = require("./http");
const {
  findLocalCoverFile,
  reconcileCoverFiles,
  downloadCover,
} = require("./covers-files");
const {
  loadEdits,
  getEditForBook,
  migrateLegacyHiddenFromBooks,
  stripScrapedHidden,
} = require("./edits");
const {
  deduplicateBookIds,
} = require("./book-ids");

function migrateLegacyImprints(books) {
  return books.map((book) => ({
    ...book,
    imprint: book.imprint || "arkham_house",
  }));
}

function replaceScrapedBooks(existingBooks, incomingBooks, imprint) {
  const imprintKey = imprint || "arkham_house";
  const migrated = migrateLegacyImprints(existingBooks);
  const otherBooks = migrated.filter(
    (book) => (book.imprint || "arkham_house") !== imprintKey,
  );
  const sameImprintExisting = migrated.filter(
    (book) => (book.imprint || "arkham_house") === imprintKey,
  );

  const indexByKey = new Map();
  sameImprintExisting.forEach((book) => {
    indexByKey.set(scrapedMatchKey(book), book);
  });

  let nextId = migrated.reduce((max, book) => Math.max(max, book.id || 0), 0);
  const replaced = [];

  for (const incoming of incomingBooks) {
    const key = scrapedMatchKey(incoming);
    const existing = indexByKey.get(key);
    if (existing) {
      replaced.push({
        ...incoming,
        id: existing.id,
        imprint: imprintKey,
        ...(incoming.goodreadsUrl == null && existing.goodreadsUrl
          ? { goodreadsUrl: existing.goodreadsUrl }
          : {}),
        ...(incoming.description == null && existing.description
          ? { description: existing.description }
          : {}),
      });
    } else {
      nextId += 1;
      replaced.push({ ...incoming, id: nextId, imprint: imprintKey });
    }
  }

  return [...otherBooks, ...replaced];
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
  return replaceScrapedBooks(existing, arkhamBooks, "arkham_house");
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

    const coverEdit = id
      ? getEditForBook(loadEdits().edits, id)?.coverImageFile
      : null;

    if (
      !coverEdit &&
      !state.args.skipDownload &&
      metadata.coverImageUrl &&
      !state.args.local &&
      id
    ) {
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
      listYear: entry.listYear || null,
      title: resolveScrapedTitle(entry.listTitle, metadata.title),
      author: metadata.author,
      coverArtist: metadata.coverArtist,
      publicationDate: entry.listYear,
      wikipediaUrl: entry.wikipediaUrl,
      coverImageUrl: metadata.coverImageUrl,
      coverImageFile,
      error,
    },
    failure: error ? { title: entry.listTitle, error } : null,
  };
}

function writeOutput(payload) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(COVERS_DIR, { recursive: true });

  const { books: dedupedBooks, splits, remapped } = deduplicateBookIds(
    payload.books,
  );
  if (splits.length > 0) {
    console.log(`Split ${splits.length} duplicate book id(s).`);
  }
  if (remapped > 0) {
    console.log(
      `Remapped edits for ${remapped} shared id(s) (hidden → reprints only).`,
    );
  }

  const reconciledBooks = reconcileCoverFiles(
    dedupedBooks,
    loadEdits().edits,
  );
  const migratedHidden = migrateLegacyHiddenFromBooks(reconciledBooks);
  if (migratedHidden > 0) {
    console.log(`Migrated ${migratedHidden} hidden book(s) to data/edits.json`);
  }
  const scrapedBooks = stripScrapedHidden(reconciledBooks);
  const output = { ...payload, books: scrapedBooks };

  const jsonPath = path.join(DATA_DIR, "books.json");
  const jsPath = path.join(DATA_DIR, "books.js");

  fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(
    jsPath,
    `window.BOOKS = ${JSON.stringify(scrapedBooks, null, 2)};\n`,
  );

  return { jsonPath, jsPath };
}

module.exports = {
  migrateLegacyImprints,
  replaceScrapedBooks,
  loadExistingPayload,
  mergeCrawlResults,
  getBookMetadata,
  buildBookRecord,
  writeOutput,
};
