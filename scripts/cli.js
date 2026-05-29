function parseArgs(argv) {
  const options = {
    local: false,
    limit: Infinity,
    skipDownload: false,
    delayMs: 2000,
    syncCollection: false,
    reconcileCovers: false,
    fillCovers: false,
    dryRun: false,
    mycroftOnly: false,
    syncPublicationDates: false,
    syncAuthors: false,
    syncDescriptions: false,
    yes: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--local") {
      options.local = true;
    } else if (arg === "--yes") {
      options.yes = true;
    } else if (arg === "--mycroft-only") {
      options.mycroftOnly = true;
    } else if (arg === "--sync-publication-dates") {
      options.syncPublicationDates = true;
    } else if (arg === "--sync-authors") {
      options.syncAuthors = true;
    } else if (arg === "--sync-descriptions") {
      options.syncDescriptions = true;
    } else if (arg === "--skip-download") {
      options.skipDownload = true;
    } else if (arg === "--sync-collection") {
      options.syncCollection = true;
    } else if (arg === "--reconcile-covers") {
      options.reconcileCovers = true;
    } else if (arg === "--fill-covers") {
      options.fillCovers = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--limit") {
      options.limit = Number(argv[++i]);
    } else if (arg === "--delay-ms") {
      options.delayMs = Number(argv[++i]);
    }
  }

  return options;
}

const SCRAPE_MODES = new Set([
  "crawl",
  "mycroftCrawl",
  "syncPublicationDates",
  "syncDescriptions",
  "fillCovers",
]);

function getScriptMode(args) {
  if (args.syncCollection) {
    return "syncCollection";
  }
  if (args.reconcileCovers) {
    return "reconcileCovers";
  }
  if (args.fillCovers) {
    return args.dryRun ? "fillCoversDryRun" : "fillCovers";
  }
  if (args.mycroftOnly) {
    return "mycroftCrawl";
  }
  if (args.syncPublicationDates) {
    return "syncPublicationDates";
  }
  if (args.syncDescriptions) {
    return "syncDescriptions";
  }
  if (args.syncAuthors) {
    return "syncAuthors";
  }
  return "crawl";
}

function scrapeModeLabel(mode) {
  const labels = {
    crawl: "full Arkham House bibliography crawl (npm run crawl)",
    mycroftCrawl: "Mycroft & Moran bibliography crawl (npm run crawl:mycroft)",
    syncPublicationDates:
      "sync publication dates from Wikipedia (npm run sync-publication-dates)",
    syncDescriptions:
      "sync Wikipedia lead descriptions (npm run sync-descriptions)",
    fillCovers:
      "fill missing covers from Wikipedia/Open Library (npm run fill-covers)",
  };
  return labels[mode] || mode;
}

function printCustomDataWarning(mode) {
  const label = scrapeModeLabel(mode);
  const divider = "!".repeat(72);
  const lines = [
    "",
    divider,
    "  WARNING: Wikipedia scrape — customized book data may be overwritten",
    divider,
    "",
    `  About to run: ${label}`,
    "",
    "  This writes to data/books.json and data/books.js.",
    "  Manual UI edits and hand-tuned fields (titles, authors, publication",
    "  dates, decades, Wikipedia URLs, etc.) can be reset when books are",
    "  re-merged from Wikipedia.",
    "",
    "  Usually preserved: hidden flag, local cover files already on disk.",
    "  sync-publication-dates overwrites publicationDate from bibliography text.",
    "  sync-descriptions overwrites description from Wikipedia lead sections.",
    "",
    "  Safer: npm run serve (edit in the browser), npm run sync-authors,",
    "  npm run reconcile-covers, npm run fill-covers:dry-run (preview only).",
    "",
    "  Pass --yes to skip this warning.",
    divider,
    "",
  ];
  lines.forEach((line) => console.error(line));
}

module.exports = {
  parseArgs,
  SCRAPE_MODES,
  getScriptMode,
  scrapeModeLabel,
  printCustomDataWarning,
};
