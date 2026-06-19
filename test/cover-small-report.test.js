const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  MIN_MASTER_EDGE,
  parseCoverBookId,
  isObviouslyTooSmall,
  buildGoogleCoverSearchUrl,
  buildEbayCoverSearchUrl,
  titleFromCoverSlug,
  findBookByCoverPath,
  resolveBookForCoverFile,
  renderSmallCoverReportHtml,
} = require("../scripts/lib/cover-small-report");

test("parseCoverBookId reads trailing book id from cover filename", () => {
  assert.equal(parseCoverBookId("the-shunned-house-238.jpg"), 238);
  assert.equal(parseCoverBookId("misc.jpg"), null);
});

test("isObviouslyTooSmall compares longest edge to minimum", () => {
  assert.equal(isObviouslyTooSmall({ width: 300, height: 450 }, 480), true);
  assert.equal(isObviouslyTooSmall({ width: 480, height: 720 }, 480), false);
  assert.equal(isObviouslyTooSmall({ width: 300, height: 300 }, MIN_MASTER_EDGE), true);
});

test("buildGoogleCoverSearchUrl opens Google Image Search with title and arkham", () => {
  const url = buildGoogleCoverSearchUrl("The Shunned House");
  assert.match(url, /^https:\/\/www\.google\.com\/search\?tbm=isch&q=/);
  assert.match(decodeURIComponent(url), /The Shunned House arkham/);
});

test("buildEbayCoverSearchUrl opens eBay search with title and arkham", () => {
  const url = buildEbayCoverSearchUrl("The Shunned House");
  assert.match(url, /^https:\/\/www\.ebay\.com\/sch\/i\.html\?_nkw=/);
  assert.match(decodeURIComponent(url), /The Shunned House arkham/);
});

test("findBookByCoverPath matches catalog book when filename id differs after dedupe", () => {
  const books = [
    {
      id: 291,
      title: "The Black Book of Clark Ashton Smith",
      coverImageFile: "covers/the-black-book-of-clark-ashton-smith-61.jpg",
    },
  ];
  const book = findBookByCoverPath(
    "covers/the-black-book-of-clark-ashton-smith-61.jpg",
    books,
  );
  assert.equal(book?.id, 291);
});

test("resolveBookForCoverFile uses catalog id for cover path match", () => {
  const books = [
    {
      id: 291,
      title: "The Black Book of Clark Ashton Smith",
      coverImageFile: "covers/the-black-book-of-clark-ashton-smith-61.jpg",
      hidden: false,
      deleted: false,
    },
    {
      id: 238,
      title: "The Shunned House",
      hidden: true,
      deleted: false,
    },
    {
      id: 999,
      title: "Removed Book",
      hidden: false,
      deleted: true,
    },
  ];
  const blackBook = resolveBookForCoverFile(
    "the-black-book-of-clark-ashton-smith-61.jpg",
    books,
  );
  assert.equal(blackBook.bookId, 291);
  assert.equal(blackBook.title, "The Black Book of Clark Ashton Smith");

  const hidden = resolveBookForCoverFile("the-shunned-house-238.jpg", books);
  assert.equal(hidden.bookId, 238);
  assert.equal(hidden.hidden, true);
  assert.equal(hidden.deleted, false);

  const deleted = resolveBookForCoverFile("orphaned-cover-88888.jpg", books);
  assert.equal(deleted.bookId, null);
});

test("titleFromCoverSlug builds readable fallback title", () => {
  assert.equal(
    titleFromCoverSlug("the-shunned-house-238.jpg"),
    "The Shunned House",
  );
});

test("renderSmallCoverReportHtml includes image, details, and search link", () => {
  const html = renderSmallCoverReportHtml([
    {
      filename: "the-shunned-house-238.jpg",
      relativePath: "covers/the-shunned-house-238.jpg",
      width: 320,
      height: 480,
      longestEdge: 480,
      bookId: 238,
      title: "The Shunned House",
      hidden: false,
      deleted: false,
      searchUrl: buildGoogleCoverSearchUrl("The Shunned House"),
      ebayUrl: buildEbayCoverSearchUrl("The Shunned House"),
    },
  ]);

  assert.match(html, /src="\.\.\/covers\/the-shunned-house-238\.jpg"/);
  assert.match(html, /The Shunned House/);
  assert.match(html, /Search images/);
  assert.match(html, /Search eBay/);
  assert.match(html, /Upload cover/);
  assert.match(html, /id="report-refresh"/);
  assert.match(html, /id="hide-hidden-books"/);
  assert.match(html, /Hide hidden and deleted books/);
  assert.match(html, /data-deleted="false"/);
  assert.match(html, /tbm=isch/);
  assert.match(html, /ebay\.com\/sch\/i\.html/);
});
