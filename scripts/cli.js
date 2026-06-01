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
    syncGoodreads: false,
    syncGoodreadsMissing: false,
    forceGoodreads: false,
    importGoodreadsShelf: false,
    dedupeBookIds: false,
    compactEdits: false,
    fixArkhamMagazines: false,
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
    } else if (arg === "--sync-goodreads") {
      options.syncGoodreads = true;
    } else if (arg === "--sync-goodreads-missing") {
      options.syncGoodreads = true;
      options.syncGoodreadsMissing = true;
    } else if (arg === "--force-goodreads") {
      options.forceGoodreads = true;
    } else if (arg === "--import-goodreads-shelf") {
      options.importGoodreadsShelf = true;
    } else if (arg === "--dedupe-book-ids") {
      options.dedupeBookIds = true;
    } else if (arg === "--compact-edits") {
      options.compactEdits = true;
    } else if (arg === "--fix-arkham-magazines") {
      options.fixArkhamMagazines = true;
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
  if (args.syncGoodreads) {
    return "syncGoodreads";
  }
  if (args.importGoodreadsShelf) {
    return "importGoodreadsShelf";
  }
  if (args.syncAuthors) {
    return "syncAuthors";
  }
  if (args.dedupeBookIds) {
    return "dedupeBookIds";
  }
  if (args.compactEdits) {
    return "compactEdits";
  }
  if (args.fixArkhamMagazines) {
    return "fixArkhamMagazines";
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
    "  WARNING: Wikipedia scrape — scraped book data in books.json will be overwritten",
    divider,
    "",
    `  About to run: ${label}`,
    "",
    "  This writes to data/books.json and data/books.js (scraped fields only).",
    "  Manual edits saved via npm run serve live in data/edits.json and are",
    "  not modified by crawlers or sync scripts.",
    "",
    "  Scraped fields (title, author, dates, descriptions, cover URLs, etc.)",
    "  are fully replaced on crawl or sync-publication-dates / sync-descriptions.",
    "  Editable overrides in edits.json still win in the viewer at display time.",
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
