#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(__dirname, "lib", "viewer-gist-sync.js");
const TARGET = path.join(ROOT, "js", "viewer", "00-viewer-gist-sync.js");

function syncViewerGistSync() {
  const source = fs.readFileSync(SOURCE, "utf8");
  const body = source.replace(/\nmodule\.exports = \{[\s\S]*$/, "");
  const output = `/* Generated from scripts/lib/viewer-gist-sync.js — run npm run bundle-viewer */

const viewerGistSync = (function () {
${body
  .trimEnd()
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
  return {
    GIST_SYNC_KEY,
    GIST_STATE_FILENAME,
    GITHUB_API,
    parseGistSyncConfig,
    serializeGistSyncConfig,
    isConnectedGistConfig,
    mergeUserStateByUpdatedAt,
    mergeGistUserState,
    extractStateJsonFromGistResponse,
    findArkhamGistId,
    buildGistCreatePayload,
    buildGistUpdatePayload,
  };
})();
`;
  fs.writeFileSync(TARGET, output);
}

if (require.main === module) {
  syncViewerGistSync();
}

module.exports = { syncViewerGistSync };
