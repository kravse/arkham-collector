function normalizeForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''""]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const QUALIFYING_PAREN_RE =
  /inspired by|notes by|fragments by|edited by|\bEd\.?\b|\bvol\.\s*\d/i;

const COVER_ROLE_SUFFIX_RE =
  /,\s*(?:lettering and )?design by\b.*$|,\s*photograph by\b.*$/i;

const COVER_ROLE_PREFIX_RE =
  /^(?:photograph|lettering and design|design)\s+by\s+(.+)$/i;

const COLLECTIVE_AUTHOR_CREDIT_RE =
  /\s*(?:&|\band\b)\s*(divers\s+hands|others)\s*$/i;

const COLLECTIVE_AUTHOR_KEYS = new Set(["divers hands", "others"]);

const GENERATIONAL_SUFFIX_RE = /^(?:jr\.?|sr\.?|ii|iii|iv)$/i;

const PERSON_LIST_SPLIT_RE =
  /\s*,\s*(?!\s*(?:Jr|Sr|II|III|IV)\.?)|\s+and\s+/i;

function stripCollectiveAuthorCredit(text) {
  return String(text || "")
    .replace(COLLECTIVE_AUTHOR_CREDIT_RE, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseAuthorCollectiveSuffix(raw) {
  const text = parseEditedByPrefix(stripQualifyingParentheticals(raw));
  const match = text.match(COLLECTIVE_AUTHOR_CREDIT_RE);
  if (!match) {
    return null;
  }
  const key = normalizePersonKey(match[1]);
  if (key === "divers hands") {
    return "and divers hands";
  }
  if (key === "others") {
    return "and others";
  }
  return null;
}

function normalizePersonKey(name) {
  return normalizeForMatch(name);
}

function stripQualifyingParentheticals(text) {
  let result = String(text || "").trim();
  if (!result) {
    return "";
  }

  result = result.replace(/\s*\(([^)]*)\)/g, (match, inner) => {
    if (QUALIFYING_PAREN_RE.test(inner)) {
      return "";
    }
    return match;
  });

  return result.replace(/\s{2,}/g, " ").trim();
}

function mergeGenerationalSuffixParts(parts) {
  const merged = [];
  for (const part of parts || []) {
    const trimmed = String(part || "").trim();
    if (!trimmed) {
      continue;
    }
    if (merged.length && GENERATIONAL_SUFFIX_RE.test(trimmed)) {
      merged[merged.length - 1] = `${merged[merged.length - 1]}, ${trimmed}`;
      continue;
    }
    merged.push(trimmed);
  }
  return merged;
}

function splitPersonList(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    return [];
  }

  return mergeGenerationalSuffixParts(
    raw
      .split(PERSON_LIST_SPLIT_RE)
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

function dedupePersonNames(names) {
  const seen = new Set();
  const result = [];
  for (const name of names || []) {
    const trimmed = String(name || "").trim();
    if (!trimmed) {
      continue;
    }
    const key = normalizePersonKey(trimmed);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function parseEditedByPrefix(text) {
  const trimmed = String(text || "").trim();
  const editedMatch = trimmed.match(/^edited by\s+(.+)$/i);
  if (editedMatch) {
    return editedMatch[1].trim();
  }
  return trimmed;
}

function parseAuthorNames(raw) {
  const text = stripCollectiveAuthorCredit(
    parseEditedByPrefix(stripQualifyingParentheticals(raw)),
  );
  if (!text) {
    return [];
  }
  return dedupePersonNames(
    splitPersonList(text).filter(
      (name) => !COLLECTIVE_AUTHOR_KEYS.has(normalizePersonKey(name)),
    ),
  );
}

function stripCoverRoleSuffix(text) {
  return String(text || "")
    .trim()
    .replace(COVER_ROLE_SUFFIX_RE, "")
    .trim();
}

function parseCoverArtistNames(raw) {
  let text = stripCoverRoleSuffix(String(raw || "").trim());
  if (!text) {
    return [];
  }

  const roleMatch = text.match(COVER_ROLE_PREFIX_RE);
  if (roleMatch) {
    text = roleMatch[1].trim();
  }

  return dedupePersonNames(splitPersonList(text));
}

function getDisplayAuthorRaw(book) {
  if (book?.author) {
    return String(book.author).trim();
  }

  const line = String(book?.listAuthor || "").trim();
  if (!line) {
    return "";
  }

  const withoutYear = line.replace(/\s*\(\d{4}\)\s*$/, "").trim();
  const editedMatch = withoutYear.match(/edited by\s+(.+)$/i);
  if (editedMatch) {
    return editedMatch[1].trim();
  }

  const byMatch = withoutYear.match(/(?:^|,\s*)by\s+(.+)$/i);
  if (byMatch) {
    return byMatch[1].split(/\s+vol\.\s+/i)[0].trim() || "";
  }

  return "";
}

function resolveOverrideNames(value) {
  if (!Array.isArray(value)) {
    return null;
  }
  const names = value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
  return names.length ? dedupePersonNames(names) : null;
}

function resolveBookAuthors(book) {
  const override = resolveOverrideNames(book?.authors);
  if (override) {
    return override;
  }
  const raw = getDisplayAuthorRaw(book);
  return parseAuthorNames(raw);
}

function resolveBookAuthorCollectiveSuffix(book) {
  if (resolveOverrideNames(book?.authors)) {
    return null;
  }
  return parseAuthorCollectiveSuffix(getDisplayAuthorRaw(book));
}

function resolveBookCoverArtists(book) {
  const override = resolveOverrideNames(book?.coverArtists);
  if (override) {
    return override;
  }
  return parseCoverArtistNames(book?.coverArtist);
}

function formatPersonList(names) {
  return (names || []).join(", ");
}

function formatAuthorDisplay(names, collectiveSuffix) {
  const base = formatPersonList(names);
  if (!base) {
    return collectiveSuffix || "";
  }
  return collectiveSuffix ? `${base} ${collectiveSuffix}` : base;
}

module.exports = {
  normalizePersonKey,
  stripQualifyingParentheticals,
  splitPersonList,
  parseAuthorNames,
  parseAuthorCollectiveSuffix,
  parseCoverArtistNames,
  getDisplayAuthorRaw,
  resolveBookAuthors,
  resolveBookAuthorCollectiveSuffix,
  resolveBookCoverArtists,
  formatPersonList,
  formatAuthorDisplay,
};
