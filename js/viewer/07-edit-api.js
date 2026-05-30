/* Edit dialog and dev-server PATCH / DELETE API */


async function deleteBook() {
  if (!editingBookId) {
    return;
  }

  const book = books.find((entry) => entry.id === editingBookId);
  const title = book?.title || "this book";
  const confirmed = window.confirm(
    `Remove "${title}" from the gallery? It will disappear everywhere, even with "Show hidden" on localhost. Scraped data is unchanged.`,
  );
  if (!confirmed) {
    return;
  }

  editDeleteBtn.disabled = true;
  editSaveBtn.disabled = true;

  try {
    const response = await fetch(`/api/books/${editingBookId}`, {
      method: "DELETE",
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not delete book");
    }

          if (book) {
            book.deleted = true;
          }
          invalidateSortedCache();

          if (detailBookId === editingBookId) {
      closeBookDetail();
    }

    closeEditDialog();
    render();
  } catch (error) {
    console.error(error);
    window.alert(`Could not delete book: ${error.message}`);
  } finally {
    editDeleteBtn.disabled = false;
    editSaveBtn.disabled = false;
  }
}

function applyEditResponseToBook(bookId, payload) {
  const book = books.find((entry) => entry.id === bookId);
  if (!book) {
    return;
  }

  book.title = payload.title;
  book.author = payload.author;
  book.coverArtist = payload.coverArtist;
  book.publicationDate = payload.publicationDate;
  book.decade =
    payload.decade ?? decadeFromYear(parseYear(book.publicationDate));
  book.wikipediaUrl = payload.wikipediaUrl;
  book.goodreadsUrl = payload.goodreadsUrl;
  if (Object.prototype.hasOwnProperty.call(payload, "description")) {
    book.description = payload.description || null;
  }
  if (payload.coverImageFile) {
    book.coverImageFile = payload.coverImageFile;
    book.coverEditPath = payload.coverImageFile;
    book.coverCacheKey = Date.now();
  }
  book.hidden = payload.hidden === true;
  book.deleted = payload.deleted === true;

  const key = String(bookId);
  const storedEdit = payload.edit || {};
  if (Object.keys(storedEdit).length) {
    window.BOOK_EDITS[key] = { ...storedEdit };
  } else {
    delete window.BOOK_EDITS[key];
  }

  prepareBookSearchIndex(book);
  invalidateSortedCache();
}

async function saveBookEdits(event) {
  event.preventDefault();
  if (!editingBookId) {
    return;
  }

  editSaveBtn.disabled = true;

  if (serveEnabled && !serveEditDeltas) {
    window.alert(
      "Restart npm run serve so edits save only changed fields (not the whole form).",
    );
    editSaveBtn.disabled = false;
    return;
  }

  try {
    const formData = new FormData();
    formData.append("title", sanitizeSingleLineText(editTitleInput.value));
    formData.append("author", sanitizeSingleLineText(editAuthorInput.value));
    formData.append(
      "coverArtist",
      sanitizeSingleLineText(editCoverArtistInput.value),
    );
    formData.append(
      "publicationDate",
      sanitizeSingleLineText(editPublicationDateInput.value),
    );
    formData.append(
      "wikipediaUrl",
      sanitizeUrlInput(editWikipediaUrlInput.value),
    );
    formData.append(
      "goodreadsUrl",
      sanitizeGoodreadsUrlInput(editGoodreadsUrlInput.value),
    );
    formData.append(
      "description",
      htmlToPlainText(editDescriptionInput.value),
    );
    if (editCoverFileInput.files?.[0]) {
      formData.append("cover", editCoverFileInput.files[0]);
    }

    const response = await fetch(`/api/books/${editingBookId}`, {
      method: "PATCH",
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not save book");
    }

    applyEditResponseToBook(editingBookId, payload);

    const savedBookId = editingBookId;
    closeEditDialog();
    render();
    if (detailBookId === savedBookId) {
      openBookDetail(savedBookId);
    }
  } catch (error) {
    console.error(error);
    window.alert(`Could not save book: ${error.message}`);
  } finally {
    editSaveBtn.disabled = false;
  }
}

async function setBookHidden(bookId, hidden) {
  const button = grid.querySelector(
    `.hide-book-btn[data-book-id="${bookId}"]`,
  );
  if (button) {
    button.disabled = true;
  }

  try {
    const response = await fetch(`/api/books/${bookId}/hidden`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not update book");
    }

    applyEditResponseToBook(bookId, payload);
    render();
  } catch (error) {
    console.error(error);
    window.alert(`Could not update book: ${error.message}`);
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}
