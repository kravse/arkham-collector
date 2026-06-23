/* Search chips, tag autocomplete, and compound query state */

const searchTagFilters = [];
let searchSuggestIndex = -1;
let searchRenderTimer = null;
let tagSuggestScrollY = 0;

function isTagSuggestTouchAllowed(target) {
  return Boolean(target?.closest?.(".search-tag-suggest"));
}

function preventTagSuggestTouchMove(event) {
  if (isTagSuggestTouchAllowed(event.target)) {
    return;
  }
  event.preventDefault();
}

function setTagSuggestScrollLock(locked) {
  const root = document.documentElement;
  const isLocked = document.body.classList.contains("search-tag-suggest-open");
  if (locked === isLocked) {
    return;
  }

  if (locked) {
    tagSuggestScrollY = window.scrollY;
    window.scrollTo(0, 0);
    root.classList.add("search-tag-suggest-open");
    document.body.classList.add("search-tag-suggest-open");
    document.body.style.top = "0";
    document.addEventListener("touchmove", preventTagSuggestTouchMove, {
      passive: false,
    });
    return;
  }

  root.classList.remove("search-tag-suggest-open");
  document.body.classList.remove("search-tag-suggest-open");
  document.body.style.top = "";
  document.removeEventListener("touchmove", preventTagSuggestTouchMove);
  window.scrollTo(0, tagSuggestScrollY);
}

function getKnownSearchTags() {
  const tagTerms = searchTagFilters.map((label) =>
    String(label || "").trim().toLowerCase(),
  );
  const matchingBooks = viewerFilters.filterBooksMatchingTagTerms(
    getViewBooksWithoutSearch(),
    tagTerms,
  );
  return viewerTags.collectTagsFromBooks(matchingBooks);
}

function getSearchFilter() {
  return viewerFilters.buildSearchFilter(
    searchTagFilters,
    searchInput.value,
  );
}

function hasActiveSearch() {
  if (searchTagFilters.length > 0) {
    return true;
  }
  const draft = searchInput.value.trim();
  return Boolean(draft) && !viewerFilters.isTagDraftPending(draft);
}

function updateSearchClearVisibility() {
  searchClearBtn.hidden = !hasActiveSearch();
}

function renderNow() {
  if (searchRenderTimer) {
    clearTimeout(searchRenderTimer);
    searchRenderTimer = null;
  }
  render();
}

function debouncedRender() {
  if (searchRenderTimer) {
    clearTimeout(searchRenderTimer);
  }
  searchRenderTimer = setTimeout(() => {
    searchRenderTimer = null;
    render();
  }, 200);
}

function renderSearchChips() {
  if (!searchChips) {
    return;
  }
  searchChips.innerHTML = searchTagFilters
    .map((label, index) => {
      const safe = viewerCardHtml.escapeHtml(label);
      return `<span class="search-tag-chip"><span class="search-tag-chip-label">${safe}</span><button type="button" class="search-tag-chip-remove" data-search-tag-index="${index}" aria-label="Remove tag ${safe}">&times;</button></span>`;
    })
    .join("");
}

function hideTagSuggest() {
  searchSuggestIndex = -1;
  searchTagSuggest.hidden = true;
  searchTagSuggest.innerHTML = "";
  searchInput.setAttribute("aria-expanded", "false");
  setTagSuggestScrollLock(false);
}

function getTagSuggestItems() {
  const draft = viewerFilters.parseTagDraftInput(searchInput.value);
  if (!draft) {
    return [];
  }
  return viewerFilters.filterTagSuggestions(draft.partial, getKnownSearchTags(), {
    exclude: searchTagFilters,
  });
}

function renderTagSuggest() {
  const items = getTagSuggestItems();
  if (!items.length) {
    hideTagSuggest();
    return;
  }

  searchTagSuggest.innerHTML = items
    .map((label, index) => {
      const safe = viewerCardHtml.escapeHtml(label);
      const activeClass = index === searchSuggestIndex ? " active" : "";
      return `<li class="search-tag-suggest-item${activeClass}" role="option" data-suggest-index="${index}" aria-selected="${index === searchSuggestIndex}">${safe}</li>`;
    })
    .join("");
  searchTagSuggest.hidden = false;
  searchInput.setAttribute("aria-expanded", "true");
  setTagSuggestScrollLock(true);
}

function updateTagSuggest() {
  const draft = viewerFilters.parseTagDraftInput(searchInput.value);
  if (!draft) {
    hideTagSuggest();
    return;
  }
  if (searchSuggestIndex >= getTagSuggestItems().length) {
    searchSuggestIndex = -1;
  }
  renderTagSuggest();
}

function addSearchTag(label, options = {}) {
  const known = getKnownSearchTags();
  const canonical =
    viewerFilters.resolveTagFilterLabel(label, known) ||
    viewerTags.formatTagLabel(label);
  if (!canonical) {
    return false;
  }
  if (
    searchTagFilters.some(
      (entry) => viewerTags.tagKey(entry) === viewerTags.tagKey(canonical),
    )
  ) {
    return false;
  }
  searchTagFilters.push(canonical);
  renderSearchChips();
  if (!options.silent) {
    updateSearchClearVisibility();
    updateTagSuggest();
    debouncedRender();
  }
  return true;
}

function removeSearchTagAt(index) {
  if (index < 0 || index >= searchTagFilters.length) {
    return;
  }
  searchTagFilters.splice(index, 1);
  renderSearchChips();
  updateSearchClearVisibility();
  updateTagSuggest();
  renderNow();
}

function absorbSearchInputTokens() {
  const trimmed = searchInput.value.trim();
  const draftAbsorbed = viewerFilters.absorbTagDraftInput(
    trimmed,
    getKnownSearchTags(),
  );
  if (draftAbsorbed) {
    if (draftAbsorbed.chipLabel) {
      addSearchTag(draftAbsorbed.chipLabel, { silent: true });
    }
    searchInput.value = draftAbsorbed.remainder;
    return;
  }

  const parsed = viewerFilters.parseCompoundSearchQuery(searchInput.value);
  const known = getKnownSearchTags();
  const unknownTagParts = [];

  for (const term of parsed.tagTerms) {
    const label = viewerFilters.resolveTagFilterLabel(term, known);
    if (label) {
      addSearchTag(label, { silent: true });
    } else {
      unknownTagParts.push(viewerFilters.formatTagSearchQuery(term));
    }
  }

  searchInput.value = [...unknownTagParts, ...parsed.textTerms]
    .join(" ")
    .trim();
}

function pickTagSuggestion(index) {
  const items = getTagSuggestItems();
  const label = items[index];
  if (!label) {
    return;
  }
  addSearchTag(label, { silent: true });
  searchInput.value = "";
  hideTagSuggest();
  updateSearchClearVisibility();
  renderNow();
}

function clearSearchAll() {
  searchTagFilters.length = 0;
  searchInput.value = "";
  renderSearchChips();
  hideTagSuggest();
  updateSearchClearVisibility();
  renderNow();
}

function onSearchInput() {
  updateSearchClearVisibility();
  updateTagSuggest();
  debouncedRender();
}

function onSearchCommit() {
  absorbSearchInputTokens();
  hideTagSuggest();
  updateSearchClearVisibility();
  renderNow();
}

searchChips.addEventListener("click", (event) => {
  const button = event.target.closest("[data-search-tag-index]");
  if (!button) {
    return;
  }
  removeSearchTagAt(Number(button.dataset.searchTagIndex));
});

searchTagSuggest.addEventListener("mousedown", (event) => {
  const item = event.target.closest("[data-suggest-index]");
  if (!item) {
    return;
  }
  event.preventDefault();
  pickTagSuggestion(Number(item.dataset.suggestIndex));
});

searchInput.addEventListener("keydown", (event) => {
  const items = getTagSuggestItems();
  const suggestOpen = items.length > 0 && !searchTagSuggest.hidden;

  if (event.key === "Backspace" && !searchInput.value && searchTagFilters.length) {
    removeSearchTagAt(searchTagFilters.length - 1);
    return;
  }

  if (event.key === " " && !suggestOpen) {
    const draft = viewerFilters.parseTagDraftInput(searchInput.value.trim());
    if (draft?.partial) {
      const label = viewerFilters.resolveTagFilterLabel(
        draft.partial,
        getKnownSearchTags(),
      );
      if (label) {
        event.preventDefault();
        addSearchTag(label, { silent: true });
        searchInput.value = "";
        updateSearchClearVisibility();
        updateTagSuggest();
        renderNow();
      }
    }
    return;
  }

  if (!suggestOpen) {
    if (event.key === "Escape") {
      hideTagSuggest();
    }
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    searchSuggestIndex = (searchSuggestIndex + 1) % items.length;
    renderTagSuggest();
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    searchSuggestIndex =
      searchSuggestIndex <= 0 ? items.length - 1 : searchSuggestIndex - 1;
    renderTagSuggest();
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (searchSuggestIndex >= 0) {
      pickTagSuggestion(searchSuggestIndex);
    } else {
      onSearchCommit();
    }
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    hideTagSuggest();
  }
});

searchInput.addEventListener("blur", () => {
  window.setTimeout(() => {
    absorbSearchInputTokens();
    hideTagSuggest();
    updateSearchClearVisibility();
    renderNow();
  }, 120);
});

searchClearBtn.addEventListener("click", () => {
  clearSearchAll();
  searchInput.focus();
});

searchInput.addEventListener("input", onSearchInput);
searchInput.addEventListener("search", onSearchCommit);
searchInput.addEventListener("change", onSearchCommit);

document.addEventListener("click", (event) => {
  if (
    !searchTagSuggest.hidden &&
    !event.target.closest(".search-wrap")
  ) {
    hideTagSuggest();
  }
});
