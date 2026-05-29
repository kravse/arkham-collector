const cheerio = require("cheerio");
const { WIKI_BASE } = require("../config");
const { normalizeLabel, cellText } = require("./text");

function infoboxRowValue($, infobox, labelPattern) {
  let value = null;
  infobox.find("tr").each((_, row) => {
    const label = cellText($, $(row).find("th.infobox-label").first());
    if (labelPattern.test(label)) {
      value = cellText($, $(row).find("td.infobox-data").first());
    }
  });
  return value || null;
}

function parseCoverArtistFromCaption(caption) {
  const match = caption.match(
    /(?:dust\s*jacket\s*(?:illustration|art(?:work)?|design)\s*by|cover\s*(?:art(?:work)?|by))\s+(.+?)\.?$/i,
  );
  return match ? normalizeLabel(match[1]) : null;
}

function normalizeWikimediaImageUrl(url) {
  if (!url) {
    return null;
  }

  let normalized = url;
  if (normalized.startsWith("//")) {
    normalized = `https:${normalized}`;
  }

  normalized = normalized.split("?")[0];

  const thumbMatch = normalized.match(
    /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+\/)thumb\/(.+\/)(?:\d+px-)?[^/]+$/,
  );
  if (thumbMatch) {
    normalized = `${thumbMatch[1]}${thumbMatch[2].replace(/\/$/, "")}`;
  }

  return normalized;
}

function resolveImageUrl(src, srcset) {
  if (srcset) {
    const parts = srcset
      .split(",")
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean);
    const best = parts[parts.length - 1];
    if (best && !best.includes("_files/")) {
      src = best;
    }
  }

  if (!src || src.includes("_files/")) {
    return null;
  }

  if (src.startsWith("//")) {
    return normalizeWikimediaImageUrl(`https:${src}`);
  }
  if (src.startsWith("http")) {
    return normalizeWikimediaImageUrl(src);
  }
  if (src.startsWith("/")) {
    return normalizeWikimediaImageUrl(`${WIKI_BASE}${src}`);
  }
  return normalizeWikimediaImageUrl(src);
}

function parseBookPage(html, options = {}) {
  const { allowOgImage = true } = options;
  const $ = cheerio.load(html);
  const infobox =
    $("table.infobox.ib-book").first().length > 0
      ? $("table.infobox.ib-book").first()
      : $("table.infobox").first();

  let title = normalizeLabel($("#firstHeading").text()) || null;
  let author = null;
  let coverArtist = null;
  let publicationDate = null;
  let coverImageUrl = null;

  if (infobox.length) {
    const infoboxTitle = normalizeLabel(
      infobox
        .find(".infobox-title")
        .first()
        .clone()
        .children("span")
        .remove()
        .end()
        .text(),
    );
    if (infoboxTitle) {
      title = infoboxTitle;
    }

    author = infoboxRowValue($, infobox, /^Author$/);
    if (!author) {
      author = infoboxRowValue($, infobox, /^Editor$/);
    }
    coverArtist = infoboxRowValue($, infobox, /^Cover artist$/);
    publicationDate = infoboxRowValue($, infobox, /^Publication date$/);

    const imageCell = infobox.find(".infobox-image").first();
    const img = imageCell.find("img").first();
    coverImageUrl = resolveImageUrl(img.attr("src"), img.attr("srcset"));

    if (!coverArtist) {
      coverArtist = parseCoverArtistFromCaption(
        cellText($, imageCell.find(".infobox-caption").first()),
      );
    }
  }

  if (!coverImageUrl && allowOgImage) {
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage && ogImage.includes("upload.wikimedia.org")) {
      coverImageUrl = normalizeWikimediaImageUrl(ogImage);
    }
  }

  return {
    title,
    author,
    coverArtist,
    publicationDate,
    coverImageUrl,
  };
}

module.exports = {
  infoboxRowValue,
  parseCoverArtistFromCaption,
  normalizeWikimediaImageUrl,
  resolveImageUrl,
  parseBookPage,
};
