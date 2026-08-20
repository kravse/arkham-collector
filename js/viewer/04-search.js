/* Search chips, field autocomplete, and compound query state */

/** @type {{ type: string, label: string }[]} */
const searchFilterChips = [];
let searchSuggestIndex = -1;
let searchRenderTimer = null;
let suggestUpdateTimer = null;
let suggestScrollY = 0;
let cachedSearchFilter = null;
let cachedSearchFilterKey = null;
const knownFieldValuesCache = new Map();
/** @type {string[]} */
let lastSuggestItems = [];

function searchStateKey() {
  return JSON.stringify({
    chips: searchFilterChips,
    draft: searchInput.value,
  });
}

function invalidateSearchFilterCache() {
  cachedSearchFilterKey = null;
  cachedSearchFilter = null;
}

function invalidateKnownFieldValuesCache() {
  knownFieldValuesCache.clear();
}

function invalidateSearchViewCache() {
  invalidateSearchFilterCache();
  invalidateKnownFieldValuesCache();
}

function searchFilterHasTerms(filter) {
  return (
    (filter.textTerms || []).length > 0 ||
    viewerSearchFields.SEARCH_FIELD_TYPES.some(
      (field) => (filter.fieldTerms[field.key] || []).length > 0,
    )
  );
}

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
  if (viewerSearchFields.getDecadeSuggestDraft(searchInput.value)) {
    return viewerSearchFields.getFieldByKey("decade");
  }
  return viewerSearchFields.getActiveDraftField(searchInput.value);
}

function getFieldDraftForSuggest(field) {
  if (field?.key === "decade") {
    return viewerSearchFields.getDecadeSuggestDraft(searchInput.value);
  }
  return viewerSearchFields.parseFieldDraftInput(searchInput.value, field);
}

function getKnownFieldValues(fieldKey) {
  const field = viewerSearchFields.getFieldByKey(fieldKey);
  if (!field) {
    return [];
  }
  const scopeKey = [
    fieldKey,
    typeof getViewWithoutSearchCacheKey === "function"
      ? getViewWithoutSearchCacheKey()
      : "",
    JSON.stringify(
      viewerSearchFields.chipsToFieldTermsPartial(
        searchFilterChips,
        fieldKey,
      ),
    ),
  ].join("|");
  if (knownFieldValuesCache.has(scopeKey)) {
    return knownFieldValuesCache.get(scopeKey);
  }
  const scopedBooks = viewerFilters.filterBooksMatchingFieldTerms(
    getViewBooksWithoutSearch(),
    viewerSearchFields.chipsToFieldTermsPartial(
      searchFilterChips,
      fieldKey,
    ),
  );
  const values = field.collectValues(scopedBooks);
  knownFieldValuesCache.set(scopeKey, values);
  return values;
}

function getSearchFilter() {
  const key = searchStateKey();
  if (key !== cachedSearchFilterKey) {
    cachedSearchFilterKey = key;
    cachedSearchFilter = viewerFilters.buildSearchFilter(
      searchFilterChips,
      searchInput.value,
    );
  }
  return cachedSearchFilter;
}

function hasActiveSearch() {
  if (searchFilterChips.length > 0) {
    return true;
  }
  const draft = searchInput.value.trim();
  if (!draft || viewerFilters.isSearchDraftBlockingText(draft)) {
    return false;
  }
  return searchFilterHasTerms(getSearchFilter());
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
  lastSuggestItems = [];
  searchFieldSuggest.hidden = true;
  searchFieldSuggest.innerHTML = "";
  searchInput.setAttribute("aria-expanded", "false");
  setSuggestScrollLock(false);
}

function updateSuggest() {
  updateSuggestNow();
}

function computeSuggestItems() {
  const field = getActiveSuggestField();
  if (!field) {
    return [];
  }
  const draft = getFieldDraftForSuggest(field);
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

function getSuggestItems() {
  return computeSuggestItems();
}

function renderSuggest(field, items) {
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

function updateSuggestNow() {
  const field = getActiveSuggestField();
  if (!field) {
    lastSuggestItems = [];
    hideSuggest();
    return;
  }
  lastSuggestItems = computeSuggestItems();
  if (searchSuggestIndex >= lastSuggestItems.length) {
    searchSuggestIndex = -1;
  }
  renderSuggest(field, lastSuggestItems);
}

function debouncedUpdateSuggest() {
  if (suggestUpdateTimer) {
    clearTimeout(suggestUpdateTimer);
  }
  suggestUpdateTimer = setTimeout(() => {
    suggestUpdateTimer = null;
    updateSuggestNow();
  }, 120);
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
  invalidateSearchViewCache();
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
  invalidateSearchViewCache();
  renderSearchChips();
  updateSearchClearVisibility();
  updateSuggest();
  renderNow();
}

function absorbSearchInputTokens() {
  const trimmed = searchInput.value.trim();
  const activeField = viewerSearchFields.getActiveDraftField(trimmed);

  if (activeField && activeField.key !== "decade") {
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
    if (field.key === "decade") {
      continue;
    }
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
  const items = lastSuggestItems.length ? lastSuggestItems : computeSuggestItems();
  const label = items[index];
  if (!field || !label) {
    return;
  }
  const draft = getFieldDraftForSuggest(field);
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
  invalidateSearchViewCache();
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
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  });
}

function onSearchInput() {
  invalidateSearchFilterCache();
  updateSearchClearVisibility();
  debouncedUpdateSuggest();
  debouncedRender();
}

function onSearchCommit() {
  absorbSearchInputTokens();
  invalidateSearchFilterCache();
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
  const suggestOpen =
    lastSuggestItems.length > 0 && !searchFieldSuggest.hidden;
  const items = suggestOpen ? lastSuggestItems : [];
  const activeField = getActiveSuggestField();

  if (event.key === "Backspace" && !searchInput.value && searchFilterChips.length) {
    removeSearchChipAt(searchFilterChips.length - 1);
    return;
  }

  if (event.key === " " && !suggestOpen && activeField && activeField.key !== "decade") {
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
    renderSuggest(getActiveSuggestField(), items);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    searchSuggestIndex =
      searchSuggestIndex <= 0 ? items.length - 1 : searchSuggestIndex - 1;
    renderSuggest(getActiveSuggestField(), items);
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
