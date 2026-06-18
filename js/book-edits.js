function applyBookEdits(books, editsById) {
  if (!Array.isArray(books)) {
    return [];
  }
  if (!editsById || typeof editsById !== "object") {
    return books.slice();
  }

  return books.map((book) => {
    const edit = editsById[String(book.id)] || editsById[book.id];
    const { hidden: _hidden, deleted: _deleted, ...base } = book;
    if (!edit) {
      return { ...base, hidden: false, deleted: false };
    }
    const { coverImageFile: editCoverPath, ...editFields } = edit;
    const merged = { ...base, ...editFields };
    merged.hidden = edit.hidden === true;
    merged.deleted = edit.deleted === true;
    if (editCoverPath && !merged.coverImageDetailFile) {
      merged.coverEditPath = editCoverPath;
    }
    return merged;
  });
}
