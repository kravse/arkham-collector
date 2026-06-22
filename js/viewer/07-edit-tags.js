/* Tag editing in the dev-server edit dialog */

function normalizeTagInput(rawTag) {
  const text = String(rawTag || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!text || text.length > 48) {
    return "";
  }
  return text.toUpperCase();
}

function formatTagLabel(tag) {
  return normalizeTagInput(tag) || String(tag || "").trim().toUpperCase();
}

function getAllKnownTags() {
  const byId = window.BOOK_TAGS || {};
  const seen = new Set();
  const tags = [];
  for (const bookTags of Object.values(byId)) {
    if (!Array.isArray(bookTags)) {
      continue;
    }
    for (const tag of bookTags) {
      const label = formatTagLabel(tag);
      if (!label) {
        continue;
      }
      const key = tagKey(label);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      tags.push(label);
    }
  }
  return tags.sort((a, b) => tagKey(a).localeCompare(tagKey(b)));
}

function getEditingBookTags() {
  if (!editingBookId) {
    return [];
  }
  const book = books.find((entry) => entry.id === editingBookId);
  return Array.isArray(book?.tags) ? book.tags.slice() : [];
}

function tagKey(tag) {
  return String(tag || "")
    .trim()
    .toLowerCase();
}

let tagColorRegistry = viewerTags.createTagColorRegistry([]);

function rebuildTagColorRegistry() {
  tagColorRegistry = viewerTags.createTagColorRegistry(getAllKnownTags());
}

function tagChipStyleAttr(tag) {
  return tagColorRegistry.tagChipStyleAttr(formatTagLabel(tag));
}

function syncEditTagsVisibility() {
  if (editTagsField) {
    editTagsField.hidden = !serveEnabled;
  }
}

function renderEditTagsUi() {
  if (!editTagsCurrent || !editTagsPoolList) {
    return;
  }

  const currentTags = getEditingBookTags();
  const currentKeys = new Set(currentTags.map(tagKey));

  if (!currentTags.length) {
    editTagsCurrent.innerHTML =
      '<p class="edit-tags-empty">No tags yet.</p>';
  } else {
    editTagsCurrent.innerHTML = currentTags
      .map((tag) => {
        const label = formatTagLabel(tag);
        return `<span class="edit-tag-chip" ${tagChipStyleAttr(label)}><span class="edit-tag-chip-label">${escapeHtml(label)}</span><button type="button" class="edit-tag-remove" aria-label="Remove tag ${escapeHtml(label)}">×</button></span>`;
      })
      .join("");
  }

  const poolTags = getAllKnownTags().filter((tag) => !currentKeys.has(tagKey(tag)));
  if (!poolTags.length) {
    editTagsPool.hidden = true;
    editTagsPoolList.innerHTML = "";
    return;
  }

  editTagsPool.hidden = false;
  editTagsPoolList.innerHTML = poolTags
    .map((tag) => {
      const label = formatTagLabel(tag);
      return `<button type="button" class="edit-tag-pool-btn" ${tagChipStyleAttr(label)}>${escapeHtml(label)}</button>`;
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
  prepareBookSearchIndex(book);
  rebuildTagColorRegistry();
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
  if (currentTags.some((entry) => tagKey(entry) === tagKey(tag))) {
    if (editTagInput) {
      editTagInput.value = "";
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
  const removeKey = tagKey(rawTag);
  const nextTags = getEditingBookTags().filter(
    (tag) => tagKey(tag) !== removeKey,
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
  const removeKey = tagKey(rawTag);
  const nextTags = currentTags.filter((tag) => tagKey(tag) !== removeKey);

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
      const label = formatTagLabel(tag);
      const styleAttr = tagChipStyleAttr(label);
      const searchButton = `<button type="button" class="book-detail-tag" ${styleAttr} aria-label="Search for tag ${escapeHtml(label)}">${escapeHtml(label)}</button>`;
      if (!editable) {
        return searchButton;
      }
      return `<span class="book-detail-tag-chip" ${styleAttr}>${searchButton}<button type="button" class="book-detail-tag-remove" aria-label="Remove tag ${escapeHtml(label)}">×</button></span>`;
    })
    .join("");
  const editableClass = editable ? " book-detail-tags--editable" : "";
  return `<div class="book-detail-tags${editableClass}" aria-label="Tags">${chips}</div>`;
}

function applyTagSearch(rawTag) {
  const tag = formatTagLabel(rawTag);
  if (!tag || !searchInput) {
    return;
  }

  searchInput.value = viewerFilters.formatTagSearchQuery(tag);
  updateSearchClearVisibility();
  closeBookDetail({ programmatic: true });
  renderNow();
  searchInput.focus();
  grid.scrollIntoView({ behavior: "smooth", block: "start" });
}

rebuildTagColorRegistry();
