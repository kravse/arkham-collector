const fs = require("fs");
const path = require("path");
const { EXAMPLES_DIR, IMPRINTS } = require("../config");
const { state } = require("../state");
const { extractBibliography, readLocalHtml } = require("../lib/wiki-bibliography");
const { fetchParseHtml } = require("../lib/http");
const { parseYearFromListLine } = require("../lib/text");
const { loadExistingPayload, writeOutput } = require("../lib/books");

async function syncPublicationDates() {
  const payload = loadExistingPayload();
  const dateByKey = new Map();

  for (const [imprint, config] of Object.entries(IMPRINTS)) {
    let html;
    if (state.args.local) {
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

module.exports = { syncPublicationDates };
