function normalizeWantIdList(raw) {
  if (raw == null || raw === "") {
    return [];
  }
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const ids = [];
    const seen = new Set();
    for (const entry of parsed) {
      if (entry == null || entry === "") {
        continue;
      }
      const id = Number(entry);
      if (!Number.isFinite(id) || !Number.isInteger(id) || seen.has(id)) {
        continue;
      }
      seen.add(id);
      ids.push(id);
    }
    return ids;
  } catch (_) {
    return [];
  }
}

function normalizeWantMembership(raw) {
  if (Array.isArray(raw)) {
    return normalizeWantIdList(raw);
  }
  if (raw && typeof raw === "object" && Array.isArray(raw.wantIds)) {
    return normalizeWantIdList(raw.wantIds);
  }
  return normalizeWantIdList(raw);
}

function normalizeWantOrderIds(raw, wantIds) {
  const membership = normalizeWantMembership(wantIds);
  const membershipSet = new Set(membership);
  const ordered = [];
  const seen = new Set();

  for (const id of normalizeWantIdList(raw)) {
    if (!membershipSet.has(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ordered.push(id);
  }

  for (const id of membership) {
    if (!seen.has(id)) {
      ordered.push(id);
    }
  }

  return ordered;
}

module.exports = {
  normalizeWantIdList,
  normalizeWantMembership,
  normalizeWantOrderIds,
};
