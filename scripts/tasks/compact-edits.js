const fs = require("fs");
const path = require("path");

const { DATA_DIR } = require("../config");
const { compactAllEdits } = require("../lib/edits");

function compactEdits() {
  const jsonPath = path.join(DATA_DIR, "books.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error("Missing data/books.json. Run the crawler first.");
  }

  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const books = payload.books || [];
  const result = compactAllEdits(books);

  console.log(
    `Compacted edits: ${result.prunedBooks} book(s), ${result.removedFields} redundant field(s) removed; ${result.remainingBooks} book(s) still have edits.`,
  );
}

module.exports = { compactEdits };
