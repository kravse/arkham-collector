const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  COLLECTION_CSV_HEADER,
  parseCollectionCsv,
  normalizeImportStatus,
  matchCollectionImportEntries,
  matchCollectionImportRows,
  matchBookIdForRow,
  buildCollectionExportRows,
} = require("../scripts/lib/viewer-collection-import");
const {
  COLLECTED,
  ORDERED,
  WANT,
  NONE,
  replaceStatusesFromImport,
} = require("../scripts/lib/viewer-book-status");

const books = [
  {
    id: 1,
    title: "Witch House",
    listTitle: "Witch House",
    author: "Evangeline Walton",
    publicationDate: "1945",
  },
  {
    id: 2,
    title: "Dark Mind, Dark Heart",
    listTitle: "Dark Mind, Dark Heart",
    author: "August Derleth",
    publicationDate: "1962",
  },
  {
    id: 3,
    title: "Tales of the Cthulhu Mythos",
    publicationDate: "1969",
  },
  {
    id: 4,
    title: "Tales of the Cthulhu Mythos",
    publicationDate: "1990",
  },
  {
    id: 5,
    title: "Missing From Catalog",
    publicationDate: "2000",
  },
];

function at(minute) {
  return new Date(Date.UTC(2026, 0, 1, 0, minute)).toISOString();
}

test("parseCollectionCsv reads quoted titles, years, and status", () => {
  const rows = parseCollectionCsv(
    'Witch House,Evangeline Walton,1945,collected\n"Dark Mind, Dark Heart",August Derleth,1962,ordered\n',
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].title, "Witch House");
  assert.equal(rows[0].year, "1945");
  assert.equal(rows[0].status, "collected");
  assert.equal(rows[1].title, "Dark Mind, Dark Heart");
  assert.equal(rows[1].year, "1962");
  assert.equal(rows[1].status, "ordered");
});

test("parseCollectionCsv skips the header row", () => {
  const rows = parseCollectionCsv(
    `${COLLECTION_CSV_HEADER}\nWitch House,Evangeline Walton,1945,want\n`,
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "want");
});

test("parseCollectionCsv treats a missing status as collected for legacy files", () => {
  const rows = parseCollectionCsv("Witch House,Evangeline Walton,1945\n");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "");
});

test("normalizeImportStatus maps CSV values and defaults blank to collected", () => {
  assert.equal(normalizeImportStatus(""), COLLECTED);
  assert.equal(normalizeImportStatus("collected"), COLLECTED);
  assert.equal(normalizeImportStatus("order"), ORDERED);
  assert.equal(normalizeImportStatus("wanted"), WANT);
});

test("matchBookIdForRow disambiguates same title by year", () => {
  assert.equal(
    matchBookIdForRow(books, {
      title: "Tales of the Cthulhu Mythos",
      author: "",
      year: "1990",
    }),
    4,
  );
  assert.equal(
    matchBookIdForRow(books, {
      title: "Tales of the Cthulhu Mythos",
      author: "",
      year: "1969",
    }),
    3,
  );
});

test("matchCollectionImportEntries returns status per matched id", () => {
  const result = matchCollectionImportEntries(books, [
    { title: "Witch House", author: "", year: "1945", status: "want" },
    { title: "Not In Arkham House", author: "", year: "1950", status: "" },
  ]);
  assert.deepEqual(result.entries, [{ id: 1, status: WANT }]);
  assert.equal(result.unmatchedRows.length, 1);
});

test("matchCollectionImportRows remains compatible with matchedIds", () => {
  const result = matchCollectionImportRows(books, [
    { title: "Witch House", author: "", year: "1945", status: "ordered" },
  ]);
  assert.deepEqual(result.matchedIds, [1]);
});

test("buildCollectionExportRows includes collected, ordered, and want", () => {
  const statusMap = {
    1: { status: COLLECTED, at: at(1) },
    2: { status: ORDERED, at: at(1) },
    5: { status: WANT, at: at(1) },
  };
  const rows = buildCollectionExportRows(books, statusMap);
  assert.deepEqual(
    rows.map((cols) => cols[3]),
    [COLLECTED, ORDERED, WANT],
  );
  assert.equal(rows.find((cols) => cols[0] === "Witch House")[3], COLLECTED);
});

test("export then import round-trips membership for the active storage mode", () => {
  const before = {
    1: { status: COLLECTED, at: at(1) },
    2: { status: ORDERED, at: at(2) },
    5: { status: WANT, at: at(3) },
    99: { status: NONE, at: at(1) },
  };
  const rows = buildCollectionExportRows(books, before);
  const csvLines = [
    COLLECTION_CSV_HEADER,
    ...rows.map((cols) =>
      cols
        .map((value) =>
          /[",\n\r]/.test(String(value))
            ? `"${String(value).replace(/"/g, '""')}"`
            : String(value),
        )
        .join(","),
    ),
  ];
  const parsed = parseCollectionCsv(`${csvLines.join("\n")}\n`);
  const { entries } = matchCollectionImportEntries(books, parsed);
  const after = replaceStatusesFromImport({}, entries, at(9));

  assert.equal(after[1].status, COLLECTED);
  assert.equal(after[2].status, ORDERED);
  assert.equal(after[5].status, WANT);
  assert.equal(after[99], undefined, "tombstones outside the export are not invented");
});

test("import clears membership missing from the file", () => {
  const before = {
    1: { status: COLLECTED, at: at(1) },
    2: { status: WANT, at: at(1) },
    5: { status: ORDERED, at: at(1) },
  };
  const { entries } = matchCollectionImportEntries(books, [
    { title: "Witch House", author: "", year: "1945", status: "collected" },
  ]);
  const after = replaceStatusesFromImport(before, entries, at(5));

  assert.equal(after[1].status, COLLECTED);
  assert.equal(after[2].status, NONE);
  assert.equal(after[5].status, NONE);
});
