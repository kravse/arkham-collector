const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const COVERS_DIR = path.join(ROOT, "covers");
const EXAMPLES_DIR = path.join(ROOT, "examples");
const ARKHAM_LOCAL = path.join(EXAMPLES_DIR, "Arkham House - Wikipedia.html");
const MYCROFT_LOCAL = path.join(
  EXAMPLES_DIR,
  "Mycroft & Moran - Wikipedia.html",
);
const SAMPLE_BOOK_LOCAL = path.join(
  EXAMPLES_DIR,
  "The Dark Brotherhood and Other Pieces - Wikipedia.html",
);

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const WIKI_BASE = "https://en.wikipedia.org";
const SOURCE_URL = `${WIKI_BASE}/wiki/Arkham_House`;

const IMPRINTS = {
  arkham_house: {
    wikiPage: "Arkham_House",
    sectionId: "Bibliography_of_works_published_by_Arkham_House",
    localFile: "Arkham House - Wikipedia.html",
    sourceUrl: `${WIKI_BASE}/wiki/Arkham_House`,
    openLibraryPublisher: "Arkham House",
  },
  mycroft_moran: {
    wikiPage: "Mycroft_&_Moran",
    sectionId: "Works_published_by_Mycroft_&_Moran",
    localFile: "Mycroft & Moran - Wikipedia.html",
    sourceUrl: `${WIKI_BASE}/wiki/Mycroft_%26_Moran`,
    openLibraryPublisher: "Mycroft & Moran",
  },
};
const USER_AGENT =
  "ArkhamCoverCrawler/1.0 (personal project; https://github.com/)";

module.exports = {
  ROOT,
  DATA_DIR,
  COVERS_DIR,
  EXAMPLES_DIR,
  ARKHAM_LOCAL,
  MYCROFT_LOCAL,
  SAMPLE_BOOK_LOCAL,
  WIKI_API,
  WIKI_BASE,
  SOURCE_URL,
  IMPRINTS,
  USER_AGENT,
};
