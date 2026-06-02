const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  prepareBookSearchIndex,
  matchesSearch,
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
  isOrdered,
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

test("passesWantFilter only restricts when wantOnly is active", () => {
  const wantIds = new Set([5]);
  const wanted = book(5);
  const other = book(6);

  assert.equal(passesWantFilter(wanted, false, wantIds), true);
  assert.equal(passesWantFilter(other, false, wantIds), true);
  assert.equal(passesWantFilter(wanted, true, wantIds), true);
  assert.equal(passesWantFilter(other, true, wantIds), false);
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
    wantOnly: false,
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
    wantOnly: true,
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
    wantOnly: false,
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
