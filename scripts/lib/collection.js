const fs = require("fs");
const path = require("path");
const { COLLECTION_CSV, COLLECTION_JS } = require("../config");
const { parseCsvLine, parseYear } = require("./text");
const { writeJsGlobal } = require("./static-data");

function parseCollectionCsv(csvText) {
  return csvText
    .trim()
    .split(/\r?\n/)
    .map(parseCsvLine)
    .filter((cols) => cols.length >= 3)
    .map((cols) => ({
      title: cols[0].trim(),
      author: cols[1]?.trim() || "",
      year: parseYear(cols[2]),
      status: cols[3]?.trim() || "",
    }))
    .filter((item) => {
      if (!item.title || !item.year) {
        return false;
      }
      if (item.title.toUpperCase() === "ARKHAM HOUSE") {
        return false;
      }
      if (/^\d+ on order/i.test(item.title)) {
        return false;
      }
      return true;
    });
}

function syncCollectionFromCsv() {
  if (!fs.existsSync(COLLECTION_CSV)) {
    throw new Error(`Missing collection CSV: ${COLLECTION_CSV}`);
  }

  const items = parseCollectionCsv(fs.readFileSync(COLLECTION_CSV, "utf8"));
  writeJsGlobal(COLLECTION_JS, "MY_COLLECTION", items);
  console.log(`Synced ${items.length} collection items to ${COLLECTION_JS}`);
}

module.exports = {
  parseCollectionCsv,
  syncCollectionFromCsv,
};
