/* Tag editing in the dev-server edit dialog */

let editTagSuggestIndex = -1;

function normalizeTagInput(rawTag) {
  return viewerTags.normalizeTag(rawTag) || "";
}

function getAllKnownTags() {
  return viewerTags.collectAllKnownTags(window.BOOK_TAGS || {});
}

function getEditingBookTags() {
  if (!editingBookId) {
    return [];
  }
  const book = books.find((entry) => entry.id === editingBookId);
  return Array.isArray(book?.tags) ? book.tags.slice() : [];
}

function syncEditTagsVisibility() {
  if (editTagsField) {
    editTagsField.hidden = !serveEnabled;
  }
}

function hideEditTagSuggest() {
  editTagSuggestIndex = -1;
  if (!editTagSuggest) {
    return;
  }
  editTagSuggest.hidden = true;
  editTagSuggest.innerHTML = "";
  if (editTagInput) {
    editTagInput.setAttribute("aria-expanded", "false");
  }
}

function getEditTagSuggestItems() {
  const partial = String(editTagInput?.value || "").trim();
  if (!partial) {
    return [];
  }
  return viewerFilters.filterTagSuggestions(partial, getAllKnownTags(), {
    exclude: getEditingBookTags(),
  });
}

function renderEditTagSuggest() {
  const items = getEditTagSuggestItems();
  if (!items.length || !editTagSuggest) {
    hideEditTagSuggest();
    return;
  }

  editTagSuggest.innerHTML = items
    .map((label, index) => {
      const safe = viewerCardHtml.escapeHtml(label);
      const activeClass = index === editTagSuggestIndex ? " active" : "";
      return `<li class="edit-tag-suggest-item${activeClass}" role="option" data-suggest-index="${index}" aria-selected="${index === editTagSuggestIndex}">${safe}</li>`;
    })
    .join("");
  editTagSuggest.hidden = false;
  if (editTagInput) {
    editTagInput.setAttribute("aria-expanded", "true");
  }
}

function updateEditTagSuggest() {
  if (editTagSuggestIndex >= getEditTagSuggestItems().length) {
    editTagSuggestIndex = -1;
  }
  renderEditTagSuggest();
}

function pickEditTagSuggestion(index) {
  const items = getEditTagSuggestItems();
  const label = items[index];
  if (!label) {
    return;
  }
  hideEditTagSuggest();
  addEditingBookTag(label);
}

function commitEditTagInput() {
  const value = editTagInput?.value || "";
  hideEditTagSuggest();
  const resolved = viewerFilters.resolveTagFilterLabel(value, getAllKnownTags());
  addEditingBookTag(resolved || value);
}

function renderEditTagsUi() {
  if (!editTagsCurrent || !editTagsPoolList) {
    return;
  }

  const currentTags = getEditingBookTags();
  const currentKeys = new Set(currentTags.map(viewerTags.tagKey));

  if (!currentTags.length) {
    editTagsCurrent.innerHTML =
      '<p class="edit-tags-empty">No tags yet.</p>';
  } else {
    editTagsCurrent.innerHTML = currentTags
      .map((tag) => {
        const label = viewerTags.formatTagLabel(tag);
        return `<span class="edit-tag-chip"><span class="edit-tag-chip-label">${viewerCardHtml.escapeHtml(label)}</span><button type="button" class="edit-tag-remove" aria-label="Remove tag ${viewerCardHtml.escapeHtml(label)}">×</button></span>`;
      })
      .join("");
  }

  const poolTags = getAllKnownTags().filter(
    (tag) => !currentKeys.has(viewerTags.tagKey(tag)),
  );
  if (!poolTags.length) {
    editTagsPool.hidden = true;
    editTagsPoolList.innerHTML = "";
    return;
  }

  editTagsPool.hidden = false;
  editTagsPoolList.innerHTML = poolTags
    .map((tag) => {
      const label = viewerTags.formatTagLabel(tag);
      return `<button type="button" class="edit-tag-pool-btn">${viewerCardHtml.escapeHtml(label)}</button>`;
    })
    .join("");
}

function applyTagResponseToBook(bookId, tags) {
  const book = books.find((entry) => entry.id === bookId);
  if (!book) {
    return;
  }

  book.tags = Array.isArray(tags) ? tags.slice() : [];
  const key = String(bookId);
  if (book.tags.length) {
    window.BOOK_TAGS[key] = book.tags.slice();
  } else {
    delete window.BOOK_TAGS[key];
  }
}

async function persistBookTags(bookId, nextTags) {
  if (!bookId || !serveEnabled) {
    return;
  }

  const response = await fetch(`/api/books/${bookId}/tags`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags: nextTags }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Could not save tags");
  }

  applyTagResponseToBook(bookId, payload.tags);
  if (editingBookId === bookId) {
    renderEditTagsUi();
  }
  render();
  if (detailBookId === bookId) {
    openBookDetail(bookId, { historyMode: "none" });
  }
}

async function persistEditingBookTags(nextTags) {
  if (!editingBookId) {
    return;
  }
  await persistBookTags(editingBookId, nextTags);
}

async function addEditingBookTag(rawTag) {
  const tag = normalizeTagInput(rawTag);
  if (!tag) {
    return;
  }

  const currentTags = getEditingBookTags();
  if (
    currentTags.some(
      (entry) => viewerTags.tagKey(entry) === viewerTags.tagKey(tag),
    )
  ) {
    if (editTagInput) {
      editTagInput.value = "";
      hideEditTagSuggest();
    }
    return;
  }

  if (editTagAddBtn) {
    editTagAddBtn.disabled = true;
  }
  try {
    await persistEditingBookTags([...currentTags, tag]);
    if (editTagInput) {
      editTagInput.value = "";
      hideEditTagSuggest();
      editTagInput.focus();
    }
  } catch (error) {
    console.error(error);
    window.alert(`Could not save tag: ${error.message}`);
  } finally {
    if (editTagAddBtn) {
      editTagAddBtn.disabled = false;
    }
  }
}

async function removeEditingBookTag(rawTag) {
  const removeKey = viewerTags.tagKey(rawTag);
  const nextTags = getEditingBookTags().filter(
    (tag) => viewerTags.tagKey(tag) !== removeKey,
  );

  if (editTagAddBtn) {
    editTagAddBtn.disabled = true;
  }
  try {
    await persistEditingBookTags(nextTags);
  } catch (error) {
    console.error(error);
    window.alert(`Could not remove tag: ${error.message}`);
  } finally {
    if (editTagAddBtn) {
      editTagAddBtn.disabled = false;
    }
  }
}

async function removeDetailBookTag(rawTag) {
  if (!detailBookId || !serveEnabled) {
    return;
  }

  const book = books.find((entry) => entry.id === detailBookId);
  const currentTags = Array.isArray(book?.tags) ? book.tags : [];
  const removeKey = viewerTags.tagKey(rawTag);
  const nextTags = currentTags.filter(
    (tag) => viewerTags.tagKey(tag) !== removeKey,
  );

  try {
    await persistBookTags(detailBookId, nextTags);
  } catch (error) {
    console.error(error);
    window.alert(`Could not remove tag: ${error.message}`);
  }
}

function renderBookTagsHtml(book) {
  const tags = Array.isArray(book.tags) ? book.tags : [];
  if (!tags.length) {
    return "";
  }

  const editable = serveEnabled;
  const chips = tags
    .map((tag) => {
      const label = viewerTags.formatTagLabel(tag);
      const searchButton = `<button type="button" class="book-detail-tag" aria-label="Search for tag ${viewerCardHtml.escapeHtml(label)}">${viewerCardHtml.escapeHtml(label)}</button>`;
      if (!editable) {
        return searchButton;
      }
      return `<span class="book-detail-tag-chip">${searchButton}<button type="button" class="book-detail-tag-remove" aria-label="Remove tag ${viewerCardHtml.escapeHtml(label)}">×</button></span>`;
    })
    .join("");
  const editableClass = editable ? " book-detail-tags--editable" : "";
  return `<div class="book-detail-tags${editableClass}" aria-label="Tags">${chips}</div>`;
}
