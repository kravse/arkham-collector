const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  WANT_FILTER,
  isWantFilterActive,
  cycleWantFilter,
  usesWantPrioritySort,
  shouldDisableCatalogSort,
  canReorderWantList,
  shouldShowWantRankHandles,
} = require("../scripts/lib/viewer-want-view");

test("isWantFilterActive is true only for want mode", () => {
  assert.equal(isWantFilterActive(null), false);
  assert.equal(isWantFilterActive(WANT_FILTER), true);
  assert.equal(isWantFilterActive("ranked"), false);
});

test("cycleWantFilter toggles null and want when wants exist", () => {
  assert.equal(cycleWantFilter(null, true), WANT_FILTER);
  assert.equal(cycleWantFilter(WANT_FILTER, true), null);
});

test("cycleWantFilter can enter want mode without wants but cannot exit to null", () => {
  assert.equal(cycleWantFilter(null, false), WANT_FILTER);
  assert.equal(cycleWantFilter(WANT_FILTER, false), null);
});

test("usesWantPrioritySort and shouldDisableCatalogSort follow want filter", () => {
  assert.equal(usesWantPrioritySort(null), false);
  assert.equal(usesWantPrioritySort(WANT_FILTER), true);
  assert.equal(shouldDisableCatalogSort(WANT_FILTER), true);
  assert.equal(shouldDisableCatalogSort(null), false);
});

test("canReorderWantList requires want filter, no search, list or card view, and unlocked order", () => {
  assert.equal(canReorderWantList(WANT_FILTER, "list", false), true);
  assert.equal(canReorderWantList(WANT_FILTER, "cards", false), true);
  assert.equal(canReorderWantList(WANT_FILTER, "list", true), false);
  assert.equal(canReorderWantList(WANT_FILTER, "cards", true), false);
  assert.equal(canReorderWantList(null, "list", false), false);
  assert.equal(canReorderWantList(WANT_FILTER, "list", false, true), false);
});

test("shouldShowWantRankHandles ignores lock but requires want filter and no search", () => {
  assert.equal(shouldShowWantRankHandles(WANT_FILTER, "list", false), true);
  assert.equal(shouldShowWantRankHandles(WANT_FILTER, "list", true), false);
  assert.equal(shouldShowWantRankHandles(null, "list", false), false);
});
