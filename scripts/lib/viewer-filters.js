const TAG_LITERAL = "tag";
const SAMPLER_ISSUE_TITLE_RE = /^The Arkham Sampler \(Vol\. [IV]+, No\. \d+\)$/;
const COLLECTOR_ISSUE_TITLE_RE = /^The Arkham Collector \(No\. \d+\)$/;
const TAG_SEARCH_PREFIX_RE = /^tag:\s*(?:"([^"]*)"|(.+))$/i;
const TAG_TOKEN_RE = /tag:\s*(?:"([^"]*)"|(\S+))/gi;
const TAG_DRAFT_RE = /^tag:\s*(?:"([^"]*)"?|(\S*))$/i;
const TAG_SHORTHAND_DRAFT_RE = /^tag(?:\s+(?:"([^"]*)"?|(\S*)))?$/i;

function tagKey(tag) {
  return String(tag || "")
    .trim()
    .toLowerCase();
}

function prepareBookSearchIndex(book) {
  book._searchHaystack = [
    book.title,
    book.author,
    book.coverArtist,
    book.publicationDate,
    book.decade,
    book.listAuthor,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function parseSearchQuery(query) {
  const text = String(query || "").trim();
  if (!text) {
    return { mode: "text", term: "" };
  }

  const tagMatch = text.match(TAG_SEARCH_PREFIX_RE);
  if (tagMatch) {
    return {
      mode: "tag",
      term: String(tagMatch[1] ?? tagMatch[2] ?? "")
        .trim()
        .toLowerCase(),
    };
  }

  return { mode: "text", term: text.toLowerCase() };
}

function formatTagSearchQuery(tag) {
  const text = String(tag || "").trim();
  if (!text) {
    return "";
  }
  if (/\s/.test(text)) {
    return `tag:"${text.replace(/"/g, "")}"`;
  }
  return `tag:${text}`;
}

function parseCompoundSearchQuery(query) {
  const raw = String(query || "");
  const tagTerms = [];
  const remainder = raw.replace(TAG_TOKEN_RE, (_, quoted, unquoted) => {
    const term = String(quoted ?? unquoted ?? "")
      .trim()
      .toLowerCase();
    if (term) {
      tagTerms.push(term);
    }
    return " ";
  });
  const textTerms = remainder
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.toLowerCase());

  return { tagTerms, textTerms };
}

function serializeCompoundSearchQuery({ tagTerms = [], textTerms = [] }) {
  const parts = [
    ...tagTerms.map((term) => formatTagSearchQuery(term)),
    ...textTerms,
  ].filter(Boolean);
  return parts.join(" ").trim();
}

function isTagDraftPending(draftQuery) {
  const text = String(draftQuery || "").trim();
  if (!text) {
    return false;
  }
  const lower = text.toLowerCase();
  if (
    lower.length <= TAG_LITERAL.length &&
    TAG_LITERAL.startsWith(lower)
  ) {
    return true;
  }
  return parseTagDraftInput(text) !== null;
}

function buildSearchFilter(chipTags, draftQuery) {
  const parsed = isTagDraftPending(draftQuery)
    ? { tagTerms: [], textTerms: [] }
    : parseCompoundSearchQuery(draftQuery);
  const tagTerms = [];
  const seen = new Set();

  for (const label of chipTags || []) {
    const term = String(label || "").trim().toLowerCase();
    if (!term || seen.has(term)) {
      continue;
    }
    seen.add(term);
    tagTerms.push(term);
  }

  for (const term of parsed.tagTerms) {
    if (!seen.has(term)) {
      seen.add(term);
      tagTerms.push(term);
    }
  }

  return { tagTerms, textTerms: parsed.textTerms };
}

function parseTagDraftInput(input) {
  const text = String(input || "").trim();
  if (TAG_DRAFT_RE.test(text)) {
    const match = text.match(TAG_DRAFT_RE);
    return {
      partial: String(match[1] ?? match[2] ?? "").trim(),
      quoted: /"/.test(text),
    };
  }
  if (TAG_SHORTHAND_DRAFT_RE.test(text)) {
    const match = text.match(TAG_SHORTHAND_DRAFT_RE);
    return {
      partial: String(match[1] ?? match[2] ?? "").trim(),
      quoted: /"/.test(text.slice(TAG_LITERAL.length)),
    };
  }
  return null;
}

function absorbTagDraftInput(input, knownTags) {
  const draft = parseTagDraftInput(input);
  if (!draft) {
    return null;
  }
  if (!draft.partial) {
    return { chipLabel: null, remainder: "" };
  }
  const chipLabel = resolveTagFilterLabel(draft.partial, knownTags);
  if (chipLabel) {
    return { chipLabel, remainder: "" };
  }
  return {
    chipLabel: null,
    remainder: formatTagSearchQuery(draft.partial),
  };
}

function resolveTagFilterLabel(term, knownTags) {
  const needle = tagKey(term);
  if (!needle) {
    return null;
  }
  for (const label of knownTags || []) {
    if (tagKey(label) === needle) {
      return String(label).trim().toUpperCase();
    }
  }
  return null;
}

function filterTagSuggestions(partial, knownTags, options = {}) {
  const { exclude = [], limit } = options;
  const needle = String(partial || "").trim().toLowerCase();
  const excluded = new Set((exclude || []).map((label) => tagKey(label)));

  const matches = (knownTags || [])
    .filter((label) => !excluded.has(tagKey(label)))
    .filter((label) => !needle || tagKey(label).includes(needle));

  return typeof limit === "number" ? matches.slice(0, limit) : matches;
}

function matchesTagSearch(book, term) {
  if (!term) {
    return true;
  }
  const tags = Array.isArray(book.tags) ? book.tags : [];
  return tags.some((tag) => String(tag).toLowerCase().includes(term));
}

function matchesCompoundSearch(book, { tagTerms = [], textTerms = [] }) {
  for (const term of tagTerms) {
    if (!matchesTagSearch(book, term)) {
      return false;
    }
  }
  const haystack = book._searchHaystack || "";
  for (const term of textTerms) {
    if (!haystack.includes(term)) {
      return false;
    }
  }
  return true;
}

function filterBooksMatchingTagTerms(books, tagTerms) {
  const terms = (tagTerms || [])
    .map((term) => String(term || "").trim().toLowerCase())
    .filter(Boolean);
  if (!terms.length) {
    return books || [];
  }
  return (books || []).filter((book) =>
    matchesCompoundSearch(book, { tagTerms: terms, textTerms: [] }),
  );
}

function matchesSearch(book, query) {
  return matchesCompoundSearch(book, parseCompoundSearchQuery(query));
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

function passesHiddenVisibility(book, { hiddenOnly, showHidden }) {
  return hiddenOnly ? book.hidden : showHidden || !book.hidden;
}

function passesBookVisibility(book, { hiddenOnly, showHidden, showMagazines }) {
  if (!passesHiddenVisibility(book, { hiddenOnly, showHidden })) {
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

function passesWantFilter(book, wantOnly, wantIds) {
  return !wantOnly || wantIds.has(book.id);
}

function filterVisibleBooks(books, options) {
  const {
    hiddenOnly,
    showHidden,
    showMagazines,
    mycroftFilterMode,
    collectionFilterMode,
    wantOnly,
    collectedIds,
    orderedIds,
    wantIds,
    searchQuery = "",
    searchFilter,
  } = options;

  const resolvedSearchFilter =
    searchFilter || parseCompoundSearchQuery(searchQuery);

  return books.filter(
    (book) =>
      passesBookVisibility(book, { hiddenOnly, showHidden, showMagazines }) &&
      passesMycroftImprintFilter(book, mycroftFilterMode) &&
      passesCollectionFilter(
        book,
        collectionFilterMode,
        collectedIds,
        orderedIds,
      ) &&
      passesWantFilter(book, wantOnly, wantIds) &&
      matchesCompoundSearch(book, resolvedSearchFilter),
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

module.exports = {
  prepareBookSearchIndex,
  parseSearchQuery,
  parseCompoundSearchQuery,
  serializeCompoundSearchQuery,
  buildSearchFilter,
  isTagDraftPending,
  parseTagDraftInput,
  absorbTagDraftInput,
  resolveTagFilterLabel,
  filterTagSuggestions,
  formatTagSearchQuery,
  matchesTagSearch,
  matchesCompoundSearch,
  filterBooksMatchingTagTerms,
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
  pickRandomBook,
};
