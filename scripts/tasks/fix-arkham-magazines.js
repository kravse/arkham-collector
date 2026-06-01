const { state } = require("../state");
const { loadExistingPayload, writeOutput } = require("../lib/books");
const {
  isArkhamMagazineIssueBook,
  parseArkhamMagazineIssue,
} = require("../lib/arkham-magazines");
const { compactAllEdits } = require("../lib/edits");

function bookNeedsMagazineFix(book, parsed) {
  return (
    book.listAuthor !== parsed.listAuthor ||
    book.title !== parsed.title ||
    book.publicationDate !== parsed.publicationDate ||
    book.decade !== parsed.decade ||
    book.author !== parsed.author ||
    book.listYear !== parsed.listYear
  );
}

function fixArkhamMagazines() {
  const payload = loadExistingPayload();
  const dryRun = state.args.dryRun;
  const changes = [];

  for (const book of payload.books) {
    if (!isArkhamMagazineIssueBook(book)) {
      continue;
    }

    const parsed = parseArkhamMagazineIssue(book);
    if (!parsed || !bookNeedsMagazineFix(book, parsed)) {
      continue;
    }

    changes.push({
      id: book.id,
      magazine: parsed.magazine,
      before: {
        listAuthor: book.listAuthor,
        title: book.title,
        publicationDate: book.publicationDate,
        decade: book.decade,
        author: book.author,
        listYear: book.listYear,
      },
      after: parsed,
    });

    if (!dryRun) {
      book.listAuthor = parsed.listAuthor;
      book.title = parsed.title;
      book.publicationDate = parsed.publicationDate;
      book.decade = parsed.decade;
      book.author = parsed.author;
      book.listYear = parsed.listYear;
    }
  }

  if (changes.length === 0) {
    console.log("No Arkham magazine issues need fixing.");
    return;
  }

  const samplerCount = changes.filter(
    (change) => change.magazine === "sampler",
  ).length;
  const collectorCount = changes.filter(
    (change) => change.magazine === "collector",
  ).length;

  for (const change of changes) {
    console.log(`#${change.id} (${change.magazine})`);
    console.log(`  listAuthor: ${JSON.stringify(change.before.listAuthor)}`);
    console.log(`           -> ${JSON.stringify(change.after.listAuthor)}`);
    console.log(`  title: ${JSON.stringify(change.before.title)}`);
    console.log(`      -> ${JSON.stringify(change.after.title)}`);
    console.log(
      `  publicationDate: ${JSON.stringify(change.before.publicationDate)}`,
    );
    console.log(
      `               -> ${JSON.stringify(change.after.publicationDate)}`,
    );
  }

  if (dryRun) {
    console.log(
      `Dry run: would update ${changes.length} magazine issue(s) (${samplerCount} Sampler, ${collectorCount} Collector).`,
    );
    return;
  }

  const { jsonPath, jsPath } = writeOutput(payload);
  const compactResult = compactAllEdits(payload.books);

  console.log(
    `Updated ${changes.length} magazine issue(s) (${samplerCount} Sampler, ${collectorCount} Collector).`,
  );
  console.log(
    `Compacted edits: ${compactResult.prunedBooks} book(s), ${compactResult.removedFields} redundant field(s) removed.`,
  );
  console.log(`JSON: ${jsonPath}`);
  console.log(`JS:   ${jsPath}`);
}

module.exports = { fixArkhamMagazines };
