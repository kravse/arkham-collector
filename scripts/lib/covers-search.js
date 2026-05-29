const { WIKI_API, IMPRINTS } = require("../config");
const { normalizeForMatch, titlesMatch, parseYear } = require("./text");
const { wikiTitleFromHref, wikiUrlFromTitle } = require("./wiki-urls");
const { fetchWithRetry } = require("./http");
const { normalizeWikimediaImageUrl } = require("./wiki-book-page");
const { getBookMetadata } = require("./books");

const WIKI_IMAGE_SKIP =
  /(?:\.svg$|commons-logo|ambox|edit-clear|question_book|wikimedia|open book|icon|logo|flag|map)/i;

function publisherNameForImprint(imprint) {
  return (
    IMPRINTS[imprint]?.openLibraryPublisher ||
    IMPRINTS.arkham_house.openLibraryPublisher
  );
}

async function fetchWikipediaFileUrl(fileTitle) {
  const params = new URLSearchParams({
    action: "query",
    titles: fileTitle,
    prop: "imageinfo",
    iiprop: "url",
    format: "json",
  });
  const json = await fetchWithRetry(`${WIKI_API}?${params}`);
  const page = Object.values(json.query.pages)[0];
  return page?.imageinfo?.[0]?.url || null;
}

function scoreWikiImageFile(fileTitle, book) {
  const file = normalizeForMatch(fileTitle.replace(/^file:/i, ""));
  if (WIKI_IMAGE_SKIP.test(fileTitle) || /\blogo\b/.test(file)) {
    return -1;
  }

  const bookNorm = normalizeForMatch(book.title);
  const words = bookNorm.split(/\s+/).filter((word) => word.length > 3);
  let score = 0;

  for (const word of words) {
    if (file.includes(word)) {
      score += 3;
    }
  }

  if (/collector/.test(bookNorm) && /collector/.test(file)) {
    score += 5;
  }
  if (/sampler/.test(bookNorm) && /sampler/.test(file)) {
    score += 5;
  }
  if (/cover|dust|jacket|edition/.test(file)) {
    score += 2;
  }

  return score;
}

async function pickBestWikipediaArticleImage(pageTitle, book, minScore = 1) {
  const params = new URLSearchParams({
    action: "query",
    titles: pageTitle,
    prop: "images",
    imlimit: "50",
    format: "json",
  });
  const json = await fetchWithRetry(`${WIKI_API}?${params}`);
  const page = Object.values(json.query.pages)[0];
  if (!page?.images?.length) {
    return null;
  }

  const candidates = [];

  for (const image of page.images) {
    const fileTitle = image.title;
    const score = scoreWikiImageFile(fileTitle, book);
    if (score < minScore) {
      continue;
    }

    const url = await fetchWikipediaFileUrl(fileTitle);
    if (url) {
      candidates.push({
        score,
        coverImageUrl: normalizeWikimediaImageUrl(url),
        fileTitle,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

async function searchWikipediaTitle(book) {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: [
      book.title,
      book.publicationDate,
      publisherNameForImprint(book.imprint),
    ]
      .filter(Boolean)
      .join(" "),
    srlimit: "8",
    format: "json",
  });
  const json = await fetchWithRetry(`${WIKI_API}?${params}`);
  const results = json.query?.search || [];

  for (const result of results) {
    if (
      titlesMatch(result.title, book.title) ||
      titlesMatch(result.title, book.listTitle)
    ) {
      return result.title;
    }
  }

  return null;
}

function scoreOpenLibraryMatch(doc, book) {
  if (!doc.cover_i) {
    return -1;
  }

  let score = 0;
  const docTitle = doc.title || "";
  if (
    titlesMatch(docTitle, book.title) ||
    titlesMatch(docTitle, book.listTitle)
  ) {
    score += 10;
  } else if (
    normalizeForMatch(docTitle).includes(
      normalizeForMatch(book.title).slice(0, 12),
    )
  ) {
    score += 4;
  } else {
    return -1;
  }

  const bookYear = parseYear(book.publicationDate || book.listYear);
  if (bookYear && String(doc.first_publish_year) === bookYear) {
    score += 5;
  }

  const publisherPattern = new RegExp(
    publisherNameForImprint(book.imprint).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    ),
    "i",
  );
  if (
    Array.isArray(doc.publisher) &&
    doc.publisher.some((p) => publisherPattern.test(p))
  ) {
    score += 3;
  }

  return score;
}

async function searchOpenLibraryCover(book) {
  const year = parseYear(book.publicationDate);
  const queries = [
    { title: book.title, year },
    { title: book.listTitle, year },
  ];

  if (book.author) {
    queries.push({ title: book.title, year, author: book.author });
  }

  let best = null;

  for (const query of queries) {
    const params = new URLSearchParams({
      title: query.title,
      limit: "8",
    });
    if (query.year) {
      params.set("first_publish_year", query.year);
    }
    if (query.author) {
      params.set("author", query.author);
    }

    const json = await fetchWithRetry(
      `https://openlibrary.org/search.json?${params}`,
    );
    for (const doc of json.docs || []) {
      const score = scoreOpenLibraryMatch(doc, book);
      if (score > (best?.score || 0)) {
        best = {
          score,
          coverImageUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
          source: "openlibrary",
          matchedTitle: doc.title,
        };
      }
    }
  }

  return best;
}

async function findCoverForBook(book) {
  const wikipediaTitle = wikiTitleFromHref(book.wikipediaUrl);
  const attempts = [];

  if (wikipediaTitle) {
    try {
      const pageData = await getBookMetadata(wikipediaTitle, {
        allowOgImage: true,
      });
      if (pageData.coverImageUrl) {
        return {
          coverImageUrl: pageData.coverImageUrl,
          source: "wikipedia-infobox",
          wikipediaTitle,
        };
      }
      attempts.push("infobox empty");
    } catch (error) {
      attempts.push(`infobox: ${error.message}`);
    }

    try {
      const image = await pickBestWikipediaArticleImage(
        wikipediaTitle,
        book,
        1,
      );
      if (image) {
        return {
          coverImageUrl: image.coverImageUrl,
          source: "wikipedia-article-image",
          wikipediaTitle,
        };
      }
      attempts.push("no matching article images");
    } catch (error) {
      attempts.push(`article images: ${error.message}`);
    }
  }

  try {
    const openLibrary = await searchOpenLibraryCover(book);
    if (openLibrary) {
      return openLibrary;
    }
    attempts.push("no open library match");
  } catch (error) {
    attempts.push(`open library: ${error.message}`);
  }

  if (!wikipediaTitle) {
    try {
      const foundTitle = await searchWikipediaTitle(book);
      if (foundTitle) {
        const pageData = await getBookMetadata(foundTitle, {
          allowOgImage: false,
        });
        if (pageData.coverImageUrl) {
          return {
            coverImageUrl: pageData.coverImageUrl,
            source: "wikipedia-search-infobox",
            wikipediaTitle: foundTitle,
            wikipediaUrl: wikiUrlFromTitle(foundTitle),
          };
        }

        const image = await pickBestWikipediaArticleImage(foundTitle, book, 3);
        if (image) {
          return {
            coverImageUrl: image.coverImageUrl,
            source: "wikipedia-search-image",
            wikipediaTitle: foundTitle,
            wikipediaUrl: wikiUrlFromTitle(foundTitle),
          };
        }
        attempts.push(`search found ${foundTitle} but no cover image`);
      } else {
        attempts.push("no wikipedia search result");
      }
    } catch (error) {
      attempts.push(`wikipedia search: ${error.message}`);
    }
  }

  return { coverImageUrl: null, attempts };
}

module.exports = {
  fetchWikipediaFileUrl,
  scoreWikiImageFile,
  pickBestWikipediaArticleImage,
  searchWikipediaTitle,
  publisherNameForImprint,
  scoreOpenLibraryMatch,
  searchOpenLibraryCover,
  findCoverForBook,
};
