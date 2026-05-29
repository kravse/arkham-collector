const fs = require("fs");
const path = require("path");
const { DATA_DIR } = require("../config");
const { writeOutput } = require("../lib/books");

function reconcileCoversFromDisk() {
  const jsonPath = path.join(DATA_DIR, "books.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Missing ${jsonPath}. Run the crawler first.`);
  }

  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const before = payload.books.filter((book) => book.coverImageFile).length;
  const { jsonPath: outJson, jsPath } = writeOutput(payload);
  const after = JSON.parse(fs.readFileSync(outJson, "utf8")).books.filter(
    (book) => book.coverImageFile,
  ).length;

  console.log(
    `Linked cover files: ${before} -> ${after} of ${payload.books.length} books`,
  );
  console.log(`JSON: ${outJson}`);
  console.log(`JS:   ${jsPath}`);
}

module.exports = { reconcileCoversFromDisk };
