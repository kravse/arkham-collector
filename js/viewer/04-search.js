/* Search chips, field autocomplete, and compound query state */

/** @type {{ type: string, label: string }[]} */
const searchFilterChips = [];
let searchSuggestIndex = -1;
let searchRenderTimer = null;
let suggestScrollY = 0;

function isSuggestTouchAllowed(target) {
  return Boolean(target?.closest?.(".search-field-suggest"));
}

function preventSuggestTouchMove(event) {
  if (isSuggestTouchAllowed(event.target)) {
    return;
  }
  event.preventDefault();
}

function setSuggestScrollLock(locked) {
  const root = document.documentElement;
  const isLocked = document.body.classList.contains("search-field-suggest-open");
  if (locked === isLocked) {
    return;
  }

  if (locked) {
    suggestScrollY = window.scrollY;
    window.scrollTo(0, 0);
    root.classList.add("search-field-suggest-open");
    document.body.classList.add("search-field-suggest-open");
    document.body.style.top = "0";
    document.addEventListener("touchmove", preventSuggestTouchMove, {
      passive: false,
    });
    return;
  }

  root.classList.remove("search-field-suggest-open");
  document.body.classList.remove("search-field-suggest-open");
  document.body.style.top = "";
  document.removeEventListener("touchmove", preventSuggestTouchMove);
  window.scrollTo(0, suggestScrollY);
}

function getActiveSuggestField() {
  return viewerSearchFields.getActiveDraftField(searchInput.value);
}

function getKnownFieldValues(fieldKey) {
  const field = viewerSearchFields.getFieldByKey(fieldKey);
  if (!field) {
    return [];
  }
  const scopedBooks = viewerFilters.filterBooksMatchingFieldTerms(
    getViewBooksWithoutSearch(),
    viewerSearchFields.chipsToFieldTermsPartial(
      searchFilterChips,
      fieldKey,
    ),
  );
  return field.collectValues(scopedBooks);
}

function getSearchFilter() {
  return viewerFilters.buildSearchFilter(
    searchFilterChips,
    searchInput.value,
  );
}

function hasActiveSearch() {
  if (searchFilterChips.length > 0) {
    return true;
  }
  const draft = searchInput.value.trim();
  if (!draft || viewerFilters.isSearchDraftBlockingText(draft)) {
    return false;
  }
  const filter = viewerFilters.buildSearchFilter([], draft);
  return (
    filter.textTerms.length > 0 ||
    viewerSearchFields.SEARCH_FIELD_TYPES.some(
      (field) => (filter.fieldTerms[field.key] || []).length > 0,
    )
  );
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
  searchChips.innerHTML = searchFilterChips
    .map((chip, index) => {
      const field = viewerSearchFields.getFieldByKey(chip.type);
      const safe = viewerCardHtml.escapeHtml(chip.label);
      const ariaPrefix = field?.chipAriaPrefix || chip.type;
      return `<span class="search-field-chip search-field-chip--${chip.type}"><span class="search-field-chip-label">${safe}</span><button type="button" class="search-field-chip-remove" data-search-chip-index="${index}" aria-label="Remove ${ariaPrefix} ${safe}">&times;</button></span>`;
    })
    .join("");
}

function hideSuggest() {
  searchSuggestIndex = -1;
  searchFieldSuggest.hidden = true;
  searchFieldSuggest.innerHTML = "";
  searchInput.setAttribute("aria-expanded", "false");
  setSuggestScrollLock(false);
}

function getSuggestItems() {
  const field = getActiveSuggestField();
  if (!field) {
    return [];
  }
  const draft = viewerSearchFields.parseFieldDraftInput(
    searchInput.value,
    field,
  );
  if (!draft) {
    return [];
  }
  const exclude = searchFilterChips
    .filter((chip) => chip.type === field.key)
    .map((chip) => chip.label);
  return viewerSearchFields.filterFieldSuggestions(
    draft.partial,
    field,
    getKnownFieldValues(field.key),
    { exclude },
  );
}

function renderSuggest() {
  const field = getActiveSuggestField();
  const items = getSuggestItems();
  if (!field || !items.length) {
    hideSuggest();
    return;
  }

  searchFieldSuggest.innerHTML = items
    .map((label, index) => {
      const safe = viewerCardHtml.escapeHtml(label);
      const activeClass = index === searchSuggestIndex ? " active" : "";
      return `<li class="search-field-suggest-item search-field-suggest-item--${field.key}${activeClass}" role="option" data-suggest-index="${index}" aria-selected="${index === searchSuggestIndex}">${safe}</li>`;
    })
    .join("");
  searchFieldSuggest.hidden = false;
  searchInput.setAttribute("aria-expanded", "true");
  setSuggestScrollLock(true);
}

function updateSuggest() {
  if (!getActiveSuggestField()) {
    hideSuggest();
    return;
  }
  if (searchSuggestIndex >= getSuggestItems().length) {
    searchSuggestIndex = -1;
  }
  renderSuggest();
}

function addSearchChip(fieldKey, label, options = {}) {
  const field = viewerSearchFields.getFieldByKey(fieldKey);
  if (!field) {
    return false;
  }
  const known = getKnownFieldValues(fieldKey);
  const canonical = field.formatLabel(label, known);
  if (!canonical) {
    return false;
  }
  if (
    searchFilterChips.some(
      (chip) =>
        chip.type === fieldKey &&
        field.labelKey(chip.label) === field.labelKey(canonical),
    )
  ) {
    return false;
  }
  searchFilterChips.push({ type: fieldKey, label: canonical });
  renderSearchChips();
  if (!options.silent) {
    updateSearchClearVisibility();
    updateSuggest();
    debouncedRender();
  }
  return true;
}

function removeSearchChipAt(index) {
  if (index < 0 || index >= searchFilterChips.length) {
    return;
  }
  searchFilterChips.splice(index, 1);
  renderSearchChips();
  updateSearchClearVisibility();
  updateSuggest();
  renderNow();
}

function absorbSearchInputTokens() {
  const trimmed = searchInput.value.trim();
  const activeField = viewerSearchFields.getActiveDraftField(trimmed);

  if (activeField) {
    const draftAbsorbed = viewerSearchFields.absorbFieldDraftInput(
      trimmed,
      activeField,
      getKnownFieldValues(activeField.key),
    );
    if (draftAbsorbed) {
      if (draftAbsorbed.chipLabel) {
        addSearchChip(activeField.key, draftAbsorbed.chipLabel, { silent: true });
      }
      searchInput.value = draftAbsorbed.remainder;
      return;
    }
  }

  const parsed = viewerSearchFields.parseCompoundSearchQuery(searchInput.value);
  const unknownParts = [];

  for (const field of viewerSearchFields.SEARCH_FIELD_TYPES) {
    const known = getKnownFieldValues(field.key);
    for (const term of parsed.fieldTerms[field.key] || []) {
      const label = viewerSearchFields.resolveKnownFieldLabel(
        term,
        field,
        known,
      );
      if (label) {
        addSearchChip(field.key, label, { silent: true });
      } else {
        unknownParts.push(field.formatQuery(term));
      }
    }
  }

  searchInput.value = [...unknownParts, ...parsed.textTerms]
    .join(" ")
    .trim();
}

function pickSuggestion(index) {
  const field = getActiveSuggestField();
  const items = getSuggestItems();
  const label = items[index];
  if (!field || !label) {
    return;
  }
  const draft = viewerSearchFields.parseFieldDraftInput(
    searchInput.value,
    field,
  );
  const prefix = draft?.prefix?.trim() || "";
  addSearchChip(field.key, label, { silent: true });
  searchInput.value = prefix;
  hideSuggest();
  updateSearchClearVisibility();
  renderNow();
}

function clearSearchState() {
  searchFilterChips.length = 0;
  searchInput.value = "";
  renderSearchChips();
  hideSuggest();
  updateSearchClearVisibility();
}

function clearSearchAll() {
  clearSearchState();
  renderNow();
}

function applyFieldSearch(fieldKey, rawValue) {
  const field = viewerSearchFields.getFieldByKey(fieldKey);
  if (!field) {
    return;
  }
  const label = field.formatLabel(rawValue, getKnownFieldValues(fieldKey));
  if (!label) {
    return;
  }

  searchFilterChips.length = 0;
  searchInput.value = "";
  renderSearchChips();
  hideSuggest();
  addSearchChip(fieldKey, label, { silent: true });
  updateSearchClearVisibility();
  closeBookDetail({ programmatic: true });
  renderNow();
  searchInput.blur();
  grid.scrollIntoView({ behavior: "smooth", block: "start" });
}

function onSearchInput() {
  updateSearchClearVisibility();
  updateSuggest();
  debouncedRender();
}

function onSearchCommit() {
  absorbSearchInputTokens();
  hideSuggest();
  updateSearchClearVisibility();
  renderNow();
}

searchChips.addEventListener("click", (event) => {
  const button = event.target.closest("[data-search-chip-index]");
  if (!button) {
    return;
  }
  removeSearchChipAt(Number(button.dataset.searchChipIndex));
});

searchFieldSuggest.addEventListener("mousedown", (event) => {
  const item = event.target.closest("[data-suggest-index]");
  if (!item) {
    return;
  }
  event.preventDefault();
  pickSuggestion(Number(item.dataset.suggestIndex));
});

searchInput.addEventListener("keydown", (event) => {
  const items = getSuggestItems();
  const suggestOpen = items.length > 0 && !searchFieldSuggest.hidden;
  const activeField = getActiveSuggestField();

  if (event.key === "Backspace" && !searchInput.value && searchFilterChips.length) {
    removeSearchChipAt(searchFilterChips.length - 1);
    return;
  }

  if (event.key === " " && !suggestOpen && activeField) {
    const draft = viewerSearchFields.parseFieldDraftInput(
      searchInput.value.trim(),
      activeField,
    );
    if (draft?.partial) {
      const label = viewerSearchFields.resolveKnownFieldLabel(
        draft.partial,
        activeField,
        getKnownFieldValues(activeField.key),
      );
      if (label) {
        event.preventDefault();
        addSearchChip(activeField.key, label, { silent: true });
        searchInput.value = draft.prefix?.trim() || "";
        updateSearchClearVisibility();
        updateSuggest();
        renderNow();
      }
    }
    return;
  }

  if (!suggestOpen) {
    if (event.key === "Escape") {
      hideSuggest();
    }
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    searchSuggestIndex = (searchSuggestIndex + 1) % items.length;
    renderSuggest();
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    searchSuggestIndex =
      searchSuggestIndex <= 0 ? items.length - 1 : searchSuggestIndex - 1;
    renderSuggest();
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (searchSuggestIndex >= 0) {
      pickSuggestion(searchSuggestIndex);
    } else {
      onSearchCommit();
    }
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    hideSuggest();
  }
});

searchInput.addEventListener("blur", () => {
  window.setTimeout(() => {
    absorbSearchInputTokens();
    hideSuggest();
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
    !searchFieldSuggest.hidden &&
    !event.target.closest(".search-wrap")
  ) {
    hideSuggest();
  }
});
