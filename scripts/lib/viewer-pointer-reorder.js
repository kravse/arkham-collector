/**
 * Pointer/touch list reorder helpers (HTML5 drag does not work on touch).
 */
function findRowAtPoint(options) {
  const {
    root,
    clientX,
    clientY,
    rowSelector,
    excludeRow,
    elementsFromPoint,
  } = options;

  if (!root || !rowSelector || typeof elementsFromPoint !== "function") {
    return null;
  }

  const elements = elementsFromPoint(clientX, clientY);
  if (!Array.isArray(elements)) {
    return null;
  }

  for (const element of elements) {
    if (!element || typeof element.closest !== "function") {
      continue;
    }
    const row = element.closest(rowSelector);
    if (row && row !== excludeRow && root.contains(row)) {
      return row;
    }
  }

  return null;
}

function findNearestRowAtPoint(options) {
  const {
    root,
    clientX,
    clientY,
    rowSelector,
    excludeRow,
    elementsFromPoint,
    gapSlop = 12,
    getRowRect,
  } = options;

  const direct = findRowAtPoint({
    root,
    clientX,
    clientY,
    rowSelector,
    excludeRow,
    elementsFromPoint,
  });
  if (direct) {
    return direct;
  }

  if (!root || !rowSelector || typeof root.querySelectorAll !== "function") {
    return null;
  }

  const rows = root.querySelectorAll(rowSelector);
  let best = null;
  let bestDist = Infinity;

  for (const row of rows) {
    if (row === excludeRow || !root.contains(row)) {
      continue;
    }

    const rect =
      typeof getRowRect === "function"
        ? getRowRect(row)
        : typeof row.getBoundingClientRect === "function"
          ? row.getBoundingClientRect()
          : null;
    if (!rect) {
      continue;
    }

    if (clientX < rect.left || clientX > rect.right) {
      continue;
    }

    const expandedTop = rect.top - gapSlop;
    const expandedBottom = rect.bottom + gapSlop;
    if (clientY < expandedTop || clientY > expandedBottom) {
      continue;
    }

    const centerY = rect.top + rect.height / 2;
    const dist = Math.abs(clientY - centerY);
    if (dist < bestDist) {
      bestDist = dist;
      best = row;
    }
  }

  return best;
}

function findNearestGridItemAtPoint(options) {
  const {
    root,
    clientX,
    clientY,
    itemSelector,
    excludeItem,
    elementsFromPoint,
    gapSlop = 12,
    getItemRect,
  } = options;

  const direct = findRowAtPoint({
    root,
    clientX,
    clientY,
    rowSelector: itemSelector,
    excludeRow: excludeItem,
    elementsFromPoint,
  });
  if (direct) {
    return direct;
  }

  if (!root || !itemSelector || typeof root.querySelectorAll !== "function") {
    return null;
  }

  const items = root.querySelectorAll(itemSelector);
  let best = null;
  let bestDist = Infinity;
  let bestReading = Infinity;

  for (const item of items) {
    if (item === excludeItem || !root.contains(item)) {
      continue;
    }

    const rect =
      typeof getItemRect === "function"
        ? getItemRect(item)
        : typeof item.getBoundingClientRect === "function"
          ? item.getBoundingClientRect()
          : null;
    if (!rect) {
      continue;
    }

    const expandedLeft = rect.left - gapSlop;
    const expandedRight = rect.right + gapSlop;
    const expandedTop = rect.top - gapSlop;
    const expandedBottom = rect.bottom + gapSlop;
    if (
      clientX < expandedLeft ||
      clientX > expandedRight ||
      clientY < expandedTop ||
      clientY > expandedBottom
    ) {
      continue;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dist = Math.hypot(clientX - centerX, clientY - centerY);
    const reading = rect.top * 10000 + rect.left;
    if (
      dist < bestDist - 0.5 ||
      (Math.abs(dist - bestDist) <= 0.5 && reading < bestReading)
    ) {
      bestDist = dist;
      bestReading = reading;
      best = item;
    }
  }

  return best;
}

function findClosestGridItemAtPoint(options) {
  const {
    root,
    clientX,
    clientY,
    itemSelector,
    excludeItem,
    getItemRect,
    maxDistance = Infinity,
  } = options;

  if (!root || !itemSelector || typeof root.querySelectorAll !== "function") {
    return null;
  }

  const items = root.querySelectorAll(itemSelector);
  let best = null;
  let bestDist = Infinity;
  let bestReading = Infinity;

  for (const item of items) {
    if (item === excludeItem || !root.contains(item)) {
      continue;
    }

    const rect =
      typeof getItemRect === "function"
        ? getItemRect(item)
        : typeof item.getBoundingClientRect === "function"
          ? item.getBoundingClientRect()
          : null;
    if (!rect) {
      continue;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dist = Math.hypot(clientX - centerX, clientY - centerY);
    if (dist > maxDistance) {
      continue;
    }

    const reading = rect.top * 10000 + rect.left;
    if (
      dist < bestDist - 0.5 ||
      (Math.abs(dist - bestDist) <= 0.5 && reading < bestReading)
    ) {
      bestDist = dist;
      bestReading = reading;
      best = item;
    }
  }

  return best;
}

module.exports = {
  findRowAtPoint,
  findNearestRowAtPoint,
  findNearestGridItemAtPoint,
  findClosestGridItemAtPoint,
};
