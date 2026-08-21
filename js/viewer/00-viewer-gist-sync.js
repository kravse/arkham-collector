/* Generated from scripts/lib/viewer-gist-sync.js — run npm run bundle-viewer */

const viewerGistSync = (function () {
  const GIST_SYNC_KEY = "arkham-gist-sync";
  const GIST_STATE_FILENAME = "arkham-collector-state.json";
  const LEGACY_GIST_STATE_FILENAMES = ["state.json"];
  const GITHUB_API = "https://api.github.com";
  const GIST_DESCRIPTION = "Arkham Collector sync";
  
  function parseGistSyncConfig(json) {
    if (json == null || json === "") {
      return null;
    }
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      const token = typeof parsed.token === "string" ? parsed.token.trim() : "";
      const gistId = typeof parsed.gistId === "string" ? parsed.gistId.trim() : "";
      const backupGistId =
        typeof parsed.backupGistId === "string" ? parsed.backupGistId.trim() : "";
      const stateFilename =
        typeof parsed.stateFilename === "string" ? parsed.stateFilename.trim() : "";
      if (!token) {
        return null;
      }
      return { token, gistId, backupGistId, stateFilename };
    } catch (_) {
      return null;
    }
  }
  
  function serializeGistSyncConfig(config) {
    return JSON.stringify({
      token: config.token,
      gistId: config.gistId || "",
      backupGistId: config.backupGistId || "",
      stateFilename: config.stateFilename || "",
    });
  }
  
  function isConnectedGistConfig(config) {
    return Boolean(config?.token && config?.gistId);
  }
  
  function resolveGistStateFilename(body, preferredFilename) {
    if (preferredFilename && body?.files?.[preferredFilename]) {
      return preferredFilename;
    }
    if (body?.files?.[GIST_STATE_FILENAME]) {
      return GIST_STATE_FILENAME;
    }
    for (const legacy of LEGACY_GIST_STATE_FILENAMES) {
      if (body?.files?.[legacy]) {
        return legacy;
      }
    }
    return GIST_STATE_FILENAME;
  }
  
  function extractStateJsonFromGistResponse(body, stateFilename) {
    if (!body || typeof body !== "object") {
      return null;
    }
    const filename = resolveGistStateFilename(body, stateFilename);
    const file = body.files?.[filename];
    if (!file || typeof file.content !== "string") {
      return null;
    }
    return file.content;
  }
  
  function findArkhamGistId(gists) {
    if (!Array.isArray(gists)) {
      return null;
    }
    const filenames = [GIST_STATE_FILENAME, ...LEGACY_GIST_STATE_FILENAMES];
    for (const filename of filenames) {
      const match = gists.find((gist) => gist?.files && gist.files[filename]);
      if (match?.id) {
        return match.id;
      }
    }
    return null;
  }
  
  function findArkhamGistEntry(gists) {
    if (!Array.isArray(gists)) {
      return null;
    }
    const filenames = [GIST_STATE_FILENAME, ...LEGACY_GIST_STATE_FILENAMES];
    for (const filename of filenames) {
      const match = gists.find((gist) => gist?.files && gist.files[filename]);
      if (match?.id) {
        return { gistId: match.id, stateFilename: filename };
      }
    }
    return null;
  }
  
  function buildGistCreatePayload(stateJson) {
    return {
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [GIST_STATE_FILENAME]: {
          content: stateJson,
        },
      },
    };
  }
  
  function buildGistUpdatePayload(stateJson, stateFilename = GIST_STATE_FILENAME) {
    return {
      files: {
        [stateFilename]: {
          content: stateJson,
        },
      },
    };
  }
  
  function resolveGistConnectState({
    gistId,
    remoteState,
    localPersisted,
    adoptRemoteGistState,
    buildNewGistConnectState,
  }) {
    if (gistId) {
      if (!remoteState) {
        return {
          ok: false,
          error:
            "Found an existing Arkham Gist but could not read state.json. Your Gist was not changed.",
        };
      }
      const nextState = adoptRemoteGistState(remoteState, localPersisted);
      if (!nextState) {
        return {
          ok: false,
          error:
            "Found an existing Arkham Gist but the sync file is invalid. Your Gist was not changed.",
        };
      }
      return { ok: true, action: "adopt", gistId, nextState };
    }
  
    return {
      ok: true,
      action: "create",
      gistId: "",
      nextState: buildNewGistConnectState(localPersisted),
    };
  }
  return {
    GIST_SYNC_KEY,
    GIST_STATE_FILENAME,
    LEGACY_GIST_STATE_FILENAMES,
    GIST_DESCRIPTION,
    GITHUB_API,
    parseGistSyncConfig,
    serializeGistSyncConfig,
    isConnectedGistConfig,
    resolveGistStateFilename,
    extractStateJsonFromGistResponse,
    findArkhamGistId,
    findArkhamGistEntry,
    buildGistCreatePayload,
    buildGistUpdatePayload,
    resolveGistConnectState,
  };
})();
