const { test } = require("node:test");
const assert = require("node:assert/strict");

global.viewerPersonNames = require("../scripts/lib/viewer-person-names");

const {
  escapeHtml,
  getDisplayAuthor,
  getGoodreadsSearchUrl,
  renderWikiButton,
  renderGoodreadsButton,
  renderImprintBadge,
  renderBookMetaHtml,
  renderBookDetailMetaHtml,
} = require("../scripts/lib/viewer-card-html");

test("escapeHtml escapes markup characters", () => {
  assert.equal(escapeHtml(`Tom "Bad" & <Co>`), "Tom &quot;Bad&quot; &amp; &lt;Co&gt;");
});

test("getDisplayAuthor prefers parsed primary author", () => {
  assert.equal(getDisplayAuthor({ author: "H. P. Lovecraft" }), "H. P. Lovecraft");
  assert.equal(
    getDisplayAuthor({
      author: "August Derleth (inspired by fragments by H.P. Lovecraft)",
    }),
    "August Derleth",
  );
});

test("renderBookMetaHtml shows parsed author and cover lists", () => {
  const html = renderBookMetaHtml({
    coverArtist: "Ronald Rich, Virgil Finlay and Gary Gore",
    author: "H. P. Lovecraft and Robert Weinberg",
  });
  assert.match(html, /Lovecraft, Robert Weinberg/);
  assert.match(html, /Ronald Rich, Virgil Finlay, Gary Gore/);
});

test("renderBookDetailMetaHtml emits one chip per parsed person", () => {
  const html = renderBookDetailMetaHtml({
    coverArtist: "James Dietrich, design by Gary Gore",
    author: "August Derleth (inspired by fragments by H.P. Lovecraft)",
  });
  assert.match(html, />August Derleth</);
  assert.match(html, />James Dietrich</);
  assert.doesNotMatch(html, /Gary Gore/);
  assert.doesNotMatch(html, /inspired by/);
});

test("renderBookDetailMetaHtml shows collective author credits as plain suffix text", () => {
  const diversHands = renderBookDetailMetaHtml({
    author: "H. P. Lovecraft & Divers Hands",
  });
  assert.match(diversHands, />H\. P\. Lovecraft</);
  assert.match(diversHands, /book-detail-author-suffix.*and divers hands/);
  assert.doesNotMatch(diversHands, />Divers Hands</);
  assert.doesNotMatch(diversHands, />divers hands</);

  const others = renderBookDetailMetaHtml({
    author: "H. P. Lovecraft and others",
  });
  assert.match(others, /book-detail-author-suffix.*and others/);
  assert.doesNotMatch(others, />others</i);
});

test("renderBookMetaHtml includes collective author credits in plain text", () => {
  const html = renderBookMetaHtml({ author: "H. P. Lovecraft and others" });
  assert.match(html, /H\. P\. Lovecraft and others/);
});

test("getGoodreadsSearchUrl builds search url from title and author", () => {
  const url = getGoodreadsSearchUrl({
    title: "The Outsider",
    author: "H. P. Lovecraft",
  });
  assert.match(url, /^https:\/\/www\.goodreads\.com\/search\?/);
  assert.match(url, /The\+Outsider/);
});

test("renderWikiButton returns empty string without url", () => {
  assert.equal(renderWikiButton(""), "");
});

test("renderGoodreadsButton marks search links", () => {
  const html = renderGoodreadsButton({
    url: "https://www.goodreads.com/search?q=test",
    search: true,
  });
  assert.match(html, /card-goodreads-btn--search/);
});

test("renderImprintBadge uses MM for Mycroft imprint", () => {
  assert.match(
    renderImprintBadge({ imprint: "mycroft_moran" }),
    /imprint-badge--mm/,
  );
});
