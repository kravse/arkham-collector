const { importTagsFromCsv } = require("../lib/tag-import");

function importTagsFromCsvTask(csvPath, options = {}) {
  const result = importTagsFromCsv(csvPath, options);
  console.log(
    `Imported tags for ${result.taggedBooks} of ${result.rowCount} CSV row(s) into data/tags.json`,
  );
  if (result.unmatchedRows.length) {
    console.warn(
      `Warning: ${result.unmatchedRows.length} row(s) could not be matched.`,
    );
  }
  return result;
}

module.exports = { importTagsFromCsvTask };
