const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  parseFilterPath,
  buildFilterPath,
  normalizePathname,
  FILTER_PATH_SEGMENTS,
} = require("../scripts/lib/viewer-filter-url");

test("normalizePathname strips index and viewer html entry points", () => {
  assert.equal(normalizePathname("/"), "");
  assert.equal(normalizePathname("/index.html"), "");
  assert.equal(normalizePathname("/viewer.html"), "");
  assert.equal(normalizePathname("/want/"), "/want");
});

test("parseFilterPath maps known segments", () => {
  assert.deepEqual(parseFilterPath("/collection"), {
    collectionFilterMode: "collection",
    wantFilterMode: null,
    mycroftFilterMode: null,
    hiddenOnly: false,
  });
  assert.deepEqual(parseFilterPath("/ordered").collectionFilterMode, "ordered");
  assert.deepEqual(parseFilterPath("/want").wantFilterMode, "want");
  assert.deepEqual(parseFilterPath("/mycroft-moran").mycroftFilterMode, "only");
  assert.deepEqual(parseFilterPath("/mycroft-hidden").mycroftFilterMode, "hidden");
  assert.equal(parseFilterPath("/hidden").hiddenOnly, false);
  assert.deepEqual(parseFilterPath("/unknown"), {
    collectionFilterMode: null,
    wantFilterMode: null,
    mycroftFilterMode: null,
    hiddenOnly: false,
  });
});

test("buildFilterPath round-trips active filters", () => {
  for (const segment of FILTER_PATH_SEGMENTS) {
    const path = `/${segment}`;
    const built = buildFilterPath(parseFilterPath(path));
    assert.equal(built, path, segment);
  }
  assert.equal(
    buildFilterPath({
      collectionFilterMode: null,
      wantFilterMode: null,
      mycroftFilterMode: null,
      hiddenOnly: false,
    }),
    "/",
  );
});
