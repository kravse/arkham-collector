const { parseAuthorFromListLine } = require("../lib/text");
const { loadExistingPayload, writeOutput } = require("../lib/books");

function syncAuthors() {
  const payload = loadExistingPayload();
  let updated = 0;

  for (const book of payload.books) {
    const author = parseAuthorFromListLine(book.listAuthor);
    if (!author) {
      continue;
    }

    book.author = author;
    updated += 1;
  }

  const { jsonPath, jsPath } = writeOutput(payload);
  const stillMissing = payload.books.filter((book) => !book.author).length;

  console.log(`Filled ${updated} authors from bibliography lines.`);
  console.log(`Still missing author: ${stillMissing}`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`JS:   ${jsPath}`);
}

module.exports = { syncAuthors };
