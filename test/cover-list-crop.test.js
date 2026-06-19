const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  LIST_WIDTH,
  LIST_HEIGHT,
  LIST_FOCAL_X,
  LIST_FOCAL_Y,
  resolveListCoverFocus,
  parseListCoverFocusField,
  parseListCoverFocusPatch,
  getListCoverImagePresentation,
  getListCoverCacheKey,
  computeListCoverCrop,
  computeListCoverPreviewLayout,
  buildListFocalByMaster,
  applyListCoverFocusPatch,
  isDefaultListCoverFocus,
} = require("../scripts/lib/cover-list-crop");

test("computeListCoverCrop centers horizontally at default focal X", () => {
  const crop = computeListCoverCrop(
    1200,
    1800,
    LIST_WIDTH,
    LIST_HEIGHT,
    LIST_FOCAL_X,
    LIST_FOCAL_Y,
  );
  assert.equal(crop.width, 1200);
  assert.equal(crop.height, 80);
  assert.equal(crop.left, 0);
  assert.equal(crop.top, Math.round(0.7 * 1800 - 80 / 2));
});

test("computeListCoverCrop shifts horizontally with focal X", () => {
  const crop = computeListCoverCrop(2000, 1800, LIST_WIDTH, LIST_HEIGHT, 0.25, 0.7);
  assert.ok(crop.left < 400);
});

test("computeListCoverCrop clamps top when focal point is near the bottom", () => {
  const crop = computeListCoverCrop(800, 200, LIST_WIDTH, LIST_HEIGHT, 0.5, 0.95);
  assert.equal(crop.top + crop.height, 200);
});

test("resolveListCoverFocus uses defaults when edit is missing", () => {
  assert.deepEqual(resolveListCoverFocus(null), { x: LIST_FOCAL_X, y: LIST_FOCAL_Y });
});

test("resolveListCoverFocus reads saved edit values", () => {
  assert.deepEqual(
    resolveListCoverFocus({ listCoverFocusX: 0.2, listCoverFocusY: 0.35 }),
    { x: 0.2, y: 0.35 },
  );
});

test("parseListCoverFocusField validates range", () => {
  assert.equal(parseListCoverFocusField("0.4"), 0.4);
  assert.equal(parseListCoverFocusField(null), null);
  assert.match(parseListCoverFocusField("1.5").error, /between 0 and 1/);
});

test("parseListCoverFocusPatch parses optional x and y fields", () => {
  assert.deepEqual(parseListCoverFocusPatch({ listCoverFocusX: "0.2" }), {
    listCoverFocusX: 0.2,
  });
  assert.deepEqual(parseListCoverFocusPatch({}), null);
  assert.match(parseListCoverFocusPatch({ listCoverFocusY: "bad" }).error, /between 0 and 1/);
});

test("applyListCoverFocusPatch omits fields at default focal", () => {
  const edit = {};
  applyListCoverFocusPatch(edit, "listCoverFocusX", LIST_FOCAL_X);
  applyListCoverFocusPatch(edit, "listCoverFocusY", LIST_FOCAL_Y);
  assert.deepEqual(edit, {});
  assert.equal(isDefaultListCoverFocus(LIST_FOCAL_X, LIST_FOCAL_Y), true);
});

test("getListCoverImagePresentation uses baked strip class when list file exists", () => {
  assert.deepEqual(
    getListCoverImagePresentation({
      coverImageListFile: "covers/foo-1.list.webp",
      listCoverFocusX: 0.2,
      listCoverFocusY: 0.3,
    }),
    { className: "cover-list-strip", style: "" },
  );
});

test("getListCoverImagePresentation simulates focal on serve without list file", () => {
  assert.deepEqual(
    getListCoverImagePresentation({
      coverImageFile: "covers/foo-1.jpg",
      listCoverFocusX: 0.2,
      listCoverFocusY: 0.35,
    }),
    { className: "cover-list-focal", style: "" },
  );
});

test("getListCoverImagePresentation uses default focal when book has no saved crop", () => {
  assert.deepEqual(getListCoverImagePresentation({ coverImageFile: "covers/foo-1.jpg" }), {
    className: "cover-list-focal",
    style: "",
  });
});

test("computeListCoverPreviewLayout maps crop width to container width", () => {
  const crop = computeListCoverCrop(1200, 1800, LIST_WIDTH, LIST_HEIGHT, 0.5, 0.7);
  const layout = computeListCoverPreviewLayout(
    1200,
    1800,
    0.5,
    0.7,
    600,
    50,
  );
  const scale = 600 / crop.width;
  assert.equal(layout.width, 600);
  assert.equal(layout.height, 900);
  assert.ok(Math.abs(layout.left) < 1e-9);
  assert.equal(
    layout.top,
    -crop.top * scale + (50 - crop.height * scale) / 2,
  );
});

test("getListCoverCacheKey encodes saved focal for cache busting", () => {
  assert.equal(
    getListCoverCacheKey({ listCoverFocusX: 0.2, listCoverFocusY: 0.35 }),
    "0.2000-0.3500",
  );
});

test("buildListFocalByMaster maps master paths to saved focal values", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "arkham-list-focal-"));
  const coverRel = "covers/demons-by-daylight-317.png";
  fs.mkdirSync(path.join(tempRoot, "covers"), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, coverRel), "cover");

  const config = require("../scripts/config");
  const previousRoot = config.ROOT;
  config.ROOT = tempRoot;
  delete require.cache[require.resolve("../scripts/lib/covers-files")];
  delete require.cache[require.resolve("../scripts/lib/cover-list-crop")];
  const { buildListFocalByMaster: buildMap } = require("../scripts/lib/cover-list-crop");

  const map = buildMap(
    [{ id: 317, coverImageFile: coverRel }],
    { 317: { listCoverFocusX: 0.3, listCoverFocusY: 0.4 } },
  );
  assert.deepEqual(map.get(coverRel), { x: 0.3, y: 0.4 });

  config.ROOT = previousRoot;
  delete require.cache[require.resolve("../scripts/lib/covers-files")];
  delete require.cache[require.resolve("../scripts/lib/cover-list-crop")];
});
