const fs = require("fs");
const { IMPRINTS, SOURCE_URL, MYCROFT_LOCAL, COLLECTION_CSV } = require("../config");
const { state, delayMs } = require("../state");
const { formatEta, slugify } = require("../lib/text");
const { wikiTitleFromHref } = require("../lib/wiki-urls");
const { extractBibliography, readLocalHtml } = require("../lib/wiki-bibliography");
const { fetchParseHtml } = require("../lib/http");
const {
  loadExistingPayload,
  mergeBooks,
  buildBookRecord,
  writeOutput,
} = require("../lib/books");
const { bookHasLocalCover, downloadCover } = require("../lib/covers-files");
const { syncCollectionFromCsv } = require("../lib/collection");

async function crawlMycroftOnly() {
  const imprintConfig = IMPRINTS.mycroft_moran;
  const existingPayload = loadExistingPayload();
  const existingBooks = existingPayload.books;

  console.log(
    state.args.local
      ? "Running Mycroft & Moran crawl in local mode"
      : "Running live Mycroft & Moran crawl (merge with existing data)",
  );
  console.log(`Request delay: ${delayMs()}ms`);
  console.log(`Existing books: ${existingBooks.length}`);

  let html;
  if (state.args.local) {
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
  const limited = bibliography.slice(0, state.args.limit);
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

  if (!state.args.skipDownload && !state.args.local) {
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
  console.log(`HTTP requests made: ${state.requestCount}`);
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

module.exports = { crawlMycroftOnly };
