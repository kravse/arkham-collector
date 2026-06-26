function resolveTaskId(args) {
  if (args.reconcileCovers) {
    return "reconcileCovers";
  }
  if (args.fillCovers) {
    return "fillCovers";
  }
  if (args.mycroftOnly) {
    return "mycroftOnly";
  }
  if (args.syncPublicationDates) {
    return "syncPublicationDates";
  }
  if (args.syncAuthors) {
    return "syncAuthors";
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
  if (args.dedupeBookIds) {
    return "dedupeBookIds";
  }
  if (args.compactEdits) {
    return "compactEdits";
  }
  if (args.fixArkhamMagazines) {
    return "fixArkhamMagazines";
  }
  if (args.exportArkhamCatalog) {
    return "exportArkhamCatalog";
  }
  if (args.importTagsFromCsv) {
    return "importTagsFromCsv";
  }
  return "crawl";
}

module.exports = {
  resolveTaskId,
};
