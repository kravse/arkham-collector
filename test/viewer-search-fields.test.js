const { test } = require("node:test");
const assert = require("node:assert/strict");

require("./viewer-lib-bootstrap");

const {
  SEARCH_FIELD_TYPES,
  parseFieldDraftInput,
  parseCompoundSearchQuery,
  buildSearchFilter,
  absorbFieldDraftInput,
  filterFieldSuggestions,
  matchesCompoundSearch,
  isSearchDraftBlockingText,
  getActiveDraftField,
  getFieldByKey,
  resolveKnownFieldLabel,
  getDecadeSuggestDraft,
  prepareCompoundSearchMatcher,
} = require("../scripts/lib/viewer-search-fields");
const { prepareBookSearchIndex } = require("../scripts/lib/viewer-filters");

function book(overrides = {}) {
  const entry = { id: 1, title: "Sample", ...overrides };
  prepareBookSearchIndex(entry);
  return entry;
}

test("parseCompoundSearchQuery splits tags, author, cover, decade, and text", () => {
  assert.deepEqual(
    parseCompoundSearchQuery(
      'tag:fantasy author:"H. P. Lovecraft" cover:Jones decade:1950s horror',
    ),
    {
      fieldTerms: {
        tag: ["fantasy"],
        author: ["h. p. lovecraft"],
        cover: ["jones"],
        decade: ["1950s"],
      },
      textTerms: ["horror"],
    },
  );
});

test("parseFieldDraftInput supports tag, author, cover, and decade prefixes", () => {
  const tagField = getFieldByKey("tag");
  const authorField = getFieldByKey("author");
  const coverField = getFieldByKey("cover");
  const decadeField = getFieldByKey("decade");

  assert.deepEqual(parseFieldDraftInput("author", authorField), {
    fieldKey: "author",
    partial: "",
    quoted: false,
    prefix: "",
  });
  assert.deepEqual(parseFieldDraftInput("80s author love", authorField), {
    fieldKey: "author",
    partial: "love",
    quoted: false,
    prefix: "80s",
  });
  assert.deepEqual(parseFieldDraftInput("cover:jon", coverField), {
    fieldKey: "cover",
    partial: "jon",
    quoted: false,
    prefix: "",
  });
  assert.equal(parseFieldDraftInput("authors", authorField), null);
  assert.equal(parseFieldDraftInput("covers", coverField), null);
  assert.deepEqual(parseFieldDraftInput("tag horror", tagField), {
    fieldKey: "tag",
    partial: "horror",
    quoted: false,
    prefix: "",
  });
  assert.deepEqual(parseFieldDraftInput("19", decadeField), {
    fieldKey: "decade",
    partial: "19",
    quoted: false,
    prefix: "",
  });
  assert.equal(parseFieldDraftInput("1945", decadeField), null);
  assert.equal(parseFieldDraftInput("1950s", decadeField), null);
  assert.deepEqual(parseFieldDraftInput("horror 1950s", decadeField), null);
  assert.deepEqual(parseFieldDraftInput("horror 19", decadeField), {
    fieldKey: "decade",
    partial: "19",
    quoted: false,
    prefix: "horror",
  });
  assert.deepEqual(parseFieldDraftInput("decade:195", decadeField), {
    fieldKey: "decade",
    partial: "195",
    quoted: false,
    prefix: "",
  });
});

test("isSearchDraftBlockingText only blocks partial tag literals", () => {
  assert.equal(isSearchDraftBlockingText("ta"), true);
  assert.equal(isSearchDraftBlockingText("80s tag"), false);
  assert.equal(isSearchDraftBlockingText("author"), false);
  assert.equal(isSearchDraftBlockingText("80s author"), false);
  assert.equal(isSearchDraftBlockingText("cover"), false);
  assert.equal(isSearchDraftBlockingText("19"), false);
});

test("buildSearchFilter keeps prefix text for author draft but not tag literal pending", () => {
  assert.deepEqual(buildSearchFilter([], "ta"), {
    fieldTerms: { tag: [], author: [], cover: [], decade: [] },
    textTerms: [],
  });
  assert.deepEqual(buildSearchFilter([], "80s author"), {
    fieldTerms: { tag: [], author: [], cover: [], decade: [] },
    textTerms: ["80s"],
  });
  assert.deepEqual(buildSearchFilter([], "19"), {
    fieldTerms: { tag: [], author: [], cover: [], decade: [] },
    textTerms: [],
  });
  assert.deepEqual(buildSearchFilter([], "1945"), {
    fieldTerms: { tag: [], author: [], cover: [], decade: [] },
    textTerms: ["1945"],
  });
  assert.deepEqual(buildSearchFilter([], "1950s"), {
    fieldTerms: { tag: [], author: [], cover: [], decade: [] },
    textTerms: ["1950s"],
  });
  assert.deepEqual(
    buildSearchFilter([{ type: "tag", label: "FANTASY" }], 'tag:"cthulhu mythos" horror'),
    {
      fieldTerms: {
        tag: ["fantasy", "cthulhu mythos"],
        author: [],
        cover: [],
        decade: [],
      },
      textTerms: ["horror"],
    },
  );
});

test("author, cover, and decade field filters match only their book fields", () => {
  const entry = book({
    author: "H. P. Lovecraft",
    coverArtist: "Frank Utpatel",
    tags: ["HORROR"],
    decade: "1950s",
  });

  assert.equal(
    matchesCompoundSearch(entry, {
      fieldTerms: { tag: [], author: ["lovecraft"], cover: [], decade: [] },
      textTerms: [],
    }),
    true,
  );
  assert.equal(
    matchesCompoundSearch(entry, {
      fieldTerms: { tag: [], author: [], cover: ["utpatel"], decade: [] },
      textTerms: [],
    }),
    true,
  );
  assert.equal(
    matchesCompoundSearch(entry, {
      fieldTerms: { tag: [], author: [], cover: [], decade: ["1950s"] },
      textTerms: [],
    }),
    true,
  );
  assert.equal(
    matchesCompoundSearch(entry, {
      fieldTerms: { tag: [], author: [], cover: [], decade: ["1940s"] },
      textTerms: [],
    }),
    false,
  );
  assert.equal(
    matchesCompoundSearch(entry, {
      fieldTerms: { tag: [], author: ["utpatel"], cover: [], decade: [] },
      textTerms: [],
    }),
    false,
  );
  assert.equal(
    matchesCompoundSearch(entry, {
      fieldTerms: { tag: [], author: [], cover: [], decade: [] },
      textTerms: ["lovecraft"],
    }),
    true,
  );
  assert.equal(
    matchesCompoundSearch(entry, {
      fieldTerms: { tag: [], author: [], cover: [], decade: [] },
      textTerms: ["horror"],
    }),
    false,
  );
});

test("author and cover filters match parsed person names", () => {
  const derleth = book({
    author: "August Derleth (inspired by fragments by H.P. Lovecraft)",
  });
  assert.equal(
    matchesCompoundSearch(derleth, {
      fieldTerms: { tag: [], author: ["derleth"], cover: [], decade: [] },
      textTerms: [],
    }),
    true,
  );
  assert.equal(
    matchesCompoundSearch(derleth, {
      fieldTerms: { tag: [], author: ["lovecraft"], cover: [], decade: [] },
      textTerms: [],
    }),
    false,
  );

  const cover = book({
    coverArtist: "James Dietrich, design by Gary Gore",
  });
  assert.equal(
    matchesCompoundSearch(cover, {
      fieldTerms: { tag: [], author: [], cover: ["dietrich"], decade: [] },
      textTerms: [],
    }),
    true,
  );
  assert.equal(
    matchesCompoundSearch(cover, {
      fieldTerms: { tag: [], author: [], cover: ["gore"], decade: [] },
      textTerms: [],
    }),
    false,
  );
});

test("absorbFieldDraftInput resolves known author, cover, and decade labels", () => {
  const authorField = getFieldByKey("author");
  const coverField = getFieldByKey("cover");
  const decadeField = getFieldByKey("decade");
  const authors = ["H. P. Lovecraft", "August Derleth"];
  const covers = ["Frank Utpatel"];
  const decades = ["1940s", "1950s", "1930s"];

  assert.deepEqual(absorbFieldDraftInput("author lovecraft", authorField, authors), {
    fieldKey: "author",
    chipLabel: "H. P. Lovecraft",
    remainder: "",
  });
  assert.deepEqual(absorbFieldDraftInput("cover unknown", coverField, covers), {
    fieldKey: "cover",
    chipLabel: null,
    remainder: "cover:unknown",
  });
  assert.equal(absorbFieldDraftInput("1950s", decadeField, decades), null);
  assert.equal(absorbFieldDraftInput("horror 195", decadeField, decades), null);
});

test("getActiveDraftField returns the active trailing field draft", () => {
  assert.equal(getActiveDraftField("80s author").key, "author");
  assert.equal(getActiveDraftField("tag horror").key, "tag");
  assert.equal(getActiveDraftField("19").key, "decade");
  assert.equal(getActiveDraftField("derleth"), null);
});

test("filterFieldSuggestions excludes selected chips and filters partials", () => {
  const authorField = getFieldByKey("author");
  const decadeField = getFieldByKey("decade");
  const known = ["August Derleth", "H. P. Lovecraft"];
  const decades = ["1930s", "1940s", "1950s", "1960s", "1970s", "1980s", "1990s"];
  assert.deepEqual(
    filterFieldSuggestions("love", authorField, known, {
      exclude: ["H. P. Lovecraft"],
    }),
    [],
  );
  assert.deepEqual(filterFieldSuggestions("love", authorField, known), [
    "H. P. Lovecraft",
  ]);
  assert.deepEqual(filterFieldSuggestions("19", decadeField, decades), [
    "1930s",
    "1940s",
    "1950s",
    "1960s",
    "1970s",
    "1980s",
    "1990s",
  ]);
  assert.deepEqual(filterFieldSuggestions("20", decadeField, ["2000s", "2010s"]), [
    "2000s",
    "2010s",
  ]);
});

test("resolveKnownFieldLabel preserves author casing and uppercases tags", () => {
  const tagField = getFieldByKey("tag");
  const authorField = getFieldByKey("author");
  const decadeField = getFieldByKey("decade");
  assert.equal(
    resolveKnownFieldLabel("fantasy", tagField, ["FANTASY", "HORROR"]),
    "FANTASY",
  );
  assert.equal(
    resolveKnownFieldLabel("lovecraft", authorField, ["H. P. Lovecraft"]),
    "H. P. Lovecraft",
  );
  assert.equal(
    resolveKnownFieldLabel("195", decadeField, ["1940s", "1950s"]),
    "1950s",
  );
});

test("getDecadeSuggestDraft still offers decades for typed years", () => {
  assert.deepEqual(getDecadeSuggestDraft("1945"), {
    fieldKey: "decade",
    partial: "1945",
    quoted: false,
    prefix: "",
  });
  assert.equal(getActiveDraftField("1945"), null);
});

test("SEARCH_FIELD_TYPES includes tag, author, cover, and decade", () => {
  assert.deepEqual(
    SEARCH_FIELD_TYPES.map((field) => field.key),
    ["tag", "author", "cover", "decade"],
  );
});

function decadeYearFilter(overrides = {}) {
  return {
    fieldTerms: {
      tag: [],
      author: [],
      cover: [],
      decade: [],
      ...(overrides.fieldTerms || {}),
    },
    textTerms: overrides.textTerms || [],
  };
}

test("prepareCompoundSearchMatcher matches matchesCompoundSearch behavior", () => {
  const entry = book({
    author: "H. P. Lovecraft",
    tags: ["HORROR"],
    decade: "1950s",
  });
  const filter = {
    fieldTerms: { tag: ["horror"], author: [], cover: [], decade: ["1950s"] },
    textTerms: ["lovecraft"],
  };
  const match = prepareCompoundSearchMatcher(filter);
  assert.equal(match(entry), matchesCompoundSearch(entry, filter));
});

test("decade and year filters combine with OR within the date dimension", () => {
  const seventies = book({ decade: "1970s", publicationDate: "1972" });
  const seventiesOther = book({ id: 2, decade: "1970s", publicationDate: "1978" });
  const eighties = book({ id: 3, decade: "1980s", publicationDate: "1985" });
  const year1976 = book({ id: 4, decade: "1970s", publicationDate: "1976" });
  const year1986 = book({ id: 5, decade: "1980s", publicationDate: "1986" });
  const nineties = book({ id: 6, decade: "1990s", publicationDate: "1992" });

  assert.equal(
    matchesCompoundSearch(
      seventies,
      decadeYearFilter({ fieldTerms: { decade: ["1970s", "1980s"] } }),
    ),
    true,
  );
  assert.equal(
    matchesCompoundSearch(
      eighties,
      decadeYearFilter({ fieldTerms: { decade: ["1970s", "1980s"] } }),
    ),
    true,
  );
  assert.equal(
    matchesCompoundSearch(
      nineties,
      decadeYearFilter({ fieldTerms: { decade: ["1970s", "1980s"] } }),
    ),
    false,
  );

  assert.equal(
    matchesCompoundSearch(
      seventiesOther,
      decadeYearFilter({
        fieldTerms: { decade: ["1970s"] },
        textTerms: ["1976"],
      }),
    ),
    true,
  );
  assert.equal(
    matchesCompoundSearch(
      year1976,
      decadeYearFilter({
        fieldTerms: { decade: ["1970s"] },
        textTerms: ["1976"],
      }),
    ),
    true,
  );

  assert.equal(
    matchesCompoundSearch(
      eighties,
      decadeYearFilter({
        fieldTerms: { decade: ["1980s"] },
        textTerms: ["1976"],
      }),
    ),
    true,
  );
  assert.equal(
    matchesCompoundSearch(
      year1976,
      decadeYearFilter({
        fieldTerms: { decade: ["1980s"] },
        textTerms: ["1976"],
      }),
    ),
    true,
  );
  assert.equal(
    matchesCompoundSearch(
      seventies,
      decadeYearFilter({
        fieldTerms: { decade: ["1980s"] },
        textTerms: ["1976"],
      }),
    ),
    false,
  );

  assert.equal(
    matchesCompoundSearch(year1976, decadeYearFilter({ textTerms: ["1976"] })),
    true,
  );
  assert.equal(
    matchesCompoundSearch(
      seventiesOther,
      decadeYearFilter({ textTerms: ["1976"] }),
    ),
    false,
  );

  assert.equal(
    matchesCompoundSearch(
      year1976,
      decadeYearFilter({ textTerms: ["1976", "1986"] }),
    ),
    true,
  );
  assert.equal(
    matchesCompoundSearch(
      year1986,
      decadeYearFilter({ textTerms: ["1976", "1986"] }),
    ),
    true,
  );
  assert.equal(
    matchesCompoundSearch(
      seventies,
      decadeYearFilter({ textTerms: ["1976", "1986"] }),
    ),
    false,
  );
});

test("decade/year OR still ANDs with tag and other text filters", () => {
  const horror1970s = book({
    decade: "1970s",
    publicationDate: "1974",
    tags: ["HORROR"],
  });
  const fantasy1970s = book({
    id: 2,
    decade: "1970s",
    publicationDate: "1974",
    tags: ["FANTASY"],
  });

  assert.equal(
    matchesCompoundSearch(
      horror1970s,
      decadeYearFilter({
        fieldTerms: { tag: ["horror"], decade: ["1970s", "1980s"] },
      }),
    ),
    true,
  );
  assert.equal(
    matchesCompoundSearch(
      fantasy1970s,
      decadeYearFilter({
        fieldTerms: { tag: ["horror"], decade: ["1970s", "1980s"] },
      }),
    ),
    false,
  );
});

test("typed decade text combines with decade chips using OR", () => {
  const fifties = book({ decade: "1950s", publicationDate: "1955" });
  const seventies = book({ id: 2, decade: "1970s", publicationDate: "1974" });

  assert.equal(
    matchesCompoundSearch(
      fifties,
      decadeYearFilter({
        fieldTerms: { decade: ["1970s"] },
        textTerms: ["1950s"],
      }),
    ),
    true,
  );
  assert.equal(
    matchesCompoundSearch(
      seventies,
      decadeYearFilter({
        fieldTerms: { decade: ["1970s"] },
        textTerms: ["1950s"],
      }),
    ),
    true,
  );
});

test("searchFilterIsEmpty detects empty and non-empty filters", () => {
  const {
    emptySearchFilter,
    searchFilterIsEmpty,
    buildSearchFilter,
  } = require("../scripts/lib/viewer-search-fields");

  assert.equal(searchFilterIsEmpty(emptySearchFilter()), true);
  assert.equal(
    searchFilterIsEmpty(buildSearchFilter([{ type: "tag", label: "Horror" }], "")),
    false,
  );
});

test("filterBooksBySearch returns same array reference when filter is empty", () => {
  const {
    emptySearchFilter,
    filterBooksBySearch,
  } = require("../scripts/lib/viewer-search-fields");

  const books = [book({ title: "The Outsider" })];
  assert.equal(filterBooksBySearch(books, emptySearchFilter()), books);
});

test("filterBooksBySearch narrows books by text terms", () => {
  const {
    parseCompoundSearchQuery,
    filterBooksBySearch,
  } = require("../scripts/lib/viewer-search-fields");

  const books = [
    book({ id: 1, title: "The Outsider" }),
    book({ id: 2, title: "At the Mountains of Madness" }),
  ];
  const filtered = filterBooksBySearch(
    books,
    parseCompoundSearchQuery("outsider"),
  );
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 1);
});
