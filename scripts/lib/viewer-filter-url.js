const DEFAULT_FILTERS = {
  collectionFilterMode: null,
  wantFilterMode: null,
  mycroftFilterMode: null,
  hiddenOnly: false,
};

const FILTER_BY_SEGMENT = {
  collection: {
    collectionFilterMode: "collection",
  },
  ordered: {
    collectionFilterMode: "ordered",
  },
  want: {
    wantFilterMode: "want",
  },
  "mycroft-moran": {
    mycroftFilterMode: "only",
  },
  "mycroft-hidden": {
    mycroftFilterMode: "hidden",
  },
};

const FILTER_PATH_SEGMENTS = Object.keys(FILTER_BY_SEGMENT);

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") {
    return "";
  }
  let path = String(pathname);
  path = path.replace(/\/index\.html$/i, "");
  path = path.replace(/\/viewer\.html$/i, "");
  path = path.replace(/\/+$/, "");
  return path === "/" ? "" : path;
}

function parseFilterPath(pathname) {
  const normalized = normalizePathname(pathname);
  if (!normalized) {
    return { ...DEFAULT_FILTERS };
  }
  const segment = normalized.replace(/^\//, "").split("/")[0];
  const match = FILTER_BY_SEGMENT[segment];
  if (!match) {
    return { ...DEFAULT_FILTERS };
  }
  return { ...DEFAULT_FILTERS, ...match };
}

function buildFilterPath(filters) {
  if (filters?.wantFilterMode === "want") {
    return "/want";
  }
  if (filters?.collectionFilterMode === "ordered") {
    return "/ordered";
  }
  if (filters?.collectionFilterMode === "collection") {
    return "/collection";
  }
  if (filters?.mycroftFilterMode === "only") {
    return "/mycroft-moran";
  }
  if (filters?.mycroftFilterMode === "hidden") {
    return "/mycroft-hidden";
  }
  return "/";
}

function buildFilterUrl(filters, search = "", hash = "") {
  const path = buildFilterPath(filters);
  return `${path}${search || ""}${hash || ""}`;
}

function currentFilterSnapshot(filters) {
  return {
    collectionFilterMode: filters?.collectionFilterMode ?? null,
    wantFilterMode: filters?.wantFilterMode ?? null,
    mycroftFilterMode: filters?.mycroftFilterMode ?? null,
    hiddenOnly: Boolean(filters?.hiddenOnly),
  };
}

module.exports = {
  DEFAULT_FILTERS,
  FILTER_PATH_SEGMENTS,
  normalizePathname,
  parseFilterPath,
  buildFilterPath,
  buildFilterUrl,
  currentFilterSnapshot,
};
