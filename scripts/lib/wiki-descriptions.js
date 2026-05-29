const cheerio = require("cheerio");
const { normalizeLabel } = require("./text");

function cleanParagraphText($, paragraph) {
  const clone = paragraph.clone();
  clone.find(".reference, .mw-editsection, sup").remove();
  return normalizeLabel(clone.text());
}

function isSectionBoundary($, element) {
  const tag = element.prop("tagName")?.toLowerCase();
  if (tag === "h2" || tag === "h3") {
    return true;
  }
  if (tag === "div" && element.hasClass("mw-heading")) {
    return true;
  }
  return false;
}

function collectParagraphsFromSiblings($, startNode, stopAtSameLevelHeadings = true) {
  const paragraphs = [];
  let node = startNode.next();
  while (node.length) {
    if (stopAtSameLevelHeadings && isSectionBoundary($, node)) {
      break;
    }
    if (node.prop("tagName")?.toLowerCase() === "p") {
      const text = cleanParagraphText($, node);
      if (text) {
        paragraphs.push(text);
      }
    }
    node = node.next();
  }
  return paragraphs;
}

function extractSectionAfterHeading($, root, fragmentId) {
  const normalizedId = fragmentId.replace(/ /g, "_");
  const heading = root
    .find(`[id="${normalizedId}"], [id="${fragmentId}"]`)
    .first();
  if (!heading.length) {
    return null;
  }

  const headingEl = heading.closest("h2, h3, .mw-heading").first();
  const startNode = headingEl.length ? headingEl : heading;
  const paragraphs = collectParagraphsFromSiblings($, startNode, true);
  return paragraphs.length ? paragraphs.join("\n\n") : null;
}

function extractLeadFromRoot($, root) {
  const paragraphs = [];
  for (const el of root.children().toArray()) {
    const $el = $(el);
    if (isSectionBoundary($, $el)) {
      break;
    }
    if ($el.prop("tagName")?.toLowerCase() === "p") {
      const text = cleanParagraphText($, $el);
      if (text) {
        paragraphs.push(text);
      }
    }
  }
  return paragraphs.length ? paragraphs.join("\n\n") : null;
}

function extractLeadDescription(html, options = {}) {
  const { fragmentId = null } = options;
  const $ = cheerio.load(html);
  const root = $(".mw-parser-output").first();
  if (!root.length) {
    return null;
  }

  if (fragmentId) {
    const sectionText = extractSectionAfterHeading($, root, fragmentId);
    if (sectionText) {
      return sectionText;
    }
  }

  return extractLeadFromRoot($, root);
}

module.exports = {
  cleanParagraphText,
  isSectionBoundary,
  collectParagraphsFromSiblings,
  extractSectionAfterHeading,
  extractLeadFromRoot,
  extractLeadDescription,
};
