const fs = require("fs");
const path = require("path");
const { ROOT, COVERS_DIR, USER_AGENT } = require("../config");
const { state } = require("../state");
const { slugify } = require("./text");
const { wikiTitleFromHref } = require("./wiki-urls");
const { throttle } = require("./http");

function expectedCoverPaths(book) {
  const wikiTitle = wikiTitleFromHref(book.wikipediaUrl);
  const slugBase = slugify(wikiTitle || book.listTitle || book.title);
  const id = book.id;
  if (!slugBase || !id) {
    return [];
  }
  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].map((ext) =>
    path.join("covers", `${slugBase}-${id}${ext}`),
  );
}

function findLocalCoverFile(book) {
  if (book.coverImageFile) {
    const filePath = path.join(ROOT, book.coverImageFile);
    if (fs.existsSync(filePath)) {
      return book.coverImageFile.replace(/\\/g, "/");
    }
  }

  for (const relativePath of expectedCoverPaths(book)) {
    if (fs.existsSync(path.join(ROOT, relativePath))) {
      return relativePath.replace(/\\/g, "/");
    }
  }

  if (book.id && fs.existsSync(COVERS_DIR)) {
    const idSuffix = `-${book.id}.`;
    for (const name of fs.readdirSync(COVERS_DIR)) {
      if (name.includes(idSuffix)) {
        return `covers/${name}`.replace(/\\/g, "/");
      }
    }
  }

  return null;
}

function bookHasLocalCover(book) {
  return Boolean(findLocalCoverFile(book));
}

function preserveCoverFields(existing, incoming) {
  const localCover = findLocalCoverFile(existing);
  if (localCover) {
    return {
      coverImageFile: localCover,
      coverImageUrl: existing.coverImageUrl ?? incoming.coverImageUrl ?? null,
    };
  }

  return {
    coverImageFile: existing.coverImageFile || incoming.coverImageFile,
    coverImageUrl: existing.coverImageUrl || incoming.coverImageUrl,
  };
}

function reconcileCoverFiles(books) {
  return books.map((book) => {
    const localCover = findLocalCoverFile(book);
    if (!localCover) {
      return book;
    }

    if (book.coverImageFile === localCover) {
      return book;
    }

    return {
      ...book,
      coverImageFile: localCover,
    };
  });
}

function extensionFromUrl(url) {
  const pathname = new URL(url).pathname;
  const ext = path.extname(pathname).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
    return ext === ".jpeg" ? ".jpg" : ext;
  }
  return ".jpg";
}

async function downloadCover(url, slug) {
  if (!url) {
    return null;
  }

  if (state.coverDownloadCache.has(url)) {
    return state.coverDownloadCache.get(url);
  }

  const ext = extensionFromUrl(url);
  const filename = `${slug}${ext}`;
  const filePath = path.join(COVERS_DIR, filename);
  const relativePath = path.join("covers", filename);

  if (fs.existsSync(filePath)) {
    state.coverDownloadCache.set(url, relativePath);
    return relativePath;
  }

  await throttle();
  state.requestCount += 1;

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Cover download failed: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  state.coverDownloadCache.set(url, relativePath);
  return relativePath;
}

function bookHasCover(book) {
  if (bookHasLocalCover(book)) {
    return true;
  }

  return Boolean(book.coverImageUrl);
}

module.exports = {
  expectedCoverPaths,
  findLocalCoverFile,
  bookHasLocalCover,
  preserveCoverFields,
  reconcileCoverFiles,
  extensionFromUrl,
  downloadCover,
  bookHasCover,
};
