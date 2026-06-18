const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  extensionFromMime,
  coverSlugForBook,
  saveBookCoverUpload,
} = require("../scripts/lib/cover-upload");
const { loadEdits } = require("../scripts/lib/edits");

test("extensionFromMime maps common image types", () => {
  assert.equal(extensionFromMime("image/jpeg"), ".jpg");
  assert.equal(extensionFromMime("image/png"), ".png");
  assert.equal(extensionFromMime("image/webp"), ".webp");
});

test("coverSlugForBook slugifies wikipedia title", () => {
  assert.equal(
    coverSlugForBook({
      title: "The Dunwich Horror",
      wikipediaUrl: "https://en.wikipedia.org/wiki/The_Dunwich_Horror_and_Others",
    }),
    "the-dunwich-horror-and-others",
  );
});

test("saveBookCoverUpload writes cover file and edits entry", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "arkham-cover-upload-"));
  const dataDir = path.join(tempRoot, "data");
  const coversDir = path.join(tempRoot, "covers");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(coversDir, { recursive: true });

  const booksJsonPath = path.join(dataDir, "books.json");
  fs.writeFileSync(
    booksJsonPath,
    `${JSON.stringify({
      books: [
        {
          id: 42,
          title: "The Dunwich Horror",
          listTitle: "The Dunwich Horror and Others",
          wikipediaUrl: "https://en.wikipedia.org/wiki/The_Dunwich_Horror_and_Others",
          coverImageFile: "covers/old-cover-42.jpg",
        },
      ],
    })}\n`,
  );
  fs.writeFileSync(path.join(dataDir, "edits.json"), '{"edits":{}}\n');
  fs.writeFileSync(path.join(tempRoot, "covers/old-cover-42.jpg"), "old");

  const config = require("../scripts/config");
  const previousDataDir = config.DATA_DIR;
  config.DATA_DIR = dataDir;
  delete require.cache[require.resolve("../scripts/lib/edits")];
  delete require.cache[require.resolve("../scripts/lib/cover-upload")];
  const { saveBookCoverUpload: saveUpload } = require("../scripts/lib/cover-upload");
  const { loadEdits: loadTempEdits } = require("../scripts/lib/edits");

  const result = saveUpload(
    42,
    {
      buffer: Buffer.from("fake-image-bytes"),
      mimetype: "image/jpeg",
    },
    { root: tempRoot, coversDir, booksJsonPath },
  );

  assert.match(result.coverImageFile, /^covers\/the-dunwich-horror-and-others-42\.jpg$/);
  assert.ok(fs.existsSync(path.join(tempRoot, result.coverImageFile)));
  assert.equal(fs.existsSync(path.join(tempRoot, "covers/old-cover-42.jpg")), false);
  assert.equal(loadTempEdits().edits["42"].coverImageFile, result.coverImageFile);

  config.DATA_DIR = previousDataDir;
  delete require.cache[require.resolve("../scripts/lib/edits")];
  delete require.cache[require.resolve("../scripts/lib/cover-upload")];
});
