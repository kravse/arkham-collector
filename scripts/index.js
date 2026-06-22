#!/usr/bin/env node

const { state, initState } = require("./state");
const { SCRAPE_MODES, getScriptMode, printCustomDataWarning } = require("./cli");
const { syncCollectionFromCsv } = require("./lib/collection");
const { reconcileCoversFromDisk } = require("./tasks/reconcile-covers");
const { fillMissingCovers } = require("./tasks/fill-covers");
const { crawlMycroftOnly } = require("./tasks/crawl-mycroft");
const { syncPublicationDates } = require("./tasks/sync-publication-dates");
const { syncAuthors } = require("./tasks/sync-authors");
const { syncDescriptions } = require("./tasks/sync-descriptions");
const { syncGoodreads } = require("./tasks/sync-goodreads");
const { importGoodreadsShelf } = require("./tasks/import-goodreads-shelf");
const { dedupeBookIds } = require("./tasks/dedupe-book-ids");
const { compactEdits } = require("./tasks/compact-edits");
const { fixArkhamMagazines } = require("./tasks/fix-arkham-magazines");
const { exportArkhamCatalog } = require("./tasks/export-arkham-catalog");
const { main } = require("./tasks/crawl");

initState(process.argv.slice(2));

const scriptMode = getScriptMode(state.args);
if (SCRAPE_MODES.has(scriptMode) && !state.args.yes) {
  printCustomDataWarning(scriptMode);
}

function fail(error) {
  console.error(error);
  process.exit(1);
}

if (state.args.syncCollection) {
  try {
    syncCollectionFromCsv();
  } catch (error) {
    fail(error);
  }
} else if (state.args.reconcileCovers) {
  try {
    reconcileCoversFromDisk();
  } catch (error) {
    fail(error);
  }
} else if (state.args.fillCovers) {
  fillMissingCovers().catch(fail);
} else if (state.args.mycroftOnly) {
  crawlMycroftOnly().catch(fail);
} else if (state.args.syncPublicationDates) {
  syncPublicationDates().catch(fail);
} else if (state.args.syncAuthors) {
  try {
    syncAuthors();
  } catch (error) {
    fail(error);
  }
} else if (state.args.syncDescriptions) {
  syncDescriptions().catch(fail);
} else if (state.args.syncGoodreads) {
  syncGoodreads().catch(fail);
} else if (state.args.importGoodreadsShelf) {
  try {
    importGoodreadsShelf();
  } catch (error) {
    fail(error);
  }
} else if (state.args.dedupeBookIds) {
  try {
    dedupeBookIds();
  } catch (error) {
    fail(error);
  }
} else if (state.args.compactEdits) {
  try {
    compactEdits();
  } catch (error) {
    fail(error);
  }
} else if (state.args.fixArkhamMagazines) {
  try {
    fixArkhamMagazines();
  } catch (error) {
    fail(error);
  }
} else if (state.args.exportArkhamCatalog) {
  try {
    exportArkhamCatalog({ output: state.args.output });
  } catch (error) {
    fail(error);
  }
} else {
  main().catch(fail);
}
