const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  parseSampleUrlOverride,
  resolveCollectionSourceOnLoad,
} = require("../scripts/lib/viewer-collection-source");

test("parseSampleUrlOverride matches sample=true only", () => {
  assert.equal(parseSampleUrlOverride("?sample=true"), true);
  assert.equal(parseSampleUrlOverride("?foo=1&sample=true"), true);
  assert.equal(parseSampleUrlOverride(""), false);
  assert.equal(parseSampleUrlOverride("?sample=false"), false);
  assert.equal(parseSampleUrlOverride("?sample=1"), false);
  assert.equal(parseSampleUrlOverride("?Sample=true"), false);
});

test("resolveCollectionSourceOnLoad uses sample when URL override is active", () => {
  assert.equal(
    resolveCollectionSourceOnLoad({
      saved: "own",
      defaultSource: "own",
      sampleUrlOverride: true,
    }),
    "sample",
  );
});

test("resolveCollectionSourceOnLoad respects saved preference without URL override", () => {
  assert.equal(
    resolveCollectionSourceOnLoad({
      saved: "own",
      defaultSource: "sample",
      sampleUrlOverride: false,
    }),
    "own",
  );
  assert.equal(
    resolveCollectionSourceOnLoad({
      saved: "sample",
      defaultSource: "own",
      sampleUrlOverride: false,
    }),
    "sample",
  );
});

test("resolveCollectionSourceOnLoad falls back to default when nothing saved", () => {
  assert.equal(
    resolveCollectionSourceOnLoad({
      saved: null,
      defaultSource: "own",
      sampleUrlOverride: false,
    }),
    "own",
  );
  assert.equal(
    resolveCollectionSourceOnLoad({
      saved: null,
      defaultSource: "own",
      sampleUrlOverride: true,
    }),
    "sample",
  );
});
