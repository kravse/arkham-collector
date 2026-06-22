function applyBookTags(books, tagsByBookId) {
  if (!Array.isArray(books)) {
    return [];
  }
  if (!tagsByBookId || typeof tagsByBookId !== "object") {
    return books.map((book) => ({
      ...book,
      tags: Array.isArray(book.tags) ? book.tags.slice() : [],
    }));
  }

  return books.map((book) => {
    const key = String(book.id);
    const raw = tagsByBookId[key] || tagsByBookId[book.id];
    const tags = Array.isArray(raw) ? raw.slice() : [];
    return { ...book, tags };
  });
}
