const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  decadeFromYear,
  normalizeDecadeLabel,
  entryDecade,
} = require("../scripts/lib/wiki-bibliography");

test("decadeFromYear always returns a decade bucket", () => {
  assert.equal(decadeFromYear(1939), "1930s");
  assert.equal(decadeFromYear(1945), "1940s");
  assert.equal(decadeFromYear(2012), "2010s");
});

test("normalizeDecadeLabel converts year labels to decade buckets", () => {
  assert.equal(normalizeDecadeLabel("1939"), "1930s");
  assert.equal(normalizeDecadeLabel("1940s"), "1940s");
  assert.equal(normalizeDecadeLabel("1950S"), "1950s");
});

test("entryDecade normalizes stored decade values", () => {
  assert.equal(entryDecade({ decade: "1939", listYear: 1939 }), "1930s");
  assert.equal(entryDecade({ listYear: 1945 }), "1940s");
});
