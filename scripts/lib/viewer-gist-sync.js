const GIST_SYNC_KEY = "arkham-gist-sync";
const GIST_STATE_FILENAME = "state.json";
const GITHUB_API = "https://api.github.com";

function parseGistSyncConfig(json) {
  if (json == null || json === "") {
    return null;
  }
  try {
    const parsed = typeof json === "string" ? JSON.parse(json) : json;
    const token = typeof parsed.token === "string" ? parsed.token.trim() : "";
    const gistId = typeof parsed.gistId === "string" ? parsed.gistId.trim() : "";
    if (!token) {
      return null;
    }
    return { token, gistId };
  } catch (_) {
    return null;
  }
}

function serializeGistSyncConfig(config) {
  return JSON.stringify({
    token: config.token,
    gistId: config.gistId || "",
  });
}

function isConnectedGistConfig(config) {
  return Boolean(config?.token && config?.gistId);
}

function mergeUserStateByUpdatedAt(localState, remoteState) {
  if (!remoteState) {
    return localState;
  }
  if (!localState) {
    return remoteState;
  }
  const localTime = Date.parse(localState.updatedAt || "");
  const remoteTime = Date.parse(remoteState.updatedAt || "");
  if (!Number.isFinite(localTime) && Number.isFinite(remoteTime)) {
    return remoteState;
  }
  if (Number.isFinite(localTime) && !Number.isFinite(remoteTime)) {
    return localState;
  }
  if (remoteTime > localTime) {
    return remoteState;
  }
  return localState;
}

function mergeGistUserState(localState, remoteState, helpers) {
  const merged = mergeUserStateByUpdatedAt(localState, remoteState);
  if (!merged || !localState || !helpers) {
    return merged;
  }
  const {
    normalizeCollections,
    normalizeCollectionSlot,
    emptyCollectionSlot,
  } = helpers;
  const localSlot = normalizeCollectionSlot(
    localState.collections?.local,
    {
      collectionIds: localState.collectionIds || [],
      orderedIds: localState.orderedIds || [],
    },
  );
  merged.collections = normalizeCollections(
    merged.collections,
    merged.collectionIds,
    merged.orderedIds,
  );
  merged.collections.local = localSlot;
  if (!merged.collections.gist) {
    merged.collections.gist = emptyCollectionSlot();
  }
  return merged;
}

function extractStateJsonFromGistResponse(body) {
  if (!body || typeof body !== "object") {
    return null;
  }
  const file = body.files?.[GIST_STATE_FILENAME];
  if (!file || typeof file.content !== "string") {
    return null;
  }
  return file.content;
}

function findArkhamGistId(gists, stateFilename = GIST_STATE_FILENAME) {
  if (!Array.isArray(gists)) {
    return null;
  }
  const match = gists.find(
    (gist) => gist?.files && gist.files[stateFilename],
  );
  return match?.id || null;
}

function buildGistCreatePayload(stateJson) {
  return {
    description: "Arkham Collector sync",
    public: false,
    files: {
      [GIST_STATE_FILENAME]: {
        content: stateJson,
      },
    },
  };
}

function buildGistUpdatePayload(stateJson) {
  return {
    files: {
      [GIST_STATE_FILENAME]: {
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

module.exports = {
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
  resolveGistConnectState,
};
