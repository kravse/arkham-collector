const SERVE_ONLY_UI_KEYS = [
  "bookOrderButton",
  "showHiddenToggle",
  "hiddenStatFilter",
  "cardEditButton",
  "detailEditButton",
];

function resolveServeEnabled({ readOnly, healthCheckOk = false }) {
  if (readOnly === true) {
    return false;
  }
  return healthCheckOk === true;
}

function shouldShowBookOrderButton(serveEnabled) {
  return serveEnabled === true;
}

function shouldShowShowHiddenToggle(serveEnabled) {
  return serveEnabled === true;
}

function shouldShowHiddenStatFilter(serveEnabled, hiddenCount) {
  return serveEnabled === true && hiddenCount > 0;
}

function shouldRenderCardEditButton(serveEnabled) {
  return serveEnabled === true;
}

function shouldRenderDetailEditButton({ readOnly, protocol }) {
  return readOnly !== true && protocol !== "file:";
}

function serveOnlyUiVisibility(options = {}) {
  const {
    readOnly = false,
    serveEnabled = false,
    hiddenCount = 0,
    protocol = "https:",
  } = options;
  const effectiveServeEnabled = resolveServeEnabled({
    readOnly,
    healthCheckOk: serveEnabled,
  });

  return {
    bookOrderButton: shouldShowBookOrderButton(effectiveServeEnabled),
    showHiddenToggle: shouldShowShowHiddenToggle(effectiveServeEnabled),
    hiddenStatFilter: shouldShowHiddenStatFilter(
      effectiveServeEnabled,
      hiddenCount,
    ),
    cardEditButton: shouldRenderCardEditButton(effectiveServeEnabled),
    detailEditButton: shouldRenderDetailEditButton({ readOnly, protocol }),
  };
}

function buildUiVisibility(options = {}) {
  return serveOnlyUiVisibility({
    readOnly: true,
    serveEnabled: false,
    ...options,
  });
}

function serveUiVisibility(options = {}) {
  return serveOnlyUiVisibility({
    readOnly: false,
    serveEnabled: true,
    ...options,
  });
}

module.exports = {
  SERVE_ONLY_UI_KEYS,
  resolveServeEnabled,
  shouldShowBookOrderButton,
  shouldShowShowHiddenToggle,
  shouldShowHiddenStatFilter,
  shouldRenderCardEditButton,
  shouldRenderDetailEditButton,
  serveOnlyUiVisibility,
  buildUiVisibility,
  serveUiVisibility,
};
