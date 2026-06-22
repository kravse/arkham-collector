/* Tag editing in the dev-server edit dialog */

function getAllKnownTags() {
  const byId = window.BOOK_TAGS || {};
  const seen = new Set();
  const tags = [];
  for (const bookTags of Object.values(byId)) {
    if (!Array.isArray(bookTags)) {
      continue;
    }
    for (const tag of bookTags) {
      const text = String(tag || "").trim();
      if (!text) {
        continue;
      }
      const key = text.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      tags.push(text);
    }
  }
  return tags.sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
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
      .map(
        (tag) =>
          `<span class="edit-tag-chip"><span class="edit-tag-chip-label">${escapeHtml(tag)}</span><button type="button" class="edit-tag-remove" aria-label="Remove tag ${escapeHtml(tag)}">×</button></span>`,
      )
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
    .map(
      (tag) =>
        `<button type="button" class="edit-tag-pool-btn">${escapeHtml(tag)}</button>`,
    )
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
}

async function persistEditingBookTags(nextTags) {
  if (!editingBookId || !serveEnabled) {
    return;
  }

  const response = await fetch(`/api/books/${editingBookId}/tags`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags: nextTags }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Could not save tags");
  }

  applyTagResponseToBook(editingBookId, payload.tags);
  renderEditTagsUi();
  render();
  if (detailBookId === editingBookId) {
    openBookDetail(editingBookId, { historyMode: "none" });
  }
}

async function addEditingBookTag(rawTag) {
  const tag = String(rawTag || "").trim().replace(/\s+/g, " ");
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

function renderBookTagsHtml(book) {
  const tags = Array.isArray(book.tags) ? book.tags : [];
  if (!tags.length) {
    return "";
  }

  const chips = tags
    .map((tag) => `<span class="book-detail-tag">${escapeHtml(tag)}</span>`)
    .join("");
  return `<div class="book-detail-tags" aria-label="Tags">${chips}</div>`;
}
