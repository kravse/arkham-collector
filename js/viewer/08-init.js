/* Event listeners and application startup */

const RANDOM_CARD_LOGO_TAP_MS = 1200;
const RANDOM_CARD_LOGO_TAP_COUNT = 3;
let randomCardLogoTapTimes = [];

window.addEventListener("popstate", handleDetailPopState);

grid.addEventListener("click", (event) => {
  const editButton = event.target.closest(".edit-book-btn");
  if (editButton) {
    event.preventDefault();
    event.stopPropagation();
    openEditDialog(Number(editButton.dataset.bookId));
    return;
  }

  const hideButton = event.target.closest(".hide-book-btn");
  if (hideButton) {
    event.preventDefault();
    event.stopPropagation();
    const bookId = Number(hideButton.dataset.bookId);
    const isHidden = hideButton.dataset.hidden === "true";
    setBookHidden(bookId, !isHidden);
    return;
  }

  if (
    event.target.closest(".book-detail-wiki-btn") ||
    event.target.closest(".book-detail-goodreads-btn")
  ) {
    return;
  }

  const card = event.target.closest(".card");
  if (card) {
    openBookDetail(Number(card.dataset.bookId));
  }
});

bookDetailCloseBtn.addEventListener("click", closeBookDetail);
bookDetailCover.addEventListener("click", handleCoverZoomTrigger);
bookDetailPrevBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  navigateDetail(-1);
});
bookDetailNextBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  navigateDetail(1);
});
bookDetailDialog.addEventListener("click", (event) => {
  const editButton = event.target.closest(".book-detail-edit-btn");
  if (editButton) {
    event.preventDefault();
    event.stopPropagation();
    openEditDialog(Number(editButton.dataset.bookId));
    return;
  }

  const collectionButton = event.target.closest(".collection-btn");
  if (collectionButton) {
    event.preventDefault();
    event.stopPropagation();
    toggleCollection(Number(collectionButton.dataset.bookId));
    return;
  }

  const wantButton = event.target.closest(".want-btn");
  if (!wantButton || wantButton.classList.contains("want-badge")) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  toggleWant(Number(wantButton.dataset.bookId));
});
bookDetailDialog
  .querySelectorAll("[data-close-detail]")
  .forEach((element) => {
    element.addEventListener("click", closeBookDetail);
  });

editBookForm.addEventListener("submit", saveBookEdits);
bindEditFieldSanitizers(editBookForm);
initListCoverPicker();
ensureListCoverPreviewObserver();
editDeleteBtn.addEventListener("click", deleteBook);
editCancelBtn.addEventListener("click", closeEditDialog);
editDialog.querySelectorAll("[data-close-edit]").forEach((element) => {
  element.addEventListener("click", closeEditDialog);
});

settingsBtn.addEventListener("click", () => {
  if (settingsDialog.hidden) {
    openSettingsDialog();
  } else {
    closeSettingsDialog();
  }
});

settingsCloseBtn.addEventListener("click", closeSettingsDialog);
settingsDialog.querySelectorAll("[data-close-settings]").forEach((element) => {
  element.addEventListener("click", closeSettingsDialog);
});

settingsTabAbout.addEventListener("click", () => {
  selectSettingsTab("about");
});

settingsTabSettings.addEventListener("click", () => {
  selectSettingsTab("settings");
});

editTabDetails.addEventListener("click", () => {
  selectEditDialogTab("details");
});

editTabListCrop.addEventListener("click", () => {
  selectEditDialogTab("list-crop");
});

if (coverLightbox) {
  coverLightbox.addEventListener("click", (event) => {
    if (event.target.closest(".cover-lightbox-img")) {
      if (isMobileCoverLightboxViewport()) {
        closeCoverLightbox();
      }
      return;
    }
    closeCoverLightbox();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  if (coverLightbox && !coverLightbox.hidden) {
    event.preventDefault();
    closeCoverLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (coverLightbox && !coverLightbox.hidden) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateCoverLightbox(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateCoverLightbox(1);
      return;
    }
  }
});

if (storageModeLocalInput) {
  storageModeLocalInput.addEventListener("change", () => {
    if (storageModeLocalInput.checked) {
      onStorageModeChange("local");
    }
  });
}

if (storageModeGistInput) {
  storageModeGistInput.addEventListener("change", () => {
    if (storageModeGistInput.checked) {
      onGistSetupSelected();
    }
  });
}

if (gistConnectBtn) {
  gistConnectBtn.addEventListener("click", () => {
    onGistConnectClick();
  });
}

if (gistClearBtn) {
  gistClearBtn.addEventListener("click", () => {
    onGistClearClick();
  });
}

if (exportCollectionBtn) {
  exportCollectionBtn.addEventListener("click", () => {
    exportCollectionCsv();
  });
}

if (importCollectionBtn && importCollectionInput) {
  importCollectionBtn.addEventListener("click", () => {
    importCollectionInput.click();
  });
  importCollectionInput.addEventListener("change", () => {
    onImportCollectionFileSelected(importCollectionInput);
  });
}

if (highlightWantsInput) {
  highlightWantsInput.addEventListener("change", () => {
    highlightWants = highlightWantsInput.checked;
    saveUserState();
    render();
  });
}

if (highlightCollectionInput) {
  highlightCollectionInput.addEventListener("change", () => {
    highlightCollection = highlightCollectionInput.checked;
    saveUserState();
    render();
  });
}

if (showMagazinesInput) {
  showMagazinesInput.addEventListener("change", () => {
    showMagazines = showMagazinesInput.checked;
    saveUserState();
    render();
  });
}

if (bookOrderBtn) {
  bookOrderBtn.addEventListener("click", () => {
    if (bookOrderDialog.hidden) {
      openBookOrderDialog();
    } else {
      closeBookOrderDialog();
    }
  });
}

if (bookOrderCloseBtn) {
  bookOrderCloseBtn.addEventListener("click", closeBookOrderDialog);
}

if (bookOrderCancelBtn) {
  bookOrderCancelBtn.addEventListener("click", closeBookOrderDialog);
}

if (bookOrderSaveBtn) {
  bookOrderSaveBtn.addEventListener("click", () => {
    saveBookOrderDialog();
  });
}

if (bookOrderDialog) {
  bookOrderDialog.querySelectorAll("[data-close-book-order]").forEach((element) => {
    element.addEventListener("click", closeBookOrderDialog);
  });
}

if (bookOrderList) {
  bookOrderList.addEventListener("click", onBookOrderListClick);
  bookOrderList.addEventListener("dragstart", onBookOrderDragStart);
  bookOrderList.addEventListener("dragover", onBookOrderDragOver);
  bookOrderList.addEventListener("dragleave", onBookOrderDragLeave);
  bookOrderList.addEventListener("drop", onBookOrderDrop);
  bookOrderList.addEventListener("dragend", onBookOrderDragEnd);
}

attributionBtn.addEventListener("click", () => {
  if (attributionDialog.hidden) {
    openAttributionDialog();
  } else {
    closeAttributionDialog();
  }
});

attributionCloseBtn.addEventListener("click", closeAttributionDialog);
attributionDialog.querySelectorAll("[data-close-attribution]").forEach((element) => {
  element.addEventListener("click", closeAttributionDialog);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !editDialog.hidden) {
    closeEditDialog();
    return;
  }
  if (event.key === "Escape" && !bookDetailDialog.hidden) {
    closeBookDetail();
    return;
  }
  if (
    !bookDetailDialog.hidden &&
    editDialog.hidden &&
    (!coverLightbox || coverLightbox.hidden)
  ) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateDetail(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateDetail(1);
      return;
    }
  }
  if (event.key === "Escape" && !settingsDialog.hidden) {
    closeSettingsDialog();
    return;
  }
  if (event.key === "Escape" && bookOrderDialog && !bookOrderDialog.hidden) {
    closeBookOrderDialog();
    return;
  }
  if (event.key === "Escape" && !attributionDialog.hidden) {
    closeAttributionDialog();
  }
});

function updateSearchClearVisibility() {
  searchClearBtn.hidden = !searchInput.value;
}

let searchRenderTimer = null;

function renderNow() {
  if (searchRenderTimer) {
    clearTimeout(searchRenderTimer);
    searchRenderTimer = null;
  }
  render();
}

function debouncedRender() {
  if (searchRenderTimer) {
    clearTimeout(searchRenderTimer);
  }
  searchRenderTimer = setTimeout(() => {
    searchRenderTimer = null;
    render();
  }, 200);
}

function onSearchInput() {
  updateSearchClearVisibility();
  debouncedRender();
}

function onSearchCommit() {
  updateSearchClearVisibility();
  renderNow();
}

searchClearBtn.addEventListener("click", () => {
  searchInput.value = "";
  searchInput.focus();
  onSearchCommit();
});

searchInput.addEventListener("input", onSearchInput);
searchInput.addEventListener("search", onSearchCommit);
searchInput.addEventListener("change", onSearchCommit);
sortSelect.addEventListener("change", onSortChange);
showHiddenInput.addEventListener("change", () => {
  refreshBookOrderDialogIfOpen();
  render();
});

syncSettingsStorageMode();
updateSortControlVisibility();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    pullGistStateIfConfigured();
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    pullGistStateIfConfigured();
  }
});

if (headerFiltersToggle) {
  headerFiltersToggle.addEventListener("click", () => {
    headerFiltersExpanded = !headerFiltersExpanded;
    saveUserState();
    updateHeaderFiltersState();
  });
}

if (viewModeToggle) {
  viewModeToggle.addEventListener("click", () => {
    gridViewMode = gridViewMode === "list" ? "cards" : "list";
    saveUserState();
    updateViewModeState();
    render();
  });
}

stats.addEventListener("click", (event) => {
  if (event.target.closest("#collection-filter-toggle")) {
    cycleCollectionFilter();
    wantOnly = false;
    render();
    return;
  }
  if (event.target.closest("#hidden-filter-toggle")) {
    hiddenOnly = !hiddenOnly;
    render();
    return;
  }
  if (event.target.closest("#mycroft-filter-toggle")) {
    cycleMycroftFilter();
    render();
    return;
  }
  if (event.target.closest("#want-filter-toggle")) {
    const next = !wantOnly;
    wantOnly = next;
    if (next) {
      collectionFilterMode = null;
    }
    render();
    return;
  }
});

if (headerLogo) {
  headerLogo.addEventListener("click", () => {
    const now = Date.now();
    randomCardLogoTapTimes = randomCardLogoTapTimes.filter(
      (time) => now - time < RANDOM_CARD_LOGO_TAP_MS,
    );
    randomCardLogoTapTimes.push(now);
    if (randomCardLogoTapTimes.length >= RANDOM_CARD_LOGO_TAP_COUNT) {
      randomCardLogoTapTimes = [];
      openRandomVisibleBook();
    }
  });
}

function startViewer() {
  loadUserStateAsync().then(() => {
    render();
    openBookDetailFromLocation();
  });
}

if (readOnly) {
  startViewer();
} else {
  checkServeSupport().then(() => {
    startViewer();
  });
}

})();
