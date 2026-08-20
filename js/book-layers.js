/* Browser loader — logic tested in scripts/lib/book-layers.js */

function applyBookTags(books, tagsByBookId) {
  if (!Array.isArray(books)) {
    return [];
  }

  for (const book of books) {
    if (!tagsByBookId || typeof tagsByBookId !== "object") {
      book.tags = Array.isArray(book.tags) ? book.tags.slice() : [];
      continue;
    }
    const key = String(book.id);
    const raw = tagsByBookId[key] || tagsByBookId[book.id];
    book.tags = Array.isArray(raw) ? raw.slice() : [];
  }

  return books;
}
