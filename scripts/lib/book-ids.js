const { parseYearFromListLine } = require("./text");
const { loadEdits, saveEdits } = require("./edits");

function listYearFromBook(book) {
  return book.listYear || parseYearFromListLine(book.listAuthor || "") || "";
}

function scrapedMatchKey(book) {
  const imprint = book.imprint || "arkham_house";
  const listYear = listYearFromBook(book);
  if (book.wikipediaUrl) {
    return `${imprint}|${book.wikipediaUrl}|${listYear}`;
  }
  return `${imprint}|list|${book.listTitle || book.title}|${listYear}`;
}

function splitDuplicateBookIds(books) {
  const byId = new Map();
  for (const book of books) {
    if (!byId.has(book.id)) {
      byId.set(book.id, []);
    }
    byId.get(book.id).push(book);
  }

  let nextId = books.reduce((max, book) => Math.max(max, book.id || 0), 0);
  const splits = [];

  for (const [oldId, group] of byId) {
    if (group.length < 2) {
      continue;
    }

    group.sort((a, b) => {
      const yearA = parseInt(listYearFromBook(a) || "9999", 10);
      const yearB = parseInt(listYearFromBook(b) || "9999", 10);
      if (yearA !== yearB) {
        return yearA - yearB;
      }
      return String(a.listTitle || a.title).localeCompare(
        String(b.listTitle || b.title),
      );
    });

    const reprintIds = [];
    for (let index = 1; index < group.length; index += 1) {
      nextId += 1;
      group[index].id = nextId;
      reprintIds.push(nextId);
    }

    splits.push({
      oldId,
      canonicalId: oldId,
      reprintIds,
    });
  }

  return { books, splits };
}

function remapEditsAfterIdSplit(splits) {
  if (!splits.length) {
    return 0;
  }

  const payload = loadEdits();
  let remapped = 0;

  for (const { oldId, reprintIds } of splits) {
    const key = String(oldId);
    const edit = payload.edits[key];
    if (!edit) {
      continue;
    }

    const { hidden, ...rest } = edit;

    if (Object.keys(rest).length > 0) {
      payload.edits[key] = rest;
    } else {
      delete payload.edits[key];
    }

    if (hidden) {
      for (const reprintId of reprintIds) {
        const reprintKey = String(reprintId);
        payload.edits[reprintKey] = {
          ...(payload.edits[reprintKey] || {}),
          hidden: true,
        };
      }
    }

    remapped += 1;
  }

  if (remapped > 0) {
    saveEdits(payload);
  }

  return remapped;
}

function detectReprintSplits(books) {
  const byWiki = new Map();

  for (const book of books) {
    if (!book.wikipediaUrl) {
      continue;
    }
    const imprint = book.imprint || "arkham_house";
    const key = `${imprint}|${book.wikipediaUrl}`;
    if (!byWiki.has(key)) {
      byWiki.set(key, []);
    }
    byWiki.get(key).push(book);
  }

  const splits = [];
  for (const group of byWiki.values()) {
    if (group.length < 2) {
      continue;
    }

    group.sort((a, b) => {
      const yearA = parseInt(listYearFromBook(a) || "9999", 10);
      const yearB = parseInt(listYearFromBook(b) || "9999", 10);
      if (yearA !== yearB) {
        return yearA - yearB;
      }
      return String(a.listTitle || a.title).localeCompare(
        String(b.listTitle || b.title),
      );
    });

    const [canonical, ...reprints] = group;
    splits.push({
      oldId: canonical.id,
      canonicalId: canonical.id,
      reprintIds: reprints.map((book) => book.id),
    });
  }

  return splits;
}

function deduplicateBookIds(books) {
  const { books: dedupedBooks, splits } = splitDuplicateBookIds(books);
  const remapped = remapEditsAfterIdSplit(splits);
  return { books: dedupedBooks, splits, remapped };
}

function remapEditsForReprints(books) {
  const splits = detectReprintSplits(books);
  return remapEditsAfterIdSplit(splits);
}

module.exports = {
  listYearFromBook,
  scrapedMatchKey,
  splitDuplicateBookIds,
  remapEditsAfterIdSplit,
  detectReprintSplits,
  remapEditsForReprints,
  deduplicateBookIds,
};
