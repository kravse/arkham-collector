function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeLabel(text) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cellText($, cell) {
  return normalizeLabel($(cell).text());
}

function parseYearFromListLine(text) {
  const matches = [...text.matchAll(/\((\d{4})\)/g)];
  if (matches.length === 0) {
    return null;
  }
  return matches[matches.length - 1][1];
}

function parseAuthorFromListLine(listAuthor) {
  if (!listAuthor) {
    return null;
  }

  let line = normalizeLabel(listAuthor).replace(/\s*\(\d{4}\)\s*$/, "").trim();
  const editedMatch = line.match(/edited by\s+(.+)$/i);
  if (editedMatch) {
    return normalizeLabel(editedMatch[1]);
  }

  const byMatch = line.match(/(?:^|,\s*)by\s+(.+)$/i);
  if (byMatch) {
    return normalizeLabel(byMatch[1].split(/\s+vol\.\s+/i)[0]) || null;
  }

  return null;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''""]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titlesMatch(a, b) {
  const left = normalizeForMatch(a);
  const right = normalizeForMatch(b);
  if (!left || !right) {
    return false;
  }
  return left === right || left.includes(right) || right.includes(left);
}

function formatEta(processed, total, startedAt) {
  if (processed === 0) {
    return "?";
  }
  const elapsed = Date.now() - startedAt;
  const perItem = elapsed / processed;
  const remaining = Math.max(0, total - processed);
  const seconds = Math.ceil((remaining * perItem) / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  return `${Math.ceil(seconds / 60)} min`;
}

function parseYear(value) {
  if (!value) {
    return null;
  }
  const match = String(value).match(/\d{4}/);
  return match ? match[0] : null;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

module.exports = {
  sleep,
  normalizeLabel,
  cellText,
  parseYearFromListLine,
  parseAuthorFromListLine,
  slugify,
  normalizeForMatch,
  titlesMatch,
  formatEta,
  parseYear,
  parseCsvLine,
};
