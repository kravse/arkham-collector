const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  collectTagsFromBooks,
} = require("../scripts/lib/tag-normalize");

const {
  prepareBookSearchIndex,
  parseSearchQuery,
  parseCompoundSearchQuery,
  buildSearchFilter,
  isTagDraftPending,
  parseTagDraftInput,
  absorbTagDraftInput,
  resolveTagFilterLabel,
  filterTagSuggestions,
  formatTagSearchQuery,
  matchesSearch,
  matchesCompoundSearch,
  filterBooksMatchingTagTerms,
  matchesTagSearch,
  isMagazineIssue,
  passesHiddenVisibility,
  passesBookVisibility,
  passesMycroftImprintFilter,
  passesCollectionFilter,
  passesWantFilter,
  filterVisibleBooks,
  cycleMycroftFilter,
  cycleCollectionFilter,
  hasAnyOrderedBooks,
  hasAnyWants,
  isOrdered,
  pickRandomBook,
} = require("../scripts/lib/viewer-filters");

function book(id, overrides = {}) {
  const entry = {
    id,
    title: `Book ${id}`,
    hidden: false,
    ...overrides,
  };
  prepareBookSearchIndex(entry);
  return entry;
}

function defaultVisibility(overrides = {}) {
  return {
    hiddenOnly: false,
    showHidden: false,
    showMagazines: false,
    ...overrides,
  };
}

test("matchesSearch finds haystack matches case-insensitively", () => {
  const entry = book(1, { title: "The Outsider", author: "Lovecraft" });

  assert.equal(matchesSearch(entry, ""), true);
  assert.equal(matchesSearch(entry, "outsider"), true);
  assert.equal(matchesSearch(entry, "LOVE"), true);
  assert.equal(matchesSearch(entry, "derleth"), false);
});

test("matchesSearch ignores tags unless query uses tag: prefix", () => {
  const entry = book(2, {
    title: "At the Mountains of Madness",
    tags: ["CTHULHU MYTHOS"],
  });

  assert.equal(matchesSearch(entry, "cthulhu"), false);
  assert.equal(matchesSearch(entry, "madness"), true);
  assert.equal(matchesSearch(entry, "tag:cthulhu"), true);
  assert.equal(matchesSearch(entry, 'tag:"Cthulhu Mythos"'), true);
  assert.equal(matchesSearch(entry, "tag:signed"), false);
});

test("parseCompoundSearchQuery splits multiple tags and text terms", () => {
  assert.deepEqual(
    parseCompoundSearchQuery('tag:"cthulhu mythos" tag:fantasy 1950s'),
    {
      tagTerms: ["cthulhu mythos", "fantasy"],
      textTerms: ["1950s"],
    },
  );
  assert.deepEqual(parseCompoundSearchQuery("derleth 1950s"), {
    tagTerms: [],
    textTerms: ["derleth", "1950s"],
  });
});

test("matchesCompoundSearch requires all tag and text terms", () => {
  const entry = book(4, {
    title: "Something from 1950",
    publicationDate: "1950",
    tags: ["FANTASY", "CTHULHU MYTHOS"],
  });

  assert.equal(
    matchesCompoundSearch(entry, {
      tagTerms: ["fantasy", "cthulhu mythos"],
      textTerms: ["1950"],
    }),
    true,
  );
  assert.equal(
    matchesCompoundSearch(entry, {
      tagTerms: ["fantasy", "horror"],
      textTerms: ["1950"],
    }),
    false,
  );
  assert.equal(
    matchesCompoundSearch(entry, {
      tagTerms: ["fantasy"],
      textTerms: ["1950", "missing"],
    }),
    false,
  );
});

test("filterBooksMatchingTagTerms keeps books with every tag term", () => {
  const books = [
    { id: 1, tags: ["ESSAYS", "HORROR"] },
    { id: 2, tags: ["ESSAYS"] },
    { id: 3, tags: ["HORROR"] },
  ];

  assert.deepEqual(
    filterBooksMatchingTagTerms(books, ["essays"]).map((book) => book.id),
    [1, 2],
  );
  assert.deepEqual(
    filterBooksMatchingTagTerms(books, ["essays", "horror"]).map(
      (book) => book.id,
    ),
    [1],
  );
  assert.deepEqual(filterBooksMatchingTagTerms(books, []), books);
});

test("tag suggestions can be scoped to books matching selected tag chips", () => {
  const books = filterBooksMatchingTagTerms(
    [
      { tags: ["ESSAYS", "HORROR"] },
      { tags: ["ESSAYS", "FANTASY"] },
      { tags: ["HORROR"] },
    ],
    ["essays"],
  );
  const known = collectTagsFromBooks(books);
  assert.deepEqual(known, ["ESSAYS", "FANTASY", "HORROR"]);
  assert.deepEqual(
    filterTagSuggestions("", known, { exclude: ["ESSAYS"] }),
    ["FANTASY", "HORROR"],
  );
});

test("buildSearchFilter merges chip tags with draft query", () => {
  assert.deepEqual(
    buildSearchFilter(["FANTASY"], 'tag:"cthulhu mythos" 1950s'),
    {
      tagTerms: ["fantasy", "cthulhu mythos"],
      textTerms: ["1950s"],
    },
  );
});

test("isTagDraftPending suppresses search while typing tag or tag:", () => {
  assert.equal(isTagDraftPending("t"), true);
  assert.equal(isTagDraftPending("T"), true);
  assert.equal(isTagDraftPending("ta"), true);
  assert.equal(isTagDraftPending("tag"), true);
  assert.equal(isTagDraftPending("tag:"), true);
  assert.equal(isTagDraftPending('tag:"cth'), true);
  assert.equal(isTagDraftPending("tag:horror"), true);
  assert.equal(isTagDraftPending("tag horror"), true);
  assert.equal(isTagDraftPending("80s tag"), true);
  assert.equal(isTagDraftPending("80s tag:hor"), true);
  assert.equal(isTagDraftPending("th"), false);
  assert.equal(isTagDraftPending("tal"), false);
  assert.equal(isTagDraftPending("tags"), false);
  assert.equal(isTagDraftPending("80s tags"), false);
  assert.equal(isTagDraftPending("derleth"), false);
  assert.equal(isTagDraftPending(""), false);
});

test("buildSearchFilter ignores pending tag draft but keeps chips", () => {
  assert.deepEqual(buildSearchFilter([], "ta"), {
    tagTerms: [],
    textTerms: [],
  });
  assert.deepEqual(buildSearchFilter(["FANTASY"], "tag:"), {
    tagTerms: ["fantasy"],
    textTerms: [],
  });
  assert.deepEqual(buildSearchFilter([], "th"), {
    tagTerms: [],
    textTerms: ["th"],
  });
  assert.deepEqual(buildSearchFilter([], "80s tag:hor"), {
    tagTerms: [],
    textTerms: ["80s"],
  });
});

test("resolveTagFilterLabel and filterTagSuggestions use known tags only", () => {
  const known = ["HORROR", "CTHULHU MYTHOS", "FANTASY"];
  assert.equal(resolveTagFilterLabel("fantasy", known), "FANTASY");
  assert.equal(resolveTagFilterLabel("signed", known), null);
  assert.deepEqual(filterTagSuggestions("cth", known), [
    "CTHULHU MYTHOS",
  ]);
  assert.deepEqual(
    filterTagSuggestions("cth", known, { exclude: ["CTHULHU MYTHOS"] }),
    [],
  );
  assert.deepEqual(filterTagSuggestions("", known), known);
  assert.deepEqual(filterTagSuggestions("", known, { limit: 2 }), [
    "HORROR",
    "CTHULHU MYTHOS",
  ]);
});

test("parseTagDraftInput detects tag autocomplete prefix", () => {
  assert.deepEqual(parseTagDraftInput("tag"), {
    partial: "",
    quoted: false,
    prefix: "",
  });
  assert.deepEqual(parseTagDraftInput("TAG"), {
    partial: "",
    quoted: false,
    prefix: "",
  });
  assert.deepEqual(parseTagDraftInput("tag horror"), {
    partial: "horror",
    quoted: false,
    prefix: "",
  });
  assert.deepEqual(parseTagDraftInput('tag:"cthul'), {
    partial: "cthul",
    quoted: true,
    prefix: "",
  });
  assert.deepEqual(parseTagDraftInput("tag:fant"), {
    partial: "fant",
    quoted: false,
    prefix: "",
  });
  assert.deepEqual(parseTagDraftInput("80s tag"), {
    partial: "",
    quoted: false,
    prefix: "80s",
  });
  assert.deepEqual(parseTagDraftInput("80s tag:hor"), {
    partial: "hor",
    quoted: false,
    prefix: "80s",
  });
  assert.deepEqual(parseTagDraftInput('derleth tag:"cthul'), {
    partial: "cthul",
    quoted: true,
    prefix: "derleth",
  });
  assert.equal(parseTagDraftInput("tags"), null);
  assert.equal(parseTagDraftInput("1950s"), null);
  assert.equal(parseTagDraftInput("80s tags"), null);
});

test("absorbTagDraftInput promotes known tags and clears bare tag draft", () => {
  const known = ["HORROR", "ESSAYS"];
  assert.deepEqual(absorbTagDraftInput("tag", known), {
    chipLabel: null,
    remainder: "",
  });
  assert.deepEqual(absorbTagDraftInput("tag essays", known), {
    chipLabel: "ESSAYS",
    remainder: "",
  });
  assert.deepEqual(absorbTagDraftInput("tag:essays", known), {
    chipLabel: "ESSAYS",
    remainder: "",
  });
  assert.deepEqual(absorbTagDraftInput("tag signed", known), {
    chipLabel: null,
    remainder: "tag:signed",
  });
  assert.deepEqual(absorbTagDraftInput("80s tag essays", known), {
    chipLabel: "ESSAYS",
    remainder: "80s",
  });
  assert.deepEqual(absorbTagDraftInput("80s tag signed", known), {
    chipLabel: null,
    remainder: "80s tag:signed",
  });
  assert.equal(absorbTagDraftInput("derleth", known), null);
});

test("parseSearchQuery and formatTagSearchQuery handle tag helper syntax", () => {
  assert.deepEqual(parseSearchQuery('tag:"Cthulhu Mythos"'), {
    mode: "tag",
    term: "cthulhu mythos",
  });
  assert.deepEqual(parseSearchQuery("tag:Cthulhu"), {
    mode: "tag",
    term: "cthulhu",
  });
  assert.deepEqual(parseSearchQuery("lovecraft"), {
    mode: "text",
    term: "lovecraft",
  });
  assert.equal(formatTagSearchQuery("HORROR"), "tag:HORROR");
  assert.equal(formatTagSearchQuery("CTHULHU MYTHOS"), 'tag:"CTHULHU MYTHOS"');
});

test("matchesTagSearch matches tag substrings only", () => {
  const entry = book(3, {
    title: "The Call of Cthulhu",
    tags: ["CTHULHU MYTHOS", "HORROR"],
  });

  assert.equal(matchesTagSearch(entry, "cthulhu"), true);
  assert.equal(matchesTagSearch(entry, "mythos"), true);
  assert.equal(matchesTagSearch(entry, "call"), false);
});

test("passesHiddenVisibility respects hidden-only and show-hidden modes", () => {
  const visible = book(1);
  const hidden = book(2, { hidden: true });

  assert.equal(
    passesHiddenVisibility(visible, { hiddenOnly: false, showHidden: false }),
    true,
  );
  assert.equal(
    passesHiddenVisibility(hidden, { hiddenOnly: false, showHidden: false }),
    false,
  );
  assert.equal(
    passesHiddenVisibility(hidden, { hiddenOnly: false, showHidden: true }),
    true,
  );
  assert.equal(
    passesHiddenVisibility(visible, { hiddenOnly: true, showHidden: false }),
    false,
  );
  assert.equal(
    passesHiddenVisibility(hidden, { hiddenOnly: true, showHidden: false }),
    true,
  );
});

test("passesBookVisibility hides magazine issues unless showMagazines is on", () => {
  const sampler = book(1, {
    listTitle: "The Arkham Sampler",
    title: "The Arkham Sampler (Vol. I, No. 1)",
  });
  const novel = book(2);

  assert.equal(
    passesBookVisibility(sampler, defaultVisibility()),
    false,
  );
  assert.equal(
    passesBookVisibility(sampler, defaultVisibility({ showMagazines: true })),
    true,
  );
  assert.equal(passesBookVisibility(novel, defaultVisibility()), true);
  assert.equal(isMagazineIssue(sampler), true);
  assert.equal(isMagazineIssue(novel), false);
});

test("passesMycroftImprintFilter supports only, hidden, and off", () => {
  const arkham = book(1, { imprint: "arkham_house" });
  const mycroft = book(2, { imprint: "mycroft_moran" });

  assert.equal(passesMycroftImprintFilter(arkham, null), true);
  assert.equal(passesMycroftImprintFilter(mycroft, null), true);
  assert.equal(passesMycroftImprintFilter(mycroft, "only"), true);
  assert.equal(passesMycroftImprintFilter(arkham, "only"), false);
  assert.equal(passesMycroftImprintFilter(arkham, "hidden"), true);
  assert.equal(passesMycroftImprintFilter(mycroft, "hidden"), false);
});

test("passesCollectionFilter filters collected and ordered states", () => {
  const collectedIds = new Set([1]);
  const orderedIds = new Set([2, 3]);
  const collected = book(1);
  const ordered = book(2);
  const plain = book(4);

  assert.equal(
    passesCollectionFilter(collected, null, collectedIds, orderedIds),
    true,
  );
  assert.equal(
    passesCollectionFilter(collected, "collection", collectedIds, orderedIds),
    true,
  );
  assert.equal(
    passesCollectionFilter(ordered, "collection", collectedIds, orderedIds),
    true,
  );
  assert.equal(
    passesCollectionFilter(collected, "ordered", collectedIds, orderedIds),
    false,
  );
  assert.equal(
    passesCollectionFilter(ordered, "ordered", collectedIds, orderedIds),
    true,
  );
  assert.equal(
    passesCollectionFilter(plain, "collection", collectedIds, orderedIds),
    false,
  );
});

test("ordered excludes collected when both sets contain the same id", () => {
  const collectedIds = new Set([1]);
  const orderedIds = new Set([1]);

  assert.equal(isOrdered(book(1), collectedIds, orderedIds), false);
});

test("passesWantFilter only restricts when want filter mode is active", () => {
  const wantIds = new Set([5]);
  const wanted = book(5);
  const other = book(6);

  assert.equal(passesWantFilter(wanted, null, wantIds), true);
  assert.equal(passesWantFilter(other, null, wantIds), true);
  assert.equal(passesWantFilter(wanted, "want", wantIds), true);
  assert.equal(passesWantFilter(other, "want", wantIds), false);
});

test("filterVisibleBooks combines search, want, collection, and imprint filters", () => {
  const books = [
    book(1, { title: "Solar Pons", imprint: "mycroft_moran" }),
    book(2, { title: "The Outsider", imprint: "arkham_house" }),
    book(3, { title: "Dream Cycle", imprint: "arkham_house" }),
  ];
  const collectedIds = new Set([2]);
  const orderedIds = new Set([3]);
  const wantIds = new Set([1]);

  const visible = filterVisibleBooks(books, {
    ...defaultVisibility(),
    mycroftFilterMode: null,
    collectionFilterMode: "collection",
    wantFilterMode: null,
    collectedIds,
    orderedIds,
    wantIds,
    searchQuery: "",
  });

  assert.deepEqual(
    visible.map((entry) => entry.id),
    [2, 3],
  );

  const wantedOnly = filterVisibleBooks(books, {
    ...defaultVisibility(),
    mycroftFilterMode: null,
    collectionFilterMode: null,
    wantFilterMode: "want",
    collectedIds,
    orderedIds,
    wantIds,
    searchQuery: "",
  });

  assert.deepEqual(
    wantedOnly.map((entry) => entry.id),
    [1],
  );

  const searched = filterVisibleBooks(books, {
    ...defaultVisibility(),
    mycroftFilterMode: "only",
    collectionFilterMode: null,
    wantFilterMode: null,
    collectedIds,
    orderedIds,
    wantIds,
    searchQuery: "outsider",
  });

  assert.deepEqual(
    searched.map((entry) => entry.id),
    [],
  );
});

test("cycleMycroftFilter rotates only -> hidden -> off", () => {
  assert.equal(cycleMycroftFilter(null), "only");
  assert.equal(cycleMycroftFilter("only"), "hidden");
  assert.equal(cycleMycroftFilter("hidden"), null);
});

test("cycleCollectionFilter uses three steps when ordered books exist", () => {
  assert.equal(cycleCollectionFilter(null, true), "collection");
  assert.equal(cycleCollectionFilter("collection", true), "ordered");
  assert.equal(cycleCollectionFilter("ordered", true), null);
});

test("cycleCollectionFilter toggles when no ordered books exist", () => {
  assert.equal(cycleCollectionFilter(null, false), "collection");
  assert.equal(cycleCollectionFilter("collection", false), null);
  assert.equal(cycleCollectionFilter(null, false), "collection");
});

test("hasAnyOrderedBooks ignores hidden books unless show-hidden is on", () => {
  const books = [
    book(1),
    book(2, { hidden: true }),
  ];
  const collectedIds = new Set();
  const orderedIds = new Set([1, 2]);

  assert.equal(
    hasAnyOrderedBooks(books, collectedIds, orderedIds, defaultVisibility()),
    true,
  );
  assert.equal(
    hasAnyOrderedBooks(
      books,
      collectedIds,
      orderedIds,
      defaultVisibility({ showHidden: true }),
    ),
    true,
  );
  assert.equal(
    hasAnyOrderedBooks(
      [book(2, { hidden: true })],
      collectedIds,
      orderedIds,
      defaultVisibility(),
    ),
    false,
  );
});

test("pickRandomBook returns null for empty input", () => {
  assert.equal(pickRandomBook([]), null);
  assert.equal(pickRandomBook(null), null);
});

test("pickRandomBook returns one of the provided books", () => {
  const pool = [book(1), book(2), book(3)];
  const picked = pickRandomBook(pool);
  assert.ok(pool.some((entry) => entry.id === picked.id));
});
