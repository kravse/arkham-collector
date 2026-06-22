const { findCoverMasterPath } = require("./covers-files");
const { coverSourceKey } = require("./covers-shared");

const LIST_WIDTH = 1200;
const LIST_HEIGHT = 80;
const LIST_FOCAL_X = 0.5;
const LIST_FOCAL_Y = 0.7;

function isDefaultListCoverFocus(x, y) {
  return x === LIST_FOCAL_X && y === LIST_FOCAL_Y;
}

function resolveListCoverFocus(edit) {
  const x =
    typeof edit?.listCoverFocusX === "number" && Number.isFinite(edit.listCoverFocusX)
      ? edit.listCoverFocusX
      : LIST_FOCAL_X;
  const y =
    typeof edit?.listCoverFocusY === "number" && Number.isFinite(edit.listCoverFocusY)
      ? edit.listCoverFocusY
      : LIST_FOCAL_Y;
  return { x, y };
}

function getListCoverCacheKey(book) {
  const { x, y } = resolveListCoverFocus(book);
  return `${x.toFixed(4)}-${y.toFixed(4)}`;
}

function getListCoverImagePresentation(book) {
  if (book?.coverImageListFile) {
    return {
      className: "cover-list-strip",
      style: "",
    };
  }
  return {
    className: "cover-list-focal",
    style: "",
  };
}

function computeListCoverPreviewLayout(
  sourceWidth,
  sourceHeight,
  focalX,
  focalY,
  containerWidth,
  containerHeight,
  listWidth = LIST_WIDTH,
  listHeight = LIST_HEIGHT,
) {
  if (
    !sourceWidth ||
    !sourceHeight ||
    !containerWidth ||
    !containerHeight
  ) {
    return null;
  }

  const crop = computeListCoverCrop(
    sourceWidth,
    sourceHeight,
    listWidth,
    listHeight,
    focalX,
    focalY,
  );
  const scale = containerWidth / crop.width;
  const cropDisplayHeight = crop.height * scale;

  return {
    width: sourceWidth * scale,
    height: sourceHeight * scale,
    left: -crop.left * scale,
    top: -crop.top * scale + (containerHeight - cropDisplayHeight) / 2,
  };
}

function parseListCoverFocusField(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return { error: "List cover focus must be a number between 0 and 1" };
  }
  return parsed;
}

function parseListCoverFocusPatch(body) {
  const hasX = body != null && Object.prototype.hasOwnProperty.call(body, "listCoverFocusX");
  const hasY = body != null && Object.prototype.hasOwnProperty.call(body, "listCoverFocusY");
  if (!hasX && !hasY) {
    return null;
  }

  const patch = {};
  if (hasX) {
    const x = parseListCoverFocusField(body.listCoverFocusX);
    if (x && typeof x === "object" && x.error) {
      return x;
    }
    patch.listCoverFocusX = x;
  }
  if (hasY) {
    const y = parseListCoverFocusField(body.listCoverFocusY);
    if (y && typeof y === "object" && y.error) {
      return y;
    }
    patch.listCoverFocusY = y;
  }
  return patch;
}

function computeListCoverCrop(
  sourceWidth,
  sourceHeight,
  listWidth = LIST_WIDTH,
  listHeight = LIST_HEIGHT,
  focalX = LIST_FOCAL_X,
  focalY = LIST_FOCAL_Y,
) {
  const targetAspect = listWidth / listHeight;
  let cropWidth = sourceWidth;
  let cropHeight = Math.round(cropWidth / targetAspect);
  if (cropHeight > sourceHeight) {
    cropHeight = sourceHeight;
    cropWidth = Math.round(cropHeight * targetAspect);
  }
  const focalPxX = focalX * sourceWidth;
  const focalPxY = focalY * sourceHeight;
  let left = Math.round(focalPxX - cropWidth / 2);
  let top = Math.round(focalPxY - cropHeight / 2);
  left = Math.max(0, Math.min(sourceWidth - cropWidth, left));
  top = Math.max(0, Math.min(sourceHeight - cropHeight, top));
  return { left, top, width: cropWidth, height: cropHeight };
}

function getEditForBook(editsById, bookId) {
  if (!editsById) {
    return null;
  }
  return editsById[String(bookId)] || editsById[bookId] || null;
}

function buildListFocalByMaster(books, editsById) {
  const map = new Map();
  if (!Array.isArray(books)) {
    return map;
  }
  for (const book of books) {
    const master = findCoverMasterPath(book, books);
    if (!master) {
      continue;
    }
    const edit = getEditForBook(editsById, book.id);
    const { x, y } = resolveListCoverFocus({ ...edit, ...book });
    map.set(coverSourceKey(master), { x, y });
  }
  return map;
}

function applyListCoverFocusPatch(edit, field, value) {
  if (field !== "listCoverFocusX" && field !== "listCoverFocusY") {
    return false;
  }
  if (value === null || value === undefined) {
    delete edit[field];
  } else {
    edit[field] = value;
  }
  const { x, y } = resolveListCoverFocus(edit);
  if (isDefaultListCoverFocus(x, y)) {
    delete edit.listCoverFocusX;
    delete edit.listCoverFocusY;
  }
  return true;
}

module.exports = {
  LIST_WIDTH,
  LIST_HEIGHT,
  LIST_FOCAL_X,
  LIST_FOCAL_Y,
  coverSourceKey,
  isDefaultListCoverFocus,
  resolveListCoverFocus,
  getListCoverImagePresentation,
  computeListCoverPreviewLayout,
  getListCoverCacheKey,
  parseListCoverFocusField,
  parseListCoverFocusPatch,
  computeListCoverCrop,
  buildListFocalByMaster,
  applyListCoverFocusPatch,
};
