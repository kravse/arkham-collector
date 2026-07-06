/* Generated from scripts/lib/viewer-filters.js — run npm run bundle-viewer */

const viewerFilters = (function () {
  function getSearchFields() {
    if (typeof viewerSearchFields !== "undefined") {
      return viewerSearchFields;
    }
    throw new Error("viewerSearchFields is not available");
  }
  
  function getTagHelpers() {
    if (typeof viewerTags !== "undefined") {
      return viewerTags;
    }
    throw new Error("viewerTags is not available");
  }
  
  const SAMPLER_ISSUE_TITLE_RE = /^The Arkham Sampler \(Vol\. [IV]+, No\. \d+\)$/;
  const COLLECTOR_ISSUE_TITLE_RE = /^The Arkham Collector \(No\. \d+\)$/;
  
  function getPersonNames() {
    if (typeof viewerPersonNames !== "undefined") {
      return viewerPersonNames;
    }
    if (typeof global !== "undefined" && global.__viewerPersonNames) {
      return global.__viewerPersonNames;
    }
    throw new Error("viewerPersonNames is not available");
  }
  
  function tagField() {
    return getSearchFields().getFieldByKey("tag");
  }
  
  function prepareBookSearchIndex(book) {
    const personNames = getPersonNames();
    book._searchHaystack = [
      book.title,
      book.author,
      book.coverArtist,
      book.publicationDate,
      book.decade,
      book.listAuthor,
      ...personNames.resolveBookAuthors(book),
      ...personNames.resolveBookCoverArtists(book),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }
  
  function formatTagSearchQuery(tag) {
    return tagField().formatQuery(tag);
  }
  
  function parseTagDraftInput(input) {
    const draft = getSearchFields().parseFieldDraftInput(input, tagField());
    if (!draft) {
      return null;
    }
    return {
      partial: draft.partial,
      quoted: draft.quoted,
      prefix: draft.prefix,
    };
  }
  
  function isTagDraftPending(draftQuery) {
    const text = String(draftQuery || "").trim();
    if (!text) {
      return false;
    }
    if (getSearchFields().isFieldLiteralPrefixPending(text, tagField())) {
      return true;
    }
    return parseTagDraftInput(text) !== null;
  }
  
  function absorbTagDraftInput(input, knownTags) {
    const absorbed = getSearchFields().absorbFieldDraftInput(
      input,
      tagField(),
      knownTags,
    );
    if (!absorbed) {
      return null;
    }
    return {
      chipLabel: absorbed.chipLabel,
      remainder: absorbed.remainder,
    };
  }
  
  function resolveTagFilterLabel(term, knownTags) {
    return getSearchFields().resolveKnownFieldLabel(term, tagField(), knownTags);
  }
  
  function filterTagSuggestions(partial, knownTags, options = {}) {
    return getSearchFields().filterFieldSuggestions(
      partial,
      tagField(),
      knownTags,
      options,
    );
  }
  
  function matchesTagSearch(book, term) {
    return tagField().matchBook(book, term);
  }
  
  function filterBooksMatchingTagTerms(books, tagTerms) {
    return getSearchFields().filterBooksMatchingFieldTerms(books, {
      tag: tagTerms,
      author: [],
      cover: [],
    });
  }
  
  function matchesSearch(book, query) {
    const searchFields = getSearchFields();
    return searchFields.matchesCompoundSearch(
      book,
      searchFields.parseCompoundSearchQuery(query),
    );
  }
  
  function isMagazineIssue(book) {
    const listTitle = String(book?.listTitle || "").trim();
    const title = String(book?.title || "").trim();
  
    if (listTitle === "The Arkham Sampler") {
      return SAMPLER_ISSUE_TITLE_RE.test(title);
    }
    if (listTitle === "The Arkham Collector") {
      return COLLECTOR_ISSUE_TITLE_RE.test(title);
    }
    return false;
  }
  
  function passesHiddenVisibility(book, { hiddenOnly }) {
    return hiddenOnly ? book.hidden : !book.hidden;
  }
  
  function passesBookVisibility(book, { hiddenOnly, showMagazines }) {
    if (!passesHiddenVisibility(book, { hiddenOnly })) {
      return false;
    }
    if (isMagazineIssue(book) && !showMagazines) {
      return false;
    }
    return true;
  }
  
  function passesMycroftImprintFilter(book, mycroftFilterMode) {
    if (mycroftFilterMode === "only") {
      return book.imprint === "mycroft_moran";
    }
    if (mycroftFilterMode === "hidden") {
      return book.imprint !== "mycroft_moran";
    }
    return true;
  }
  
  function isCollected(book, collectedIds) {
    return collectedIds.has(book.id);
  }
  
  function isOrdered(book, collectedIds, orderedIds) {
    return orderedIds.has(book.id) && !isCollected(book, collectedIds);
  }
  
  function isInCollection(book, collectedIds, orderedIds) {
    return isCollected(book, collectedIds) || isOrdered(book, collectedIds, orderedIds);
  }
  
  function passesCollectionFilter(
    book,
    collectionFilterMode,
    collectedIds,
    orderedIds,
  ) {
    if (collectionFilterMode === "collection") {
      return isInCollection(book, collectedIds, orderedIds);
    }
    if (collectionFilterMode === "ordered") {
      return isOrdered(book, collectedIds, orderedIds);
    }
    return true;
  }
  
  function passesWantFilter(book, wantFilterMode, wantIds) {
    if (wantFilterMode == null) {
      return true;
    }
    return wantIds.has(book.id);
  }
  
  function hasAnyWants(books, wantIds, visibilityOptions) {
    return books.some(
      (book) =>
        passesBookVisibility(book, visibilityOptions) && wantIds.has(book.id),
    );
  }
  
  function filterVisibleBooks(books, options) {
    const {
      hiddenOnly,
      showMagazines,
      mycroftFilterMode,
      collectionFilterMode,
      wantFilterMode,
      collectedIds,
      orderedIds,
      wantIds,
      searchQuery = "",
      searchFilter,
    } = options;
  
    const resolvedSearchFilter =
      searchFilter ||
      (searchQuery
        ? getSearchFields().parseCompoundSearchQuery(searchQuery)
        : getSearchFields().emptySearchFilter());
  
    return books.filter(
      (book) =>
        passesBookVisibility(book, { hiddenOnly, showMagazines }) &&
        passesMycroftImprintFilter(book, mycroftFilterMode) &&
        passesCollectionFilter(
          book,
          collectionFilterMode,
          collectedIds,
          orderedIds,
        ) &&
        passesWantFilter(book, wantFilterMode, wantIds) &&
        getSearchFields().matchesCompoundSearch(book, resolvedSearchFilter),
    );
  }
  
  function cycleMycroftFilter(mycroftFilterMode) {
    if (mycroftFilterMode === null) {
      return "only";
    }
    if (mycroftFilterMode === "only") {
      return "hidden";
    }
    return null;
  }
  
  function cycleCollectionFilter(collectionFilterMode, hasAnyOrderedBooks) {
    if (hasAnyOrderedBooks) {
      if (collectionFilterMode === null) {
        return "collection";
      }
      if (collectionFilterMode === "collection") {
        return "ordered";
      }
      return null;
    }
    return collectionFilterMode === "collection" ? null : "collection";
  }
  
  function hasAnyOrderedBooks(books, collectedIds, orderedIds, visibilityOptions) {
    return books.some(
      (book) =>
        passesBookVisibility(book, visibilityOptions) &&
        isOrdered(book, collectedIds, orderedIds),
    );
  }
  
  function pickRandomBook(books) {
    if (!Array.isArray(books) || books.length === 0) {
      return null;
    }
    return books[Math.floor(Math.random() * books.length)];
  }
  
  function parseSearchQuery(...args) {
    return getSearchFields().parseSearchQuery(...args);
  }
  
  function parseCompoundSearchQuery(...args) {
    return getSearchFields().parseCompoundSearchQuery(...args);
  }
  
  function serializeCompoundSearchQuery(...args) {
    return getSearchFields().serializeCompoundSearchQuery(...args);
  }
  
  function buildSearchFilter(...args) {
    return getSearchFields().buildSearchFilter(...args);
  }
  
  function isSearchDraftBlockingText(...args) {
    return getSearchFields().isSearchDraftBlockingText(...args);
  }
  
  function parseFieldDraftInput(...args) {
    return getSearchFields().parseFieldDraftInput(...args);
  }
  
  function getActiveDraftField(...args) {
    return getSearchFields().getActiveDraftField(...args);
  }
  
  function absorbFieldDraftInput(...args) {
    return getSearchFields().absorbFieldDraftInput(...args);
  }
  
  function resolveFieldFilterLabel(...args) {
    return getSearchFields().resolveFieldFilterLabel(...args);
  }
  
  function resolveKnownFieldLabel(...args) {
    return getSearchFields().resolveKnownFieldLabel(...args);
  }
  
  function filterFieldSuggestions(...args) {
    return getSearchFields().filterFieldSuggestions(...args);
  }
  
  function formatFieldSearchQuery(...args) {
    return getSearchFields().formatFieldSearchQuery(...args);
  }
  
  function matchesCompoundSearch(...args) {
    return getSearchFields().matchesCompoundSearch(...args);
  }
  
  function filterBooksMatchingFieldTerms(...args) {
    return getSearchFields().filterBooksMatchingFieldTerms(...args);
  }
  
  function chipsToFieldTermsPartial(...args) {
    return getSearchFields().chipsToFieldTermsPartial(...args);
  }
  
  function emptySearchFilter(...args) {
    return getSearchFields().emptySearchFilter(...args);
  }
  
  function tagKey(...args) {
    return getTagHelpers().tagKey(...args);
  }
  return {
    prepareBookSearchIndex,
    parseSearchQuery,
    parseCompoundSearchQuery,
    serializeCompoundSearchQuery,
    buildSearchFilter,
    isTagDraftPending,
    isSearchDraftBlockingText,
    parseTagDraftInput,
    parseFieldDraftInput,
    getActiveDraftField,
    absorbTagDraftInput,
    absorbFieldDraftInput,
    resolveTagFilterLabel,
    resolveFieldFilterLabel,
    resolveKnownFieldLabel,
    filterTagSuggestions,
    filterFieldSuggestions,
    formatTagSearchQuery,
    formatFieldSearchQuery,
    matchesTagSearch,
    matchesCompoundSearch,
    filterBooksMatchingTagTerms,
    filterBooksMatchingFieldTerms,
    chipsToFieldTermsPartial,
    emptySearchFilter,
    matchesSearch,
    isMagazineIssue,
    passesHiddenVisibility,
    passesBookVisibility,
    passesMycroftImprintFilter,
    isCollected,
    isOrdered,
    isInCollection,
    passesCollectionFilter,
    passesWantFilter,
    filterVisibleBooks,
    cycleMycroftFilter,
    cycleCollectionFilter,
    hasAnyOrderedBooks,
    hasAnyWants,
    pickRandomBook,
  };
})();
