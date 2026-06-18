const fs = require("fs");
const path = require("path");
const { ROOT, COVERS_DIR, USER_AGENT } = require("../config");
const { state } = require("../state");
const { slugify, titlesMatch, parseYear } = require("./text");
const { wikiTitleFromHref } = require("./wiki-urls");
const { throttle } = require("./http");

function expectedCoverPaths(book) {
  const wikiTitle = wikiTitleFromHref(book.wikipediaUrl);
  const rawTitle = wikiTitle || book.listTitle || book.title;
  const id = book.id;
  if (!rawTitle || !id) {
    return [];
  }
  const slugBase = slugify(rawTitle);
  if (!slugBase) {
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
      if (!name.includes(idSuffix)) {
        continue;
      }
      if (name.endsWith(".card.webp") || name.endsWith(".detail.webp")) {
        continue;
      }
      return `covers/${name}`.replace(/\\/g, "/");
    }
  }

  return null;
}

function isCoverDerivativePath(relativePath) {
  return (
    typeof relativePath === "string" &&
    (relativePath.endsWith(".card.webp") || relativePath.endsWith(".detail.webp"))
  );
}

function findCoverMasterPath(book, books) {
  if (book.coverImageFile && !isCoverDerivativePath(book.coverImageFile)) {
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
      if (!name.includes(idSuffix)) {
        continue;
      }
      if (name.endsWith(".card.webp") || name.endsWith(".detail.webp")) {
        continue;
      }
      return `covers/${name}`.replace(/\\/g, "/");
    }
  }

  if (Array.isArray(books)) {
    for (const other of books) {
      if (other.id === book.id || !booksMatchTitleAndYear(book, other)) {
        continue;
      }
      const siblingCover = findCoverMasterPath(other, null);
      if (siblingCover) {
        return siblingCover;
      }
    }
  }

  return null;
}

function collectCoverMasterPaths(books) {
  const files = new Set();
  for (const book of books) {
    const resolved = findCoverMasterPath(book, books);
    if (resolved) {
      files.add(resolved);
    }
  }
  return files;
}

function booksMatchTitleAndYear(a, b) {
  const yearA = parseYear(a.publicationDate || a.listYear);
  const yearB = parseYear(b.publicationDate || b.listYear);
  if (!yearA || !yearB || yearA !== yearB) {
    return false;
  }

  const titlesA = [a.title, a.listTitle].filter(Boolean);
  const titlesB = [b.title, b.listTitle].filter(Boolean);
  if (!titlesA.length || !titlesB.length) {
    return false;
  }

  return titlesA.some((left) =>
    titlesB.some((right) => titlesMatch(left, right)),
  );
}

function findLocalCoverForBook(book, books) {
  const direct = findLocalCoverFile(book);
  if (direct) {
    return direct;
  }

  if (!Array.isArray(books)) {
    return null;
  }

  for (const other of books) {
    if (other.id === book.id || !booksMatchTitleAndYear(book, other)) {
      continue;
    }
    const siblingCover = findLocalCoverFile(other);
    if (siblingCover) {
      return siblingCover;
    }
  }

  return null;
}

function resolveCoverPathsInBooks(books) {
  return books.map((book) => {
    const resolved = findLocalCoverForBook(book, books);
    if (resolved) {
      if (resolved !== book.coverImageFile) {
        return { ...book, coverImageFile: resolved };
      }
      return book;
    }

    if (book.coverImageFile) {
      const filePath = path.join(ROOT, book.coverImageFile);
      if (!fs.existsSync(filePath)) {
        return { ...book, coverImageFile: null };
      }
    }

    return book;
  });
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

function reconcileCoverFiles(books, editsById) {
  return books.map((book) => {
    if (editsById) {
      const edit =
        editsById[String(book.id)] || editsById[book.id] || null;
      if (edit?.coverImageFile) {
        return book;
      }
    }

    const localCover = findLocalCoverForBook(book, books);
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
  isCoverDerivativePath,
  findCoverMasterPath,
  collectCoverMasterPaths,
  booksMatchTitleAndYear,
  findLocalCoverForBook,
  resolveCoverPathsInBooks,
  bookHasLocalCover,
  preserveCoverFields,
  reconcileCoverFiles,
  extensionFromUrl,
  downloadCover,
  bookHasCover,
};
