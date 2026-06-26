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
  return {
    findRowAtPoint,
  };
})();
