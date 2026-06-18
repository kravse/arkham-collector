#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(__dirname, "lib", "viewer-user-state.js");
const TARGET = path.join(ROOT, "js", "viewer", "00-viewer-user-state.js");

function syncViewerUserState() {
  const source = fs.readFileSync(SOURCE, "utf8");
  const body = source.replace(/\nmodule\.exports = \{[\s\S]*$/, "");
  const output = `/* Generated from scripts/lib/viewer-user-state.js — run npm run bundle-viewer */

const viewerUserState = (function () {
${body
  .trimEnd()
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
  return {
    USER_STATE_KEY,
    USER_STATE_VERSION,
    LEGACY_KEYS,
    defaultUserState,
    emptyCollectionSlot,
    normalizeCollections,
    normalizeCollectionSlot,
    activeCollectionSlot,
    localCollectionSlotFromPersisted,
    buildEmptyGistConnectState,
    adoptRemoteGistState,
    normalizeIdArray,
    normalizeStorageMode,
    migrateFromLegacy,
    migrateV1ToV2,
    parseUserState,
    buildUserStateFromRuntime,
    applyUserStateToRuntime,
    serializeUserState,
  };
})();
`;
  fs.writeFileSync(TARGET, output);
}

if (require.main === module) {
  syncViewerUserState();
}

module.exports = { syncViewerUserState };
