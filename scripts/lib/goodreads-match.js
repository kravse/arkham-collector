const { IMPRINTS } = require("../config");
const { normalizeForMatch, titlesMatch, parseYear } = require("./text");
const {
  searchWorks,
  workIdFromDocKey,
  fetchEditions,
} = require("./open-library");

const MATCH_THRESHOLD = 12;
const GOODREADS_SHOW_BASE = "https://www.goodreads.com/book/show/";

function goodreadsUrlFromId(id) {
  const trimmed = String(id || "").trim();
  if (!trimmed) {
    return null;
  }
  return `${GOODREADS_SHOW_BASE}${trimmed}`;
}

function imprintPublisherPattern(imprint) {
  const key = imprint || "arkham_house";
  const label = IMPRINTS[key]?.openLibraryPublisher || "Arkham House";
  if (/mycroft/i.test(label)) {
    return /mycroft|moran/i;
  }
  return /arkham/i;
}

function targetYear(book) {
  return parseYear(book.listYear) || parseYear(book.publicationDate);
}

function scoreEdition(book, edition) {
  const goodreadsId = edition.identifiers?.goodreads?.[0];
  if (!goodreadsId) {
    return null;
  }

  let score = 0;
  const publishers = (edition.publishers || []).join(" ");
  const publisherPattern = imprintPublisherPattern(book.imprint);

  if (publisherPattern.test(publishers)) {
    score += 10;
  }

  const year = targetYear(book);
  const editionYear = parseYear(edition.publish_date);
  if (year && editionYear) {
    const delta = Math.abs(Number(year) - Number(editionYear));
    if (delta === 0) {
      score += 8;
    } else if (delta <= 2) {
      score += 5;
    } else if (delta <= 5) {
      score += 2;
    }
  } else if (year && !editionYear) {
    score += 1;
  }

  const editionTitle = edition.title || "";
  if (titlesMatch(book.title, editionTitle) || titlesMatch(book.listTitle, editionTitle)) {
    score += 6;
  } else {
    const left = normalizeForMatch(book.title || book.listTitle);
    const right = normalizeForMatch(editionTitle);
    if (left && right && (left.includes(right) || right.includes(left))) {
      score += 3;
    }
  }

  return { score, goodreadsId, edition };
}

function pickBestFromEditions(book, editions) {
  let best = null;

  for (const edition of editions) {
    const candidate = scoreEdition(book, edition);
    if (!candidate) {
      continue;
    }
    if (!best || candidate.score > best.score) {
      best = candidate;
    }
  }

  if (!best || best.score < MATCH_THRESHOLD) {
    return null;
  }

  return {
    url: goodreadsUrlFromId(best.goodreadsId),
    score: best.score,
    editionTitle: best.edition.title,
    publishers: (best.edition.publishers || []).join(", "),
    publishDate: best.edition.publish_date,
  };
}

async function collectEditionsForDocs(docs) {
  const editions = [];
  const seenWorks = new Set();

  for (const doc of docs) {
    const workId = workIdFromDocKey(doc.key);
    if (!workId || seenWorks.has(workId)) {
      continue;
    }
    seenWorks.add(workId);
    const entries = await fetchEditions(workId);
    editions.push(...entries);
  }

  return editions;
}

async function findGoodreadsUrlForBook(book) {
  const title = book.title || book.listTitle;
  if (!title) {
    return null;
  }

  const author = book.author || null;
  const imprintPublisher =
    IMPRINTS[book.imprint || "arkham_house"]?.openLibraryPublisher || "Arkham House";

  const searchPasses = [
    { title, author, publisher: null },
    { title, author: null, publisher: imprintPublisher },
    { title, author, publisher: "Arkham House" },
  ];

  for (const query of searchPasses) {
    const docs = await searchWorks({ ...query, limit: 6 });
    const editions = await collectEditionsForDocs(docs);
    const match = pickBestFromEditions(book, editions);
    if (match) {
      return match;
    }
  }

  return null;
}

module.exports = {
  MATCH_THRESHOLD,
  GOODREADS_SHOW_BASE,
  goodreadsUrlFromId,
  findGoodreadsUrlForBook,
  pickBestFromEditions,
  scoreEdition,
};
