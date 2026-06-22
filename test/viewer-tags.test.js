const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  buildTagColorMap,
  createTagColorRegistry,
  hueDistance,
  tagKey,
} = require("../scripts/lib/viewer-tags");

function hueFromColors(colors) {
  const match = colors.bg.match(/hsla\(([\d.]+),/);
  return match ? Number(match[1]) : null;
}

test("buildTagColorMap keeps stable colors for the same tag", () => {
  const first = buildTagColorMap(["CTHULHU MYTHOS", "HORROR"]);
  const second = buildTagColorMap(["horror", "cthulhu mythos"]);
  assert.deepEqual(first.get(tagKey("HORROR")), second.get(tagKey("horror")));
});

test("buildTagColorMap separates similar catalog tags", () => {
  const tags = [
    "HORROR",
    "WEIRD FICTION",
    "CTHULHU MYTHOS",
    "SCIENCE FICTION",
    "FANTASY",
    "GOTHIC",
    "ANTHOLOGY",
    "NONFICTION",
    "POETRY",
    "NOVEL",
  ];
  const registry = createTagColorRegistry(tags);
  assert.ok(registry.minHueSeparation() >= 32);
});

test("createTagColorRegistry assigns different hues to distinct tags", () => {
  const registry = createTagColorRegistry(["HORROR", "FANTASY"]);
  assert.notEqual(
    hueFromColors(registry.getTagColors("HORROR")),
    hueFromColors(registry.getTagColors("FANTASY")),
  );
});

test("tagChipStyleAttr writes css custom properties", () => {
  const registry = createTagColorRegistry(["HORROR"]);
  const attr = registry.tagChipStyleAttr("HORROR");
  assert.match(attr, /--tag-bg: hsla\(/);
  assert.match(attr, /--tag-border: hsla\(/);
  assert.match(attr, /--tag-text: hsla\(/);
});

test("hueDistance wraps around the color wheel", () => {
  assert.equal(hueDistance(350, 10), 20);
  assert.equal(hueDistance(10, 350), 20);
});
