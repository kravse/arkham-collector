const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  escapeHtml,
  getDisplayAuthor,
  getGoodreadsSearchUrl,
  renderWikiButton,
  renderGoodreadsButton,
  renderImprintBadge,
} = require("../scripts/lib/viewer-card-html");

test("escapeHtml escapes markup characters", () => {
  assert.equal(escapeHtml(`Tom "Bad" & <Co>`), "Tom &quot;Bad&quot; &amp; &lt;Co&gt;");
});

test("getDisplayAuthor prefers book.author", () => {
  assert.equal(getDisplayAuthor({ author: "H. P. Lovecraft" }), "H. P. Lovecraft");
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
