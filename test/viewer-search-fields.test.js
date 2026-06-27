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
} = require("../scripts/lib/viewer-search-fields");
const { prepareBookSearchIndex } = require("../scripts/lib/viewer-filters");

function book(overrides = {}) {
  const entry = { id: 1, title: "Sample", ...overrides };
  prepareBookSearchIndex(entry);
  return entry;
}

test("parseCompoundSearchQuery splits tags, author, cover, and text", () => {
  assert.deepEqual(
    parseCompoundSearchQuery(
      'tag:fantasy author:"H. P. Lovecraft" cover:Jones 1950s',
    ),
    {
      fieldTerms: {
        tag: ["fantasy"],
        author: ["h. p. lovecraft"],
        cover: ["jones"],
      },
      textTerms: ["1950s"],
    },
  );
});

test("parseFieldDraftInput supports tag, author, and cover prefixes", () => {
  const tagField = getFieldByKey("tag");
  const authorField = getFieldByKey("author");
  const coverField = getFieldByKey("cover");

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
});

test("isSearchDraftBlockingText only blocks partial tag literals", () => {
  assert.equal(isSearchDraftBlockingText("ta"), true);
  assert.equal(isSearchDraftBlockingText("80s tag"), false);
  assert.equal(isSearchDraftBlockingText("author"), false);
  assert.equal(isSearchDraftBlockingText("80s author"), false);
  assert.equal(isSearchDraftBlockingText("cover"), false);
});

test("buildSearchFilter keeps prefix text for author draft but not tag literal pending", () => {
  assert.deepEqual(buildSearchFilter([], "ta"), {
    fieldTerms: { tag: [], author: [], cover: [] },
    textTerms: [],
  });
  assert.deepEqual(buildSearchFilter([], "80s author"), {
    fieldTerms: { tag: [], author: [], cover: [] },
    textTerms: ["80s"],
  });
  assert.deepEqual(
    buildSearchFilter([{ type: "tag", label: "FANTASY" }], 'tag:"cthulhu mythos" 1950s'),
    {
      fieldTerms: {
        tag: ["fantasy", "cthulhu mythos"],
        author: [],
        cover: [],
      },
      textTerms: ["1950s"],
    },
  );
});

test("author and cover field filters match only their book fields", () => {
  const entry = book({
    author: "H. P. Lovecraft",
    coverArtist: "Frank Utpatel",
    tags: ["HORROR"],
  });

  assert.equal(
    matchesCompoundSearch(entry, {
      fieldTerms: { tag: [], author: ["lovecraft"], cover: [] },
      textTerms: [],
    }),
    true,
  );
  assert.equal(
    matchesCompoundSearch(entry, {
      fieldTerms: { tag: [], author: [], cover: ["utpatel"] },
      textTerms: [],
    }),
    true,
  );
  assert.equal(
    matchesCompoundSearch(entry, {
      fieldTerms: { tag: [], author: ["utpatel"], cover: [] },
      textTerms: [],
    }),
    false,
  );
  assert.equal(
    matchesCompoundSearch(entry, {
      fieldTerms: { tag: [], author: [], cover: [] },
      textTerms: ["lovecraft"],
    }),
    true,
  );
  assert.equal(
    matchesCompoundSearch(entry, {
      fieldTerms: { tag: [], author: [], cover: [] },
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
      fieldTerms: { tag: [], author: ["derleth"], cover: [] },
      textTerms: [],
    }),
    true,
  );
  assert.equal(
    matchesCompoundSearch(derleth, {
      fieldTerms: { tag: [], author: ["lovecraft"], cover: [] },
      textTerms: [],
    }),
    false,
  );

  const cover = book({
    coverArtist: "James Dietrich, design by Gary Gore",
  });
  assert.equal(
    matchesCompoundSearch(cover, {
      fieldTerms: { tag: [], author: [], cover: ["dietrich"] },
      textTerms: [],
    }),
    true,
  );
  assert.equal(
    matchesCompoundSearch(cover, {
      fieldTerms: { tag: [], author: [], cover: ["gore"] },
      textTerms: [],
    }),
    false,
  );
});

test("absorbFieldDraftInput resolves known author and cover labels", () => {
  const authorField = getFieldByKey("author");
  const coverField = getFieldByKey("cover");
  const authors = ["H. P. Lovecraft", "August Derleth"];
  const covers = ["Frank Utpatel"];

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
});

test("getActiveDraftField returns the active trailing field draft", () => {
  assert.equal(getActiveDraftField("80s author").key, "author");
  assert.equal(getActiveDraftField("tag horror").key, "tag");
  assert.equal(getActiveDraftField("derleth"), null);
});

test("filterFieldSuggestions excludes selected chips and filters partials", () => {
  const authorField = getFieldByKey("author");
  const known = ["August Derleth", "H. P. Lovecraft"];
  assert.deepEqual(
    filterFieldSuggestions("love", authorField, known, {
      exclude: ["H. P. Lovecraft"],
    }),
    [],
  );
  assert.deepEqual(filterFieldSuggestions("love", authorField, known), [
    "H. P. Lovecraft",
  ]);
});

test("resolveKnownFieldLabel preserves author casing and uppercases tags", () => {
  const tagField = getFieldByKey("tag");
  const authorField = getFieldByKey("author");
  assert.equal(
    resolveKnownFieldLabel("fantasy", tagField, ["FANTASY", "HORROR"]),
    "FANTASY",
  );
  assert.equal(
    resolveKnownFieldLabel("lovecraft", authorField, ["H. P. Lovecraft"]),
    "H. P. Lovecraft",
  );
});

test("SEARCH_FIELD_TYPES includes tag, author, and cover", () => {
  assert.deepEqual(
    SEARCH_FIELD_TYPES.map((field) => field.key),
    ["tag", "author", "cover"],
  );
});
