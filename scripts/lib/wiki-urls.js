const { WIKI_BASE } = require("../config");

function wikiTitleFromHref(href) {
  if (!href) {
    return null;
  }
  const match = href.match(/\/wiki\/([^#?]+)/);
  if (!match) {
    return null;
  }
  return decodeURIComponent(match[1].replace(/\+/g, " "));
}

function wikiFragmentFromHref(href) {
  if (!href) {
    return null;
  }
  const hashIndex = href.indexOf("#");
  if (hashIndex === -1) {
    return null;
  }
  const fragment = href.slice(hashIndex + 1);
  return fragment ? decodeURIComponent(fragment.replace(/\+/g, " ")) : null;
}

function wikiUrlFromTitle(title) {
  return `${WIKI_BASE}/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

module.exports = {
  wikiTitleFromHref,
  wikiFragmentFromHref,
  wikiUrlFromTitle,
};
