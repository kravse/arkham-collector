const fs = require("fs");
const { IMPRINTS, SOURCE_URL, ARKHAM_LOCAL, COLLECTION_CSV } = require("../config");
const { state, delayMs } = require("../state");
const { formatEta } = require("../lib/text");
const { extractBibliography, readLocalHtml } = require("../lib/wiki-bibliography");
const { fetchParseHtml } = require("../lib/http");
const {
  loadExistingPayload,
  mergeCrawlResults,
  buildBookRecord,
  writeOutput,
} = require("../lib/books");
const { syncCollectionFromCsv } = require("../lib/collection");

async function main() {
  console.log(
    state.args.local
      ? "Running in local mode (no live Wikipedia requests except optional cover downloads)"
      : "Running live Wikipedia crawl",
  );
  console.log(`Request delay: ${delayMs()}ms`);

  let arkhamHtml;
  if (state.args.local) {
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
  const limited = bibliography.slice(0, state.args.limit);
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
    (state.args.local ? 0 : 1) +
    (state.args.local ? 0 : uniquePages.size) +
    (state.args.skipDownload ? 0 : uniquePages.size);

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

module.exports = { main };
