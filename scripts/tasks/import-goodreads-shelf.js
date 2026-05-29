const { loadExistingPayload, writeOutput } = require("../lib/books");
const { loadEdits, hasGoodreadsEdit } = require("../lib/edits");
const {
  GOODREADS_SHELF_HTML_FILES,
  loadGoodreadsShelfCatalog,
  findShelfEntryForBook,
} = require("../lib/goodreads-shelf-html");

async function importGoodreadsShelf() {
  const { byNormalizedTitle, allEntries, fileNames } =
    loadGoodreadsShelfCatalog(GOODREADS_SHELF_HTML_FILES);
  const payload = loadExistingPayload();
  const edits = loadEdits().edits;

  console.log("Importing Goodreads URLs from saved shelf HTML (source of truth)");
  fileNames.forEach((name) => console.log(`  - examples/${name}`));
  console.log(`Shelf entries parsed: ${allEntries.length} unique URLs`);

  let updated = 0;
  let unchanged = 0;
  let skippedEdit = 0;
  let unmatched = 0;

  for (const book of payload.books) {
    if (hasGoodreadsEdit(edits, book.id)) {
      skippedEdit += 1;
      continue;
    }

    const entry = findShelfEntryForBook(book, byNormalizedTitle, allEntries);
    if (!entry) {
      unmatched += 1;
      continue;
    }

    if (book.goodreadsUrl === entry.url) {
      unchanged += 1;
      continue;
    }

    book.goodreadsUrl = entry.url;
    updated += 1;
  }

  const { jsonPath, jsPath } = writeOutput(payload);

  console.log("");
  console.log(
    `Done. ${updated} updated, ${unchanged} already matched, ${skippedEdit} skipped (manual Goodreads edit), ${unmatched} books not on shelf.`,
  );
  console.log(`JSON: ${jsonPath}`);
  console.log(`JS:   ${jsPath}`);
}

module.exports = { importGoodreadsShelf };
