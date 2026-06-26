/* Generated from scripts/lib/viewer-pointer-reorder.js — run npm run bundle-viewer */

const viewerPointerReorder = (function () {
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
  return {
    findRowAtPoint,
    findNearestRowAtPoint,
  };
})();
