const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeTag,
  formatTagLabel,
  collectAllKnownTags,
  tagKey,
} = require("../scripts/lib/tag-normalize");

test("normalizeTag trims, uppercases, and rejects empty or long values", () => {
  assert.equal(normalizeTag("  signed  copy  "), "SIGNED COPY");
  assert.equal(normalizeTag("Gothic"), "GOTHIC");
  assert.equal(normalizeTag(""), null);
  assert.equal(normalizeTag("   "), null);
  assert.equal(normalizeTag("x".repeat(49)), null);
});

test("formatTagLabel falls back to trimmed uppercase display text", () => {
  assert.equal(formatTagLabel(" horror "), "HORROR");
});

test("collectAllKnownTags dedupes case-insensitively across books", () => {
  assert.deepEqual(
    collectAllKnownTags({
      1: ["Signed", "Arkham"],
      2: ["signed", "Reprint"],
    }),
    ["ARKHAM", "REPRINT", "SIGNED"],
  );
});

test("tagKey is case-insensitive", () => {
  assert.equal(tagKey("HORROR"), tagKey("horror"));
});
