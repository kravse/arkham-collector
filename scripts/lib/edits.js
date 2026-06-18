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
  const { hidden: _hidden, deleted: _deleted, ...base } = book;
  if (!edit) {
    return { ...base, hidden: false, deleted: false };
  }
  const { coverImageFile: editCoverPath, ...editFields } = edit;
  const merged = { ...base, ...editFields };
  merged.hidden = edit.hidden === true;
  merged.deleted = edit.deleted === true;
  if (editCoverPath && !base.coverImageDetailFile) {
    merged.coverImageFile = editCoverPath;
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

function normalizeTypographicText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

function normalizeEditFieldValue(field, value) {
  if (field === "hidden" || field === "deleted") {
    return value === true;
  }
  if (value === null || value === undefined) {
    return "";
  }
  const text = normalizeTypographicText(value);
  if (field === "description") {
    return text.trim();
  }
  return text.trim();
}

function editFieldMatchesScraped(scraped, field, editValue) {
  if (!scraped) {
    return false;
  }
  return (
    normalizeEditFieldValue(field, editValue) ===
    normalizeEditFieldValue(field, scraped[field])
  );
}

function compactEditAgainstScraped(edit, scraped) {
  if (!scraped || !edit) {
    return edit;
  }

  for (const field of EDITABLE_FIELDS) {
    if (field === "hidden" || field === "deleted") {
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(edit, field)) {
      continue;
    }
    if (editFieldMatchesScraped(scraped, field, edit[field])) {
      delete edit[field];
    }
  }

  return edit;
}

function compactAllEdits(books) {
  const payload = loadEdits();
  let prunedBooks = 0;
  let removedFields = 0;

  for (const [key, edit] of Object.entries(payload.edits)) {
    const scraped = books.find((book) => String(book.id) === key);
    if (!scraped) {
      continue;
    }

    const beforeKeys = Object.keys(edit).length;
    compactEditAgainstScraped(edit, scraped);
    const afterKeys = Object.keys(edit).length;
    if (afterKeys < beforeKeys) {
      prunedBooks += 1;
      removedFields += beforeKeys - afterKeys;
    }

    if (afterKeys === 0) {
      delete payload.edits[key];
    }
  }

  if (prunedBooks > 0) {
    saveEdits(payload);
  }

  return {
    prunedBooks,
    removedFields,
    remainingBooks: Object.keys(payload.edits).length,
  };
}

function applyPatchField(edit, scraped, field, value) {
  if (field === "hidden") {
    if (value === true) {
      edit.hidden = true;
    } else {
      delete edit.hidden;
    }
    return;
  }
  if (field === "deleted") {
    if (value === true) {
      edit.deleted = true;
    } else {
      delete edit.deleted;
    }
    return;
  }
  if (value === null || value === undefined) {
    delete edit[field];
    return;
  }
  if (scraped && editFieldMatchesScraped(scraped, field, value)) {
    delete edit[field];
    return;
  }
  edit[field] = value;
}

function setBookEdit(bookId, patch, scraped = null) {
  const payload = loadEdits();
  const key = String(bookId);
  const next = { ...(payload.edits[key] || {}) };

  for (const [field, value] of Object.entries(patch)) {
    if (!EDITABLE_FIELDS.has(field)) {
      continue;
    }
    if (scraped) {
      applyPatchField(next, scraped, field, value);
      continue;
    }
    if (value === null || value === undefined) {
      delete next[field];
    } else if (field === "hidden" && value === false) {
      delete next.hidden;
    } else if (field === "deleted" && value === false) {
      delete next.deleted;
    } else {
      next[field] = value;
    }
  }

  if (scraped) {
    compactEditAgainstScraped(next, scraped);
  }

  if (Object.keys(next).length === 0) {
    delete payload.edits[key];
  } else {
    payload.edits[key] = next;
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
  compactEditAgainstScraped,
  compactAllEdits,
  editFieldMatchesScraped,
};
