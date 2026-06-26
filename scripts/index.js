#!/usr/bin/env node

const { state, initState } = require("./state");
const { SCRAPE_MODES, getScriptMode, printCustomDataWarning } = require("./cli");
const { resolveTaskId } = require("./lib/cli-dispatch");
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
const { importTagsFromCsvTask } = require("./tasks/import-tags-from-csv");
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

const TASKS = {
  reconcileCovers: () => reconcileCoversFromDisk(),
  fillCovers: () => fillMissingCovers(),
  mycroftOnly: () => crawlMycroftOnly(),
  syncPublicationDates: () => syncPublicationDates(),
  syncAuthors: () => syncAuthors(),
  syncDescriptions: () => syncDescriptions(),
  syncGoodreads: () => syncGoodreads(),
  importGoodreadsShelf: () => importGoodreadsShelf(),
  dedupeBookIds: () => dedupeBookIds(),
  compactEdits: () => compactEdits(),
  fixArkhamMagazines: () => fixArkhamMagazines(),
  exportArkhamCatalog: () => exportArkhamCatalog({ output: state.args.output }),
  importTagsFromCsv: () => {
    if (!state.args.csvPath) {
      throw new Error("Pass --csv <path> with --import-tags-from-csv");
    }
    importTagsFromCsvTask(state.args.csvPath);
  },
  crawl: () => main(),
};

const ASYNC_TASKS = new Set([
  "fillCovers",
  "mycroftOnly",
  "syncPublicationDates",
  "syncDescriptions",
  "syncGoodreads",
  "crawl",
]);

const taskId = resolveTaskId(state.args);
const runTask = TASKS[taskId];

try {
  const result = runTask();
  if (ASYNC_TASKS.has(taskId)) {
    result.catch(fail);
  }
} catch (error) {
  fail(error);
}
