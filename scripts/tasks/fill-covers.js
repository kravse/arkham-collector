const fs = require("fs");
const path = require("path");
const { DATA_DIR } = require("../config");
const { state, delayMs } = require("../state");
const { formatEta, slugify } = require("../lib/text");
const { wikiTitleFromHref } = require("../lib/wiki-urls");
const { reconcileCoverFiles, bookHasCover, bookHasLocalCover, downloadCover } = require("../lib/covers-files");
const { findCoverForBook } = require("../lib/covers-search");
const { writeOutput } = require("../lib/books");
const { loadEdits, hasCoverEdit } = require("../lib/edits");

async function fillMissingCovers() {
  const jsonPath = path.join(DATA_DIR, "books.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Missing ${jsonPath}. Run the crawler first.`);
  }

  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const edits = loadEdits().edits;
  payload.books = reconcileCoverFiles(payload.books, edits);

  const missing = payload.books.filter(
    (book) => !hasCoverEdit(edits, book.id) && !bookHasCover(book),
  );
  const toProcess = missing.slice(0, state.args.limit);

  console.log(
    `Found ${missing.length} books without covers; processing ${toProcess.length}`,
  );
  if (state.args.dryRun) {
    console.log("Dry run — no files will be downloaded or written");
  }
  console.log(`Request delay: ${delayMs()}ms`);

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

    if (state.args.dryRun) {
      filled += 1;
      continue;
    }

    const bookIndex = payload.books.findIndex((entry) => entry.id === book.id);
    if (bookIndex === -1) {
      continue;
    }

    const currentBook = payload.books[bookIndex];
    if (hasCoverEdit(edits, book.id) || bookHasLocalCover(currentBook)) {
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
  console.log(`HTTP requests made: ${state.requestCount}`);
}

module.exports = { fillMissingCovers };
