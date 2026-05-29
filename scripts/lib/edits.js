const fs = require("fs");
const path = require("path");

const { DATA_DIR } = require("../config");

const EDITS_JSON = path.join(DATA_DIR, "edits.json");
const EDITS_JS = path.join(DATA_DIR, "edits.js");

const EDITABLE_FIELDS = new Set([
  "title",
  "author",
  "coverArtist",
  "publicationDate",
  "decade",
  "wikipediaUrl",
  "goodreadsUrl",
  "coverImageFile",
  "description",
  "hidden",
  "deleted",
]);

function loadEdits() {
  if (!fs.existsSync(EDITS_JSON)) {
    return { edits: {} };
  }
  const payload = JSON.parse(fs.readFileSync(EDITS_JSON, "utf8"));
  return {
    edits: payload.edits || {},
  };
}

function saveEdits(payload) {
  const output = {
    edits: payload.edits || {},
  };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(EDITS_JSON, `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(
    EDITS_JS,
    `window.BOOK_EDITS = ${JSON.stringify(output.edits, null, 2)};\n`,
  );
  return output;
}

function getEditForBook(editsById, bookId) {
  if (!editsById) {
    return null;
  }
  return editsById[String(bookId)] || editsById[bookId] || null;
}

function hasCoverEdit(editsById, bookId) {
  const edit = getEditForBook(editsById, bookId);
  return Boolean(edit?.coverImageFile);
}

function hasDescriptionEdit(editsById, bookId) {
  const edit = getEditForBook(editsById, bookId);
  return edit != null && Object.prototype.hasOwnProperty.call(edit, "description");
}

function hasGoodreadsEdit(editsById, bookId) {
  const edit = getEditForBook(editsById, bookId);
  return edit != null && Object.prototype.hasOwnProperty.call(edit, "goodreadsUrl");
}

function isBookDeleted(book) {
  return book?.deleted === true;
}

function filterActiveBooks(books) {
  return books.filter((book) => !isBookDeleted(book));
}

function applyEditsToBook(book, editsById) {
  const edit = getEditForBook(editsById, book.id);
  if (!edit) {
    return book;
  }
  const merged = { ...book, ...edit };
  if (edit.coverImageFile) {
    merged.coverEditPath = edit.coverImageFile;
  }
  return merged;
}

function applyEditsToBooks(books, editsById) {
  return books.map((book) => applyEditsToBook(book, editsById));
}

function migrateLegacyHiddenFromBooks(books) {
  const payload = loadEdits();
  let migrated = 0;

  for (const book of books) {
    if (book.hidden !== true) {
      continue;
    }

    const key = String(book.id);
    const current = payload.edits[key] || {};
    if (current.hidden === true) {
      continue;
    }

    payload.edits[key] = { ...current, hidden: true };
    migrated += 1;
  }

  if (migrated > 0) {
    saveEdits(payload);
  }

  return migrated;
}

function stripScrapedHidden(books) {
  return books.map((book) => {
    const { hidden: _hidden, ...scraped } = book;
    return scraped;
  });
}

function setBookEdit(bookId, patch) {
  const payload = loadEdits();
  const key = String(bookId);
  const current = { ...(payload.edits[key] || {}) };

  for (const [field, value] of Object.entries(patch)) {
    if (!EDITABLE_FIELDS.has(field)) {
      continue;
    }
    if (value === null || value === undefined) {
      delete current[field];
    } else if (field === "hidden" && value === false) {
      delete current.hidden;
    } else if (field === "deleted" && value === false) {
      delete current.deleted;
    } else {
      current[field] = value;
    }
  }

  if (Object.keys(current).length === 0) {
    delete payload.edits[key];
  } else {
    payload.edits[key] = current;
  }

  return saveEdits(payload);
}

function removeBookEdit(bookId) {
  const payload = loadEdits();
  delete payload.edits[String(bookId)];
  return saveEdits(payload);
}

module.exports = {
  EDITS_JSON,
  EDITS_JS,
  EDITABLE_FIELDS,
  loadEdits,
  saveEdits,
  applyEditsToBook,
  applyEditsToBooks,
  setBookEdit,
  removeBookEdit,
  getEditForBook,
  hasCoverEdit,
  hasDescriptionEdit,
  hasGoodreadsEdit,
  isBookDeleted,
  filterActiveBooks,
  migrateLegacyHiddenFromBooks,
  stripScrapedHidden,
};
