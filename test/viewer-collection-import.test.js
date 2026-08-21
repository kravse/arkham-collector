const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  COLLECTION_CSV_HEADER,
  parseCollectionCsv,
  parseWantRank,
  normalizeImportStatus,
  matchCollectionImportEntries,
  matchCollectionImportRows,
  matchBookIdForRow,
  buildWantOrderIdsFromImportEntries,
  buildCollectionExportRows,
} = require("../scripts/lib/viewer-collection-import");
const {
  COLLECTED,
  ORDERED,
  WANT,
  NONE,
  replaceStatusesFromImport,
  deriveIdsByStatus,
} = require("../scripts/lib/viewer-book-status");
const { normalizeWantOrderIds } = require("../scripts/lib/viewer-want-order-normalize");

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

test("parseCollectionCsv reads quoted titles, years, status, and want_rank", () => {
  const rows = parseCollectionCsv(
    'Witch House,Evangeline Walton,1945,collected,\n"Dark Mind, Dark Heart",August Derleth,1962,ordered,\nTales of the Cthulhu Mythos,,1969,want,2\n',
  );
  assert.equal(rows.length, 3);
  assert.equal(rows[0].title, "Witch House");
  assert.equal(rows[0].year, "1945");
  assert.equal(rows[0].status, "collected");
  assert.equal(rows[0].wantRank, null);
  assert.equal(rows[2].status, "want");
  assert.equal(rows[2].wantRank, 2);
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
  assert.deepEqual(result.entries, [{ id: 1, status: WANT, wantRank: null }]);
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

test("parseWantRank accepts positive integers and rejects invalid values", () => {
  assert.equal(parseWantRank(""), null);
  assert.equal(parseWantRank("3"), 3);
  assert.equal(parseWantRank("0"), null);
  assert.equal(parseWantRank("1.5"), null);
});

test("buildCollectionExportRows includes want_rank for wanted titles", () => {
  const statusMap = {
    2: { status: WANT, at: at(1) },
    5: { status: WANT, at: at(1) },
    1: { status: COLLECTED, at: at(1) },
  };
  const rows = buildCollectionExportRows(books, statusMap, null, [5, 2]);
  const byTitle = Object.fromEntries(rows.map((cols) => [cols[0], cols]));
  assert.equal(byTitle["Missing From Catalog"][4], "1");
  assert.equal(byTitle["Dark Mind, Dark Heart"][4], "2");
  assert.equal(byTitle["Witch House"][4], "");
});

test("buildWantOrderIdsFromImportEntries sorts by want_rank then row order", () => {
  const entries = [
    { id: 2, status: WANT, wantRank: 2 },
    { id: 5, status: WANT, wantRank: 1 },
    { id: 1, status: COLLECTED, wantRank: null },
  ];
  assert.deepEqual(buildWantOrderIdsFromImportEntries(entries), [5, 2]);
});

test("buildWantOrderIdsFromImportEntries falls back to row order without ranks", () => {
  const entries = [
    { id: 2, status: WANT, wantRank: null },
    { id: 5, status: WANT, wantRank: null },
  ];
  assert.deepEqual(buildWantOrderIdsFromImportEntries(entries), [2, 5]);
});

test("export then import round-trips membership and want priority", () => {
  const before = {
    1: { status: COLLECTED, at: at(1) },
    2: { status: ORDERED, at: at(2) },
    5: { status: WANT, at: at(3) },
    3: { status: WANT, at: at(4) },
    99: { status: NONE, at: at(1) },
  };
  const wantOrderIds = [3, 5];
  const rows = buildCollectionExportRows(books, before, null, wantOrderIds);
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
  const importedWantOrder = buildWantOrderIdsFromImportEntries(entries);
  const normalizedWantOrder = normalizeWantOrderIds(
    importedWantOrder,
    deriveIdsByStatus(after).wantIds,
  );

  assert.equal(after[1].status, COLLECTED);
  assert.equal(after[2].status, ORDERED);
  assert.equal(after[5].status, WANT);
  assert.equal(after[3].status, WANT);
  assert.equal(after[99], undefined, "tombstones outside the export are not invented");
  assert.deepEqual(normalizedWantOrder, [3, 5]);
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
