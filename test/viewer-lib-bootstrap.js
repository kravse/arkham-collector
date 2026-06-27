global.__viewerPersonNames = require("../scripts/lib/viewer-person-names");
global.viewerPersonNames = global.__viewerPersonNames;
global.__viewerTagsForSearchFields = require("../scripts/lib/tag-normalize");
global.__viewerCardHtmlForSearchFields = require("../scripts/lib/viewer-card-html");
global.viewerSearchFields = require("../scripts/lib/viewer-search-fields");
global.viewerTags = global.__viewerTagsForSearchFields;
