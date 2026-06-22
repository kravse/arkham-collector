const MAX_DISTINCT_HUES = 18;

function tagKey(tag) {
  return String(tag || "")
    .trim()
    .toLowerCase();
}

function hashTagKey(key) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hueDistance(a, b) {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
}

function uniqueSortedTags(tagLabels) {
  const seen = new Set();
  const tags = [];
  for (const raw of tagLabels || []) {
    const label = String(raw || "").trim();
    if (!label) {
      continue;
    }
    const key = tagKey(label);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    tags.push(label);
  }
  return tags.sort((a, b) => tagKey(a).localeCompare(tagKey(b)));
}

function evenlySpacedHues(count) {
  const slots = Math.max(count, 1);
  return Array.from({ length: slots }, (_, index) => (index * 360) / slots);
}

function colorsForHue(hue, band) {
  const saturation = [52, 78, 56, 82][band % 4];
  const textLightness = [84, 74, 80, 72][band % 4];
  const bgLightness = [32, 42, 36, 44][band % 4];
  const bgAlpha = [0.26, 0.34, 0.28, 0.36][band % 4];

  return {
    bg: `hsla(${hue}, ${saturation}%, ${bgLightness}%, ${bgAlpha})`,
    border: `hsla(${hue}, ${Math.min(saturation + 10, 90)}%, 58%, 0.58)`,
    text: `hsla(${hue}, ${Math.min(saturation + 14, 92)}%, ${textLightness}%, 0.96)`,
  };
}

function buildTagColorMap(tagLabels) {
  const tags = uniqueSortedTags(tagLabels);
  const map = new Map();
  if (!tags.length) {
    return map;
  }

  const hueCount = Math.min(tags.length, MAX_DISTINCT_HUES);
  const hueSlots = evenlySpacedHues(hueCount);

  tags.forEach((tag, index) => {
    const hueIndex = index % hueCount;
    const band = Math.floor(index / hueCount) % 4;
    map.set(tagKey(tag), colorsForHue(hueSlots[hueIndex], band));
  });

  return map;
}

function fallbackTagColors(tag) {
  const key = tagKey(tag);
  const hue = (hashTagKey(key) * 137.508) % 360;
  return colorsForHue(hue, hashTagKey(key) % 4);
}

function createTagColorRegistry(tagLabels) {
  let colorMap = buildTagColorMap(tagLabels);

  function rebuild(nextTagLabels) {
    colorMap = buildTagColorMap(nextTagLabels);
  }

  function getTagColors(tag) {
    return colorMap.get(tagKey(tag)) || fallbackTagColors(tag);
  }

  function tagChipStyleAttr(tag) {
    const colors = getTagColors(tag);
    return `style="--tag-bg: ${colors.bg}; --tag-border: ${colors.border}; --tag-text: ${colors.text};"`;
  }

  function minHueSeparation() {
    const hues = [...colorMap.values()]
      .map((colors) => {
        const match = colors.bg.match(/hsla\(([\d.]+),/);
        return match ? Number(match[1]) : null;
      })
      .filter((hue) => hue != null);

    if (hues.length < 2) {
      return 360;
    }

    let minSeparation = 360;
    for (let i = 0; i < hues.length; i += 1) {
      for (let j = i + 1; j < hues.length; j += 1) {
        minSeparation = Math.min(minSeparation, hueDistance(hues[i], hues[j]));
      }
    }
    return minSeparation;
  }

  return {
    rebuild,
    getTagColors,
    tagChipStyleAttr,
    minHueSeparation,
  };
}

module.exports = {
  tagKey,
  hashTagKey,
  hueDistance,
  uniqueSortedTags,
  buildTagColorMap,
  createTagColorRegistry,
  MAX_DISTINCT_HUES,
};
