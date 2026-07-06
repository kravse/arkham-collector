const cheerio = require("cheerio");
const fs = require("fs");
const { normalizeLabel, parseYearFromListLine } = require("./text");
const { wikiTitleFromHref, wikiUrlFromTitle } = require("./wiki-urls");

function headingText(node) {
  const h = node.find("h2, h3").first();
  return h.length ? normalizeLabel(h.text()) : normalizeLabel(node.text());
}

function isSectionStop(node) {
  const tag = node.prop("tagName")?.toLowerCase();
  if (tag === "h2") {
    return true;
  }
  if (tag === "div" && node.hasClass("mw-heading") && node.find("h2").length) {
    return true;
  }
  return false;
}

function decadeFromYear(year) {
  const value = parseInt(year, 10);
  if (!value) {
    return null;
  }
  return `${Math.floor(value / 10) * 10}s`;
}

function normalizeDecadeLabel(value) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }
  const match = text.match(/^(\d{4})s?$/i);
  if (match) {
    return decadeFromYear(match[1]);
  }
  return text;
}

function entryDecade(entry) {
  if (entry.decade) {
    return normalizeDecadeLabel(entry.decade);
  }
  return decadeFromYear(entry.listYear);
}

function collectListItems($, ul, decade, entries) {
  ul.children("li").each((_, li) => {
    const $li = $(li);
    const italic = $li.children("i").first();
    const link = italic.find("a").first();
    const listTitle = normalizeLabel(link.length ? link.text() : italic.text());
    const wikiTitle = link.length ? wikiTitleFromHref(link.attr("href")) : null;
    const fullText = normalizeLabel($li.text());
    let listAuthor = fullText.startsWith(listTitle)
      ? normalizeLabel(fullText.slice(listTitle.length))
      : fullText;
    listAuthor = listAuthor.replace(/^,\s*/, "");

    entries.push({
      decade,
      listTitle,
      listAuthor,
      wikipediaTitle: wikiTitle,
      wikipediaUrl: wikiTitle ? wikiUrlFromTitle(wikiTitle) : null,
      listYear: parseYearFromListLine(fullText),
    });

    const nested = $li.children("ul").first();
    if (nested.length) {
      collectListItems($, nested, decade, entries);
    }
  });
}

function extractBibliography(html, { sectionId }) {
  const $ = cheerio.load(html);
  const heading = $(`[id="${sectionId}"]`);
  if (!heading.length) {
    throw new Error(`Bibliography section not found: ${sectionId}`);
  }

  const entries = [];
  let decade = null;
  let node = heading.parent().next();

  while (node.length) {
    if (isSectionStop(node)) {
      break;
    }

    const tag = node.prop("tagName")?.toLowerCase();
    if (tag === "h3") {
      decade = headingText(node);
    } else if (
      tag === "div" &&
      node.hasClass("mw-heading") &&
      node.find("h3").length
    ) {
      decade = headingText(node);
    } else if (tag === "ul") {
      collectListItems($, node, decade, entries);
    }

    node = node.next();
  }

  return entries;
}

function readLocalHtml(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

module.exports = {
  headingText,
  isSectionStop,
  decadeFromYear,
  normalizeDecadeLabel,
  entryDecade,
  collectListItems,
  extractBibliography,
  readLocalHtml,
};
