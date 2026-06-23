const path = require("path");

const LIB = path.join(__dirname, "lib");

/** @type {import("./sync-viewer-module").ViewerSyncEntry[]} */
const VIEWER_SYNC_ENTRIES = [
  {
    sources: [path.join(LIB, "viewer-card-html.js")],
    target: "00-viewer-card-html.js",
    globalName: "viewerCardHtml",
    header:
      "Generated from scripts/lib/viewer-card-html.js — run npm run bundle-viewer",
    exports: [
      "escapeHtml",
      "getDisplayAuthor",
      "getAuthorLastName",
      "getGoodreadsSearchUrl",
      "renderWikiButton",
      "renderGoodreadsButton",
      "renderBookMetaHtml",
      "renderImprintBadge",
    ],
  },
  {
    sources: [path.join(LIB, "viewer-sort.js")],
    target: "00-viewer-sort.js",
    globalName: "viewerSort",
    header:
      "Generated from scripts/lib/viewer-sort.js — run npm run bundle-viewer",
    exports: ["compareOrderTiebreak", "compareCanonical", "sortBooks"],
  },
  {
    sources: [path.join(LIB, "viewer-filters.js")],
    target: "00-viewer-filters.js",
    globalName: "viewerFilters",
    header:
      "Generated from scripts/lib/viewer-filters.js — run npm run bundle-viewer",
    exports: [
      "prepareBookSearchIndex",
      "parseSearchQuery",
      "parseCompoundSearchQuery",
      "serializeCompoundSearchQuery",
      "buildSearchFilter",
      "isTagDraftPending",
      "parseTagDraftInput",
      "absorbTagDraftInput",
      "resolveTagFilterLabel",
      "filterTagSuggestions",
      "formatTagSearchQuery",
      "matchesTagSearch",
      "matchesCompoundSearch",
      "filterBooksMatchingTagTerms",
      "matchesSearch",
      "isMagazineIssue",
      "passesHiddenVisibility",
      "passesBookVisibility",
      "passesMycroftImprintFilter",
      "isCollected",
      "isOrdered",
      "isInCollection",
      "passesCollectionFilter",
      "passesWantFilter",
      "filterVisibleBooks",
      "cycleMycroftFilter",
      "cycleCollectionFilter",
      "hasAnyOrderedBooks",
      "pickRandomBook",
    ],
  },
  {
    sources: [path.join(LIB, "viewer-mode.js")],
    target: "00-viewer-mode.js",
    globalName: "viewerMode",
    header:
      "Generated from scripts/lib/viewer-mode.js — run npm run bundle-viewer",
    exports: [
      "resolveServeEnabled",
      "shouldShowBookOrderButton",
      "shouldShowShowHiddenToggle",
      "shouldShowHiddenStatFilter",
      "shouldRenderCardEditButton",
      "shouldRenderDetailEditButton",
      "serveOnlyUiVisibility",
      "buildUiVisibility",
      "serveUiVisibility",
    ],
  },
  {
    sources: [path.join(LIB, "viewer-user-state.js")],
    target: "00-viewer-user-state.js",
    globalName: "viewerUserState",
    header:
      "Generated from scripts/lib/viewer-user-state.js — run npm run bundle-viewer",
    exports: [
      "USER_STATE_KEY",
      "USER_STATE_VERSION",
      "LEGACY_KEYS",
      "defaultUserState",
      "emptyCollectionSlot",
      "normalizeCollections",
      "normalizeCollectionSlot",
      "activeCollectionSlot",
      "localCollectionSlotFromPersisted",
      "buildEmptyGistConnectState",
      "adoptRemoteGistState",
      "normalizeIdArray",
      "normalizeStorageMode",
      "migrateFromLegacy",
      "migrateV1ToV2",
      "parseUserState",
      "buildUserStateFromRuntime",
      "applyUserStateToRuntime",
      "serializeUserState",
    ],
  },
  {
    sources: [path.join(LIB, "viewer-gist-sync.js")],
    target: "00-viewer-gist-sync.js",
    globalName: "viewerGistSync",
    header:
      "Generated from scripts/lib/viewer-gist-sync.js — run npm run bundle-viewer",
    exports: [
      "GIST_SYNC_KEY",
      "GIST_STATE_FILENAME",
      "GITHUB_API",
      "parseGistSyncConfig",
      "serializeGistSyncConfig",
      "isConnectedGistConfig",
      "mergeUserStateByUpdatedAt",
      "mergeGistUserState",
      "extractStateJsonFromGistResponse",
      "findArkhamGistId",
      "buildGistCreatePayload",
      "buildGistUpdatePayload",
    ],
  },
  {
    sources: [path.join(LIB, "viewer-collection-import.js")],
    target: "00-viewer-collection-import.js",
    globalName: "viewerCollectionImport",
    header:
      "Generated from scripts/lib/viewer-collection-import.js — run npm run bundle-viewer",
    exports: [
      "parseCollectionCsv",
      "matchCollectionImportRows",
      "matchBookIdForRow",
    ],
  },
  {
    sources: [path.join(LIB, "viewer-covers.js")],
    target: "00-viewer-covers.js",
    globalName: "viewerCovers",
    header:
      "Generated from scripts/lib/viewer-covers.js — run npm run bundle-viewer",
    exports: ["appendCoverCacheKey", "getCoverPath"],
  },
  {
    sources: [path.join(LIB, "cover-list-crop.js")],
    target: "00-viewer-list-crop.js",
    globalName: "viewerListCrop",
    header:
      "Generated from scripts/lib/cover-list-crop.js — run npm run bundle-viewer",
    transformBody(body) {
      let next = body;
      next = next.replace(
        /const \{ findCoverMasterPath \} = require\("\.\/covers-files"\);\n/,
        "",
      );
      next = next.replace(
        /const \{ coverSourceKey \} = require\("\.\/covers-shared"\);\n/,
        "",
      );
      next = next.replace(
        /function getEditForBook[\s\S]*?\n}\n\nfunction buildListFocalByMaster[\s\S]*?\n}\n\n/,
        "",
      );
      next = next.replace(
        /function parseListCoverFocusField[\s\S]*?\n}\n\nfunction parseListCoverFocusPatch[\s\S]*?\n}\n\n/,
        "",
      );
      next = next.replace(
        /function applyListCoverFocusPatch[\s\S]*?\n}\n\n/,
        "",
      );
      return next;
    },
    exports: [
      "LIST_WIDTH",
      "LIST_HEIGHT",
      "LIST_FOCAL_X",
      "LIST_FOCAL_Y",
      "isDefaultListCoverFocus",
      "resolveListCoverFocus",
      "getListCoverImagePresentation",
      "getListCoverCacheKey",
      "computeListCoverCrop",
      "computeListCoverPreviewLayout",
    ],
  },
  {
    sources: [path.join(LIB, "tag-normalize.js")],
    target: "00-viewer-tags.js",
    globalName: "viewerTags",
    header:
      "Generated from scripts/lib/tag-normalize.js — run npm run bundle-viewer",
    exports: [
      "tagKey",
      "normalizeTag",
      "formatTagLabel",
      "collectAllKnownTags",
      "collectTagsFromBooks",
    ],
  },
];

module.exports = { VIEWER_SYNC_ENTRIES };
