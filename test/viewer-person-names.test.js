const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizePersonKey,
  stripQualifyingParentheticals,
  parseAuthorNames,
  parseAuthorCollectiveSuffix,
  parseCoverArtistNames,
  resolveBookAuthors,
  resolveBookAuthorCollectiveSuffix,
  resolveBookCoverArtists,
  formatPersonList,
  formatAuthorDisplay,
} = require("../scripts/lib/viewer-person-names");

test("stripQualifyingParentheticals removes inspired-by and Ed. qualifiers", () => {
  assert.equal(
    stripQualifyingParentheticals(
      "August Derleth (inspired by fragments by H.P. Lovecraft)",
    ),
    "August Derleth",
  );
  assert.equal(
    stripQualifyingParentheticals("August Derleth (inspired by notes by H.P. Lovecraft)"),
    "August Derleth",
  );
  assert.equal(stripQualifyingParentheticals("Ramsey Campbell (Ed.)"), "Ramsey Campbell");
});

test("parseAuthorNames splits collaborators and handles edited-by prefix", () => {
  assert.deepEqual(parseAuthorNames("H. P. Lovecraft and Robert Weinberg"), [
    "H. P. Lovecraft",
    "Robert Weinberg",
  ]);
  assert.deepEqual(parseAuthorNames("Edited by Peter Cannon"), ["Peter Cannon"]);
  assert.deepEqual(
    parseAuthorNames("August Derleth (inspired by fragments by H.P. Lovecraft)"),
    ["August Derleth"],
  );
  assert.deepEqual(parseAuthorNames("George Vanderburgh and Robert Weinberg"), [
    "George Vanderburgh",
    "Robert Weinberg",
  ]);
});

test("parseAuthorNames treats collective credits as non-person authors", () => {
  assert.deepEqual(parseAuthorNames("H. P. Lovecraft & Divers Hands"), [
    "H. P. Lovecraft",
  ]);
  assert.deepEqual(parseAuthorNames("H. P. Lovecraft and Divers Hands"), [
    "H. P. Lovecraft",
  ]);
  assert.deepEqual(parseAuthorNames("H. P. Lovecraft and others"), [
    "H. P. Lovecraft",
  ]);
  assert.equal(parseAuthorCollectiveSuffix("H. P. Lovecraft & Divers Hands"), "and divers hands");
  assert.equal(parseAuthorCollectiveSuffix("H. P. Lovecraft and Others"), "and others");
  assert.equal(parseAuthorCollectiveSuffix("August Derleth"), null);
  assert.equal(
    formatAuthorDisplay(["H. P. Lovecraft"], "and divers hands"),
    "H. P. Lovecraft and divers hands",
  );
  assert.deepEqual(
    resolveBookAuthors({ author: "H. P. Lovecraft & Divers Hands" }),
    ["H. P. Lovecraft"],
  );
  assert.equal(
    resolveBookAuthorCollectiveSuffix({ author: "H. P. Lovecraft & Divers Hands" }),
    "and divers hands",
  );
  assert.deepEqual(
    resolveBookAuthors({
      listAuthor: "by H. P. Lovecraft and Divers Hands (1959)",
    }),
    ["H. P. Lovecraft"],
  );
  assert.equal(
    resolveBookAuthorCollectiveSuffix({
      listAuthor: "by H. P. Lovecraft and others (1969)",
    }),
    "and others",
  );
});

test("splitPersonList keeps generational suffixes with the name", () => {
  assert.deepEqual(parseCoverArtistNames("Joe Wehrle, Jr."), ["Joe Wehrle, Jr."]);
  assert.deepEqual(parseAuthorNames("James Tiptree, Jr."), ["James Tiptree, Jr."]);
  assert.deepEqual(
    parseCoverArtistNames("Ronald Rich, Virgil Finlay and Gary Gore"),
    ["Ronald Rich", "Virgil Finlay", "Gary Gore"],
  );
});

test("parseCoverArtistNames keeps primary credit before design by", () => {
  assert.deepEqual(
    parseCoverArtistNames("James Dietrich, design by Gary Gore"),
    ["James Dietrich"],
  );
  assert.deepEqual(
    parseCoverArtistNames("Alan Fore, design by JenGraph (Jennifer A. Niles)"),
    ["Alan Fore"],
  );
  assert.deepEqual(parseCoverArtistNames("photograph by Eric Carlson"), [
    "Eric Carlson",
  ]);
  assert.deepEqual(
    parseCoverArtistNames(
      "photograph by Clarence J. Laughlin, lettering and design by Gary Gore",
    ),
    ["Clarence J. Laughlin"],
  );
});

test("parseCoverArtistNames splits multi-artist lists", () => {
  assert.deepEqual(
    parseCoverArtistNames("Ronald Rich, Virgil Finlay and Gary Gore"),
    ["Ronald Rich", "Virgil Finlay", "Gary Gore"],
  );
  assert.deepEqual(parseCoverArtistNames("JenGraph and Jennifer Niles"), [
    "JenGraph",
    "Jennifer Niles",
  ]);
  assert.deepEqual(parseCoverArtistNames("Virgil Finlay"), ["Virgil Finlay"]);
});

test("resolveBookAuthors and resolveBookCoverArtists prefer edit overrides", () => {
  assert.deepEqual(
    resolveBookAuthors({
      author: "August Derleth (inspired by fragments by H.P. Lovecraft)",
      authors: ["August Derleth", "H. P. Lovecraft"],
    }),
    ["August Derleth", "H. P. Lovecraft"],
  );
  assert.deepEqual(
    resolveBookCoverArtists({
      coverArtist: "James Dietrich, design by Gary Gore",
      coverArtists: ["James Dietrich", "Gary Gore"],
    }),
    ["James Dietrich", "Gary Gore"],
  );
});

test("resolveBookAuthors uses listAuthor when author is missing", () => {
  assert.deepEqual(
    resolveBookAuthors({
      listAuthor: "edited by James Robert Smith and Stephen Mark Rainey (1967)",
    }),
    ["James Robert Smith", "Stephen Mark Rainey"],
  );
});

test("normalizePersonKey normalizes for matching", () => {
  assert.equal(normalizePersonKey("H. P. Lovecraft"), "h p lovecraft");
  assert.equal(normalizePersonKey("  Virgil Finlay  "), "virgil finlay");
});

test("formatPersonList joins display names", () => {
  assert.equal(
    formatPersonList(["Ronald Rich", "Virgil Finlay"]),
    "Ronald Rich, Virgil Finlay",
  );
});
