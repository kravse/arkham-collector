const { test } = require("node:test");
const assert = require("node:assert/strict");

const { parseArgs } = require("../scripts/cli");
const { resolveTaskId } = require("../scripts/lib/cli-dispatch");

test("resolveTaskId maps flags to task ids", () => {
  assert.equal(resolveTaskId(parseArgs(["--sync-collection"])), "syncCollection");
  assert.equal(resolveTaskId(parseArgs(["--compact-edits"])), "compactEdits");
  assert.equal(
    resolveTaskId(parseArgs(["--import-tags-from-csv", "--csv", "tags.csv"])),
    "importTagsFromCsv",
  );
  assert.equal(resolveTaskId(parseArgs([])), "crawl");
});
