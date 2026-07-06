/* Generated from scripts/lib/viewer-search-fields.js — run npm run bundle-viewer */

const viewerSearchFields = (function () {
  function getPersonNames() {
    if (typeof viewerPersonNames !== "undefined") {
      return viewerPersonNames;
    }
    if (typeof global !== "undefined" && global.__viewerPersonNames) {
      return global.__viewerPersonNames;
    }
    throw new Error("viewerPersonNames is not available");
  }
  
  function getTagHelpers() {
    if (typeof viewerTags !== "undefined") {
      return viewerTags;
    }
    if (typeof global !== "undefined" && global.__viewerTagsForSearchFields) {
      return global.__viewerTagsForSearchFields;
    }
    throw new Error("viewerTags is not available");
  }
  
  function normalizeLabelKey(label) {
    return String(label || "")
      .trim()
      .toLowerCase();
  }
  
  function emptyFieldTerms() {
    return { tag: [], author: [], cover: [], decade: [] };
  }
  
  function emptySearchFilter() {
    return { fieldTerms: emptyFieldTerms(), textTerms: [] };
  }
  
  function formatFieldSearchQuery(prefix, label) {
    const text = String(label || "").trim();
    if (!text) {
      return "";
    }
    if (/\s/.test(text)) {
      return `${prefix}:"${text.replace(/"/g, "")}"`;
    }
    return `${prefix}:${text}`;
  }
  
  function buildFieldTokenRegex(prefix) {
    return new RegExp(`${prefix}:\\s*(?:"([^"]*)"|(\\S+))`, "gi");
  }
  
  function parseDecadeTrailingToken(input) {
    const text = String(input || "").trim();
    const digitMatch = text.match(/(?:^|\s)(\d{1,4}s?)$/i);
    if (!digitMatch) {
      return null;
    }
    return {
      partial: digitMatch[1],
      prefix: text.slice(0, digitMatch.index).trim(),
    };
  }
  
  function isDecadeFilterDraftPartial(partial) {
    const token = String(partial || "").trim();
    if (!token) {
      return false;
    }
    if (/^\d{4}$/.test(token)) {
      return false;
    }
    if (/^\d{4}s$/i.test(token)) {
      return false;
    }
    return /^\d{1,3}s?$/i.test(token);
  }
  
  function parseDecadeDraftInput(input) {
    const text = String(input || "").trim();
    if (!text) {
      return null;
    }
  
    const prefixEsc = "decade".replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const colonMatch = text.match(
      new RegExp(`(?:^|\\s)${prefixEsc}:\\s*(?:"([^"]*)"?|(\\S*))$`, "i"),
    );
    if (colonMatch) {
      const partial = String(colonMatch[1] ?? colonMatch[2] ?? "").trim();
      if (!isDecadeFilterDraftPartial(partial)) {
        return null;
      }
      return {
        fieldKey: "decade",
        partial,
        quoted: /"/.test(colonMatch[0]),
        prefix: text.slice(0, colonMatch.index).trim(),
      };
    }
  
    const token = parseDecadeTrailingToken(text);
    if (!token || !isDecadeFilterDraftPartial(token.partial)) {
      return null;
    }
  
    return {
      fieldKey: "decade",
      partial: token.partial,
      quoted: false,
      prefix: token.prefix,
    };
  }
  
  function getDecadeSuggestDraft(input) {
    const filterDraft = parseDecadeDraftInput(input);
    if (filterDraft) {
      return filterDraft;
    }
  
    const text = String(input || "").trim();
    const prefixEsc = "decade".replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const colonMatch = text.match(
      new RegExp(`(?:^|\\s)${prefixEsc}:\\s*(?:"([^"]*)"?|(\\S*))$`, "i"),
    );
    if (colonMatch) {
      return {
        fieldKey: "decade",
        partial: String(colonMatch[1] ?? colonMatch[2] ?? "").trim(),
        quoted: /"/.test(colonMatch[0]),
        prefix: text.slice(0, colonMatch.index).trim(),
      };
    }
  
    const token = parseDecadeTrailingToken(text);
    if (!token) {
      return null;
    }
  
    return {
      fieldKey: "decade",
      partial: token.partial,
      quoted: false,
      prefix: token.prefix,
    };
  }
  
  function parseFieldDraftInput(input, field) {
    if (field.key === "decade") {
      return parseDecadeDraftInput(input);
    }
  
    const text = String(input || "").trim();
    if (!text) {
      return null;
    }
  
    const prefix = field.prefix;
    const prefixEsc = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  
    const colonMatch = text.match(
      new RegExp(`(?:^|\\s)${prefixEsc}:\\s*(?:"([^"]*)"?|(\\S*))$`, "i"),
    );
    if (colonMatch) {
      return {
        fieldKey: field.key,
        partial: String(colonMatch[1] ?? colonMatch[2] ?? "").trim(),
        quoted: /"/.test(colonMatch[0]),
        prefix: text.slice(0, colonMatch.index).trim(),
      };
    }
  
    const shorthandMatch = text.match(
      new RegExp(
        `(?:^|\\s)${prefixEsc}(?:\\s+(?:"([^"]*)"?|(\\S*)))?$`,
        "i",
      ),
    );
    if (shorthandMatch) {
      return {
        fieldKey: field.key,
        partial: String(shorthandMatch[1] ?? shorthandMatch[2] ?? "").trim(),
        quoted: /"/.test(shorthandMatch[0]),
        prefix: text.slice(0, shorthandMatch.index).trim(),
      };
    }
  
    return null;
  }
  
  function getFieldByKey(key) {
    return SEARCH_FIELD_TYPES.find((field) => field.key === key) || null;
  }
  
  function getFieldByPrefix(prefix) {
    const lower = String(prefix || "").toLowerCase();
    return (
      SEARCH_FIELD_TYPES.find((field) => field.prefix.toLowerCase() === lower) ||
      null
    );
  }
  
  const TAG_FIELD = {
    key: "tag",
    prefix: "tag",
    suppressTextOnLiteralPrefix: true,
    chipAriaPrefix: "tag",
    labelKey(label) {
      return getTagHelpers().tagKey(label);
    },
    formatQuery(label) {
      return formatFieldSearchQuery("tag", label);
    },
    formatLabel(raw, knownValues) {
      const { tagKey, formatTagLabel } = getTagHelpers();
      const needle = tagKey(raw);
      if (!needle) {
        return null;
      }
      for (const label of knownValues || []) {
        if (tagKey(label) === needle) {
          return String(label).trim().toUpperCase();
        }
      }
      return formatTagLabel(raw);
    },
    matchBook(book, term) {
      if (!term) {
        return true;
      }
      const tags = Array.isArray(book.tags) ? book.tags : [];
      return tags.some((tag) => String(tag).toLowerCase().includes(term));
    },
    collectValues(books) {
      return getTagHelpers().collectTagsFromBooks(books);
    },
  };
  
  const AUTHOR_FIELD = {
    key: "author",
    prefix: "author",
    suppressTextOnLiteralPrefix: false,
    chipAriaPrefix: "author",
    labelKey(label) {
      return getPersonNames().normalizePersonKey(label);
    },
    formatQuery(label) {
      return formatFieldSearchQuery("author", label);
    },
    formatLabel(raw, knownValues) {
      const needle = this.labelKey(raw);
      if (!needle) {
        return null;
      }
      for (const label of knownValues || []) {
        if (this.labelKey(label) === needle) {
          return String(label).trim();
        }
      }
      return String(raw || "").trim() || null;
    },
    matchBook(book, term) {
      if (!term) {
        return true;
      }
      const needle = String(term || "").trim().toLowerCase();
      return getPersonNames()
        .resolveBookAuthors(book)
        .some((name) => this.labelKey(name).includes(needle));
    },
    collectValues(books) {
      const seen = new Set();
      const values = [];
      for (const book of books || []) {
        for (const label of getPersonNames().resolveBookAuthors(book)) {
          const key = this.labelKey(label);
          if (!key || seen.has(key)) {
            continue;
          }
          seen.add(key);
          values.push(label);
        }
      }
      return values.sort((a, b) => this.labelKey(a).localeCompare(this.labelKey(b)));
    },
  };
  
  const COVER_FIELD = {
    key: "cover",
    prefix: "cover",
    suppressTextOnLiteralPrefix: false,
    chipAriaPrefix: "cover artist",
    labelKey(label) {
      return getPersonNames().normalizePersonKey(label);
    },
    formatQuery(label) {
      return formatFieldSearchQuery("cover", label);
    },
    formatLabel(raw, knownValues) {
      const needle = this.labelKey(raw);
      if (!needle) {
        return null;
      }
      for (const label of knownValues || []) {
        if (this.labelKey(label) === needle) {
          return String(label).trim();
        }
      }
      return String(raw || "").trim() || null;
    },
    matchBook(book, term) {
      if (!term) {
        return true;
      }
      const needle = String(term || "").trim().toLowerCase();
      return getPersonNames()
        .resolveBookCoverArtists(book)
        .some((name) => this.labelKey(name).includes(needle));
    },
    collectValues(books) {
      const seen = new Set();
      const values = [];
      for (const book of books || []) {
        for (const label of getPersonNames().resolveBookCoverArtists(book)) {
          const key = this.labelKey(label);
          if (!key || seen.has(key)) {
            continue;
          }
          seen.add(key);
          values.push(label);
        }
      }
      return values.sort((a, b) => this.labelKey(a).localeCompare(this.labelKey(b)));
    },
  };
  
  function decadeSortKey(label) {
    const match = String(label || "").trim().match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : 0;
  }
  
  const DECADE_FIELD = {
    key: "decade",
    prefix: "decade",
    suppressTextOnLiteralPrefix: false,
    chipAriaPrefix: "decade",
    labelKey(label) {
      return String(label || "")
        .trim()
        .toLowerCase();
    },
    formatQuery(label) {
      return formatFieldSearchQuery("decade", label);
    },
    formatLabel(raw, knownValues) {
      const needle = this.labelKey(raw);
      if (!needle) {
        return null;
      }
      for (const label of knownValues || []) {
        if (this.labelKey(label) === needle) {
          return String(label).trim();
        }
      }
      return null;
    },
    matchesSuggestion(partial, label) {
      const needle = this.labelKey(partial);
      if (!needle) {
        return true;
      }
      return this.labelKey(label).startsWith(needle);
    },
    matchBook(book, term) {
      if (!term) {
        return true;
      }
      return this.labelKey(book.decade) === term;
    },
    collectValues(books) {
      const seen = new Set();
      const values = [];
      for (const book of books || []) {
        const label = String(book.decade || "").trim();
        if (!label) {
          continue;
        }
        const key = this.labelKey(label);
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        values.push(label);
      }
      return values.sort((a, b) => decadeSortKey(a) - decadeSortKey(b));
    },
  };
  
  const SEARCH_FIELD_TYPES = [TAG_FIELD, AUTHOR_FIELD, COVER_FIELD, DECADE_FIELD];
  
  function getActiveDraftField(draftQuery) {
    const text = String(draftQuery || "").trim();
    if (!text) {
      return null;
    }
  
    let active = null;
    for (const field of SEARCH_FIELD_TYPES) {
      const draft = parseFieldDraftInput(text, field);
      if (draft) {
        active = field;
      }
    }
    return active;
  }
  
  function isFieldLiteralPrefixPending(draftQuery, field) {
    if (!field.suppressTextOnLiteralPrefix) {
      return false;
    }
    const text = String(draftQuery || "").trim();
    if (!text) {
      return false;
    }
    const lower = text.toLowerCase();
    const literal = field.prefix.toLowerCase();
    if (lower.length <= literal.length && literal.startsWith(lower)) {
      return true;
    }
    return false;
  }
  
  function isSearchDraftBlockingText(draftQuery) {
    for (const field of SEARCH_FIELD_TYPES) {
      if (isFieldLiteralPrefixPending(draftQuery, field)) {
        return true;
      }
    }
    return false;
  }
  
  function parseCompoundSearchQuery(query) {
    let remainder = String(query || "");
    const fieldTerms = emptyFieldTerms();
  
    for (const field of SEARCH_FIELD_TYPES) {
      const tokenRe = buildFieldTokenRegex(field.prefix);
      remainder = remainder.replace(tokenRe, (_, quoted, unquoted) => {
        const term = String(quoted ?? unquoted ?? "")
          .trim()
          .toLowerCase();
        if (term) {
          fieldTerms[field.key].push(term);
        }
        return " ";
      });
    }
  
    const textTerms = remainder
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => term.toLowerCase());
  
    return { fieldTerms, textTerms };
  }
  
  function mergeFieldTermsFromChips(chips, parsedFieldTerms) {
    const fieldTerms = emptyFieldTerms();
    const seen = {
      tag: new Set(),
      author: new Set(),
      cover: new Set(),
      decade: new Set(),
    };
  
    for (const chip of chips || []) {
      const field = getFieldByKey(chip?.type);
      if (!field) {
        continue;
      }
      const label = field.formatLabel(chip.label, [chip.label]);
      const term = field.labelKey(label);
      if (!term || seen[field.key].has(term)) {
        continue;
      }
      seen[field.key].add(term);
      fieldTerms[field.key].push(term);
    }
  
    for (const field of SEARCH_FIELD_TYPES) {
      for (const term of parsedFieldTerms[field.key] || []) {
        if (!seen[field.key].has(term)) {
          seen[field.key].add(term);
          fieldTerms[field.key].push(term);
        }
      }
    }
  
    return fieldTerms;
  }
  
  function buildSearchFilter(chips, draftQuery) {
    const trimmed = String(draftQuery || "").trim();
    const activeDraftField = getActiveDraftField(trimmed);
    let parsed;
  
    if (activeDraftField) {
      const draft = parseFieldDraftInput(trimmed, activeDraftField);
      parsed = draft?.prefix
        ? parseCompoundSearchQuery(draft.prefix)
        : emptySearchFilter();
    } else if (isSearchDraftBlockingText(trimmed)) {
      parsed = emptySearchFilter();
    } else {
      parsed = parseCompoundSearchQuery(trimmed);
    }
  
    return {
      fieldTerms: mergeFieldTermsFromChips(chips, parsed.fieldTerms),
      textTerms: parsed.textTerms,
    };
  }
  
  function resolveKnownFieldLabel(term, field, knownValues) {
    const needle = field.labelKey(term);
    if (!needle) {
      return null;
    }
    for (const label of knownValues || []) {
      if (field.labelKey(label) === needle) {
        return field.key === "tag"
          ? String(label).trim().toUpperCase()
          : String(label).trim();
      }
    }
    if (field.key === "decade" || field.key === "author" || field.key === "cover") {
      const matches = (knownValues || []).filter((label) => {
        if (field.matchesSuggestion) {
          return field.matchesSuggestion.call(field, needle, label);
        }
        return field.labelKey(label).includes(needle);
      });
      if (matches.length === 1) {
        return String(matches[0]).trim();
      }
    }
    return null;
  }
  
  function absorbFieldDraftInput(input, field, knownValues) {
    if (field.key === "decade") {
      return null;
    }
  
    const draft = parseFieldDraftInput(input, field);
    if (!draft) {
      return null;
    }
    const prefix = draft.prefix || "";
    if (!draft.partial) {
      return { fieldKey: field.key, chipLabel: null, remainder: prefix };
    }
    const chipLabel = resolveKnownFieldLabel(draft.partial, field, knownValues);
    if (chipLabel) {
      return { fieldKey: field.key, chipLabel, remainder: prefix };
    }
    return {
      fieldKey: field.key,
      chipLabel: null,
      remainder: prefix
        ? `${prefix} ${field.formatQuery(draft.partial)}`
        : field.formatQuery(draft.partial),
    };
  }
  
  function resolveFieldFilterLabel(term, field, knownValues) {
    return resolveKnownFieldLabel(term, field, knownValues);
  }
  
  function filterFieldSuggestions(partial, field, knownValues, options = {}) {
    const { exclude = [], limit } = options;
    const needle = String(partial || "").trim().toLowerCase();
    const excluded = new Set((exclude || []).map((label) => field.labelKey(label)));
  
    const matches = (knownValues || [])
      .filter((label) => !excluded.has(field.labelKey(label)))
      .filter((label) => {
        if (!needle) {
          return true;
        }
        if (field.matchesSuggestion) {
          return field.matchesSuggestion.call(field, needle, label);
        }
        return field.labelKey(label).includes(needle);
      });
  
    return typeof limit === "number" ? matches.slice(0, limit) : matches;
  }
  
  function normalizeSearchFilter(filter) {
    if (!filter) {
      return emptySearchFilter();
    }
    if (filter.fieldTerms) {
      return {
        fieldTerms: {
          tag: [...(filter.fieldTerms.tag || [])],
          author: [...(filter.fieldTerms.author || [])],
          cover: [...(filter.fieldTerms.cover || [])],
          decade: [...(filter.fieldTerms.decade || [])],
        },
        textTerms: [...(filter.textTerms || [])],
      };
    }
    return {
      fieldTerms: {
        tag: [...(filter.tagTerms || [])],
        author: [...(filter.authorTerms || [])],
        cover: [...(filter.coverTerms || [])],
        decade: [...(filter.decadeTerms || [])],
      },
      textTerms: [...(filter.textTerms || [])],
    };
  }
  
  function matchesCompoundSearch(book, filter) {
    const { fieldTerms, textTerms } = normalizeSearchFilter(filter);
  
    for (const field of SEARCH_FIELD_TYPES) {
      for (const term of fieldTerms[field.key] || []) {
        if (!field.matchBook(book, term)) {
          return false;
        }
      }
    }
  
    const haystack = book._searchHaystack || "";
    for (const term of textTerms) {
      if (!haystack.includes(term)) {
        return false;
      }
    }
    return true;
  }
  
  function filterBooksMatchingFieldTerms(books, fieldTermsPartial) {
    const partial = normalizeSearchFilter({
      fieldTerms: fieldTermsPartial,
      textTerms: [],
    });
    return (books || []).filter((book) =>
      matchesCompoundSearch(book, partial),
    );
  }
  
  function chipsToFieldTermsPartial(chips, excludeFieldKey) {
    const partial = emptyFieldTerms();
    for (const chip of chips || []) {
      if (chip.type === excludeFieldKey) {
        continue;
      }
      const field = getFieldByKey(chip.type);
      if (!field) {
        continue;
      }
      const label = field.formatLabel(chip.label, [chip.label]);
      const term = field.labelKey(label);
      if (term) {
        partial[chip.type].push(term);
      }
    }
    return partial;
  }
  
  function serializeCompoundSearchQuery({ fieldTerms = emptyFieldTerms(), textTerms = [] }) {
    const parts = [];
    for (const field of SEARCH_FIELD_TYPES) {
      for (const term of fieldTerms[field.key] || []) {
        parts.push(field.formatQuery(term));
      }
    }
    parts.push(...textTerms);
    return parts.filter(Boolean).join(" ").trim();
  }
  
  function parseSearchQuery(query) {
    const text = String(query || "").trim();
    if (!text) {
      return { mode: "text", term: "" };
    }
  
    for (const field of SEARCH_FIELD_TYPES) {
      const tokenRe = new RegExp(
        `^${field.prefix}:\\s*(?:"([^"]*)"|(.+))$`,
        "i",
      );
      const match = text.match(tokenRe);
      if (match) {
        return {
          mode: field.key,
          term: String(match[1] ?? match[2] ?? "")
            .trim()
            .toLowerCase(),
        };
      }
    }
  
    return { mode: "text", term: text.toLowerCase() };
  }
  return {
    SEARCH_FIELD_TYPES,
    normalizeLabelKey,
    emptyFieldTerms,
    emptySearchFilter,
    getFieldByKey,
    getFieldByPrefix,
    parseDecadeDraftInput,
    getDecadeSuggestDraft,
    parseFieldDraftInput,
    getActiveDraftField,
    isFieldLiteralPrefixPending,
    isSearchDraftBlockingText,
    parseCompoundSearchQuery,
    buildSearchFilter,
    absorbFieldDraftInput,
    resolveKnownFieldLabel,
    resolveFieldFilterLabel,
    filterFieldSuggestions,
    normalizeSearchFilter,
    matchesCompoundSearch,
    filterBooksMatchingFieldTerms,
    chipsToFieldTermsPartial,
    serializeCompoundSearchQuery,
    parseSearchQuery,
    formatFieldSearchQuery,
  };
})();
