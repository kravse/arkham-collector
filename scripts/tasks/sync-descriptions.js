const { state, delayMs } = require("../state");
const { formatEta } = require("../lib/text");
const { wikiTitleFromHref, wikiFragmentFromHref } = require("../lib/wiki-urls");
const { fetchParseHtml } = require("../lib/http");
const { readLocalHtml } = require("../lib/wiki-bibliography");
const { extractLeadDescription } = require("../lib/wiki-descriptions");
const { loadExistingPayload, writeOutput } = require("../lib/books");
const { loadEdits, hasDescriptionEdit } = require("../lib/edits");
const { EXAMPLES_DIR, SAMPLE_BOOK_LOCAL } = require("../config");
const fs = require("fs");

async function fetchWikiHtmlForDescription(wikipediaTitle) {
  if (state.descriptionHtmlCache.has(wikipediaTitle)) {
    return state.descriptionHtmlCache.get(wikipediaTitle);
  }

  if (state.args.local) {
    if (
      wikipediaTitle === "The_Dark_Brotherhood_and_Other_Pieces" &&
      fs.existsSync(SAMPLE_BOOK_LOCAL)
    ) {
      const html = readLocalHtml(SAMPLE_BOOK_LOCAL);
      state.descriptionHtmlCache.set(wikipediaTitle, html);
      return html;
    }
    state.descriptionHtmlCache.set(wikipediaTitle, null);
    return null;
  }

  const html = await fetchParseHtml(wikipediaTitle);
  state.descriptionHtmlCache.set(wikipediaTitle, html);
  return html;
}

async function syncDescriptions() {
  const payload = loadExistingPayload();
  const booksWithUrl = payload.books.filter((book) => book.wikipediaUrl);
  const uniqueTitles = [
    ...new Set(
      booksWithUrl
        .map((book) => wikiTitleFromHref(book.wikipediaUrl))
        .filter(Boolean),
    ),
  ];
  const titlesToFetch = uniqueTitles.slice(0, state.args.limit);

  console.log(
    state.args.local
      ? "Syncing descriptions in local mode"
      : "Syncing descriptions from live Wikipedia",
  );
  console.log(
    `Books with Wikipedia URLs: ${booksWithUrl.length}; fetching ${titlesToFetch.length} unique pages`,
  );
  console.log(`Request delay: ${delayMs()}ms`);

  const startedAt = Date.now();
  const failures = [];

  for (let index = 0; index < titlesToFetch.length; index += 1) {
    const title = titlesToFetch[index];
    const progress = `[${index + 1}/${titlesToFetch.length}]`;
    const eta = formatEta(index, titlesToFetch.length, startedAt);
    console.log(`${progress} Fetching ${title} (~${eta} remaining)`);

    try {
      await fetchWikiHtmlForDescription(title);
    } catch (error) {
      failures.push({ title, error: error.message });
      console.log(`  Failed: ${error.message}`);
    }
  }

  let filled = 0;
  let cleared = 0;
  let skipped = 0;
  let preserved = 0;
  const edits = loadEdits().edits;
  const fetchedTitles = new Set(titlesToFetch);
  const limitActive = Number.isFinite(state.args.limit) && state.args.limit < uniqueTitles.length;

  for (const book of payload.books) {
    if (hasDescriptionEdit(edits, book.id)) {
      preserved += 1;
      continue;
    }

    const pageTitle = wikiTitleFromHref(book.wikipediaUrl);
    if (!pageTitle) {
      if (!limitActive) {
        if (book.description) {
          cleared += 1;
        }
        book.description = null;
      } else {
        skipped += 1;
      }
      continue;
    }

    if (limitActive && !fetchedTitles.has(pageTitle)) {
      skipped += 1;
      continue;
    }

    if (!state.descriptionHtmlCache.has(pageTitle)) {
      if (book.description) {
        cleared += 1;
      }
      book.description = null;
      continue;
    }

    const html = state.descriptionHtmlCache.get(pageTitle);
    if (!html) {
      if (book.description) {
        cleared += 1;
      }
      book.description = null;
      continue;
    }

    const fragmentId = wikiFragmentFromHref(book.wikipediaUrl);
    book.description = extractLeadDescription(html, { fragmentId });
    if (book.description) {
      filled += 1;
    } else {
      cleared += 1;
    }
  }

  const { jsonPath, jsPath } = writeOutput(payload);

  console.log("");
  console.log(
    `Done. ${filled} books with descriptions, ${cleared} cleared or empty${preserved ? `, ${preserved} preserved (custom edits)` : ""}${limitActive ? `, ${skipped} skipped (--limit)` : ""}.`,
  );
  console.log(`JSON: ${jsonPath}`);
  console.log(`JS:   ${jsPath}`);
  console.log(`HTTP requests made: ${state.requestCount}`);
  if (failures.length) {
    console.log(`Fetch failures (${failures.length}):`);
    failures.slice(0, 10).forEach((failure) => {
      console.log(`  - ${failure.title}: ${failure.error}`);
    });
    if (failures.length > 10) {
      console.log(`  ... and ${failures.length - 10} more`);
    }
  }
}

module.exports = { syncDescriptions };
