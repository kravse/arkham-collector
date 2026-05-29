const { state, delayMs } = require("../state");
const { formatEta } = require("../lib/text");
const { findGoodreadsUrlForBook } = require("../lib/goodreads-match");
const { loadExistingPayload, writeOutput } = require("../lib/books");
const { loadEdits, hasGoodreadsEdit } = require("../lib/edits");

function bookNeedsGoodreadsSync(book, edits, force) {
  if (hasGoodreadsEdit(edits, book.id)) {
    return false;
  }
  if (book.goodreadsUrl && !force) {
    return false;
  }
  return true;
}

async function syncGoodreads() {
  const payload = loadExistingPayload();
  const edits = loadEdits().edits;
  const books = payload.books;
  const limit = state.args.limit;
  const dryRun = state.args.dryRun;
  const force = state.args.forceGoodreads;
  const missingOnly = state.args.syncGoodreadsMissing;

  const queue = books.filter((book) =>
    bookNeedsGoodreadsSync(book, edits, missingOnly ? false : force),
  );
  const preservedEdits = books.filter((book) => hasGoodreadsEdit(edits, book.id)).length;
  const preservedFilled = books.filter(
    (book) => !hasGoodreadsEdit(edits, book.id) && book.goodreadsUrl,
  ).length;

  console.log(
    dryRun
      ? "Syncing Goodreads URLs (dry run)"
      : "Syncing Goodreads URLs from Open Library",
  );
  if (missingOnly) {
    console.log("Missing-only mode: skipping books that already have goodreadsUrl");
  }
  console.log(
    `Books: ${books.length}; to process: ${queue.length} (${preservedFilled} already have URL, ${preservedEdits} manual edits); request delay: ${delayMs()}ms`,
  );
  if (force && !missingOnly) {
    console.log("Force mode: replacing existing scraped URLs (edits still skipped)");
  }

  const startedAt = Date.now();
  let matched = 0;
  let skipped = 0;
  let failed = 0;
  let attempted = 0;
  const attemptCap = Number.isFinite(limit) ? Math.min(limit, queue.length) : queue.length;

  for (const book of queue) {
    if (attempted >= limit) {
      skipped += 1;
      continue;
    }

    attempted += 1;
    const progress = `[${attempted}/${attemptCap}]`;
    const eta = formatEta(attempted, attemptCap, startedAt);
    const label = book.title || book.listTitle || book.id;
    console.log(`${progress} ${label} (~${eta} remaining)`);

    try {
      const result = await findGoodreadsUrlForBook(book);
      if (result) {
        matched += 1;
        console.log(
          `  → ${result.url} (score ${result.score}, ${result.publishDate || "no date"}, ${result.publishers || "no publisher"})`,
        );
        if (!dryRun) {
          book.goodreadsUrl = result.url;
        }
      } else {
        console.log("  → no confident match");
        if (!dryRun && force) {
          book.goodreadsUrl = null;
        }
      }
    } catch (error) {
      failed += 1;
      console.log(`  Failed: ${error.message}`);
    }
  }

  if (!dryRun) {
    const { jsonPath, jsPath } = writeOutput(payload);
    console.log("");
    console.log(`JSON: ${jsonPath}`);
    console.log(`JS:   ${jsPath}`);
  }

  console.log("");
  const notAttempted = Math.max(0, queue.length - attempted - skipped);
  console.log(
    `Done. ${matched} matched${dryRun ? " (dry run, not written)" : ""}, ${skipped} skipped (--limit), ${notAttempted} still missing in queue, ${preservedFilled} already had URL, ${preservedEdits} manual edits, ${failed} failed.`,
  );
  console.log(`HTTP requests made: ${state.requestCount}`);
}

module.exports = { syncGoodreads };
