const { decadeFromYear } = require("./wiki-bibliography");

const ISSUE_NUMBER_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const SAMPLER_ISSUE_RE =
  /^Volume (I|II), Number (One|Two|Three|Four): (Winter|Spring|Summer|Autumn), (\d{4})$/i;

const COLLECTOR_ISSUE_RE =
  /^Number (One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten): (Winter|Spring|Summer|Autumn), (\d{4})$/i;

function titleCaseSeason(season) {
  return season.charAt(0).toUpperCase() + season.slice(1).toLowerCase();
}

function parseArkhamSamplerIssue(listAuthor) {
  const line = String(listAuthor || "").trim();
  const match = line.match(SAMPLER_ISSUE_RE);
  if (!match) {
    return null;
  }

  const volume = match[1].toUpperCase();
  const issueNumber = ISSUE_NUMBER_WORDS[match[2].toLowerCase()];
  const season = titleCaseSeason(match[3]);
  const year = match[4];

  return {
    magazine: "sampler",
    volume,
    issueNumber,
    season,
    year,
    title: `The Arkham Sampler (Vol. ${volume}, No. ${issueNumber})`,
    publicationDate: `${season}, ${year}`,
    listAuthor: "",
    author: null,
    decade: decadeFromYear(year),
    listYear: `${year}-${volume}-${issueNumber}`,
  };
}

function parseArkhamCollectorIssue(listAuthor) {
  const line = String(listAuthor || "").trim();
  const match = line.match(COLLECTOR_ISSUE_RE);
  if (!match) {
    return null;
  }

  const issueNumber = ISSUE_NUMBER_WORDS[match[1].toLowerCase()];
  const season = titleCaseSeason(match[2]);
  const year = match[3];

  return {
    magazine: "collector",
    issueNumber,
    season,
    year,
    title: `The Arkham Collector (No. ${issueNumber})`,
    publicationDate: `${season}, ${year}`,
    listAuthor: "",
    author: null,
    decade: decadeFromYear(year),
    listYear: `${year}-${issueNumber}`,
  };
}

function parseArkhamMagazineIssue(book) {
  if (!book) {
    return null;
  }

  if (book.listTitle === "The Arkham Sampler") {
    return parseArkhamSamplerIssue(book.listAuthor);
  }

  if (book.listTitle === "The Arkham Collector") {
    return parseArkhamCollectorIssue(book.listAuthor);
  }

  return null;
}

function isArkhamMagazineIssueBook(book) {
  return parseArkhamMagazineIssue(book) != null;
}

module.exports = {
  SAMPLER_ISSUE_RE,
  COLLECTOR_ISSUE_RE,
  parseArkhamSamplerIssue,
  parseArkhamCollectorIssue,
  parseArkhamMagazineIssue,
  isArkhamMagazineIssueBook,
};
